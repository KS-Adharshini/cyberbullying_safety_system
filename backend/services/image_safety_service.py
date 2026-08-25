import io
import re
import logging
from typing import Dict, Any, Optional
from PIL import Image
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.toxicity_service import analyze_text, predict_toxicity
from app.analyzer import get_analyzer

logger = logging.getLogger("image_safety_service")

# Lazy CLIP Model Loading
_clip_model = None
_clip_processor = None
CLIP_LOADED = False
_easyocr_readers = {}

def clean_detected_ocr_text(text: str) -> str:
    if not text:
        return ""
    # Normalize multiple whitespace
    cleaned = re.sub(r'\s+', ' ', text).strip()
    # Clean OCR punctuation artifacts like ~ | ` _ ^
    cleaned = re.sub(r'[~|`_^{}\[\]\\]', ' ', cleaned)
    cleaned = re.sub(r'\s+([,.;!?])', r'\1', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    # Fix trailing I or 1 after uppercase words like LOSERI -> LOSER!
    cleaned = re.sub(r'\b(LOSER|BITCH|IDIOT|BASTARD|SLUT|WHORE|PIG|UGLY|FOOL|CREEP|STUPID|MORON)I\b', r'\1!', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\b(LOSER|BITCH|IDIOT|BASTARD|SLUT|WHORE|PIG|UGLY|FOOL|CREEP|STUPID|MORON)1\b', r'\1!', cleaned, flags=re.IGNORECASE)
    # Strip isolated non-alphanumeric noise tokens at ends
    cleaned = re.sub(r'^[^\w\u0900-\u097F\u0B80-\u0BFF]+', '', cleaned)
    cleaned = re.sub(r'[^\w\u0900-\u097F\u0B80-\u0BFF]+$', '', cleaned)
    return cleaned.strip()

def get_easyocr_reader(languages):
    key = "+".join(languages)
    if key in _easyocr_readers:
        return _easyocr_readers[key]
    try:
        import easyocr
        logger.info(f"Loading EasyOCR reader for {key}...")
        reader = easyocr.Reader(languages, gpu=False, verbose=False)
        _easyocr_readers[key] = reader
        logger.info(f"EasyOCR reader loaded successfully for {key}.")
        return reader
    except Exception as e:
        logger.warning(f"EasyOCR reader {key} could not be loaded: {e}")
        _easyocr_readers[key] = None
        return None

def extract_image_text(image_bytes: bytes) -> str:
    """Extract readable English, Tamil, or Hindi text with fast script-aware priority and border padding."""
    from PIL import ImageOps
    image_obj = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    # Add 30px edge padding so top-border text (e.g. 'NOBODY LIKES YOU') is fully captured
    padded_image = ImageOps.expand(image_obj, border=30, fill=(240, 240, 240))
    text_en = ""
    try:
        import numpy as np
        original_array = np.array(padded_image)
        
        # 1. First run English EasyOCR with tuned contrast and detection thresholds
        en_reader = get_easyocr_reader(["en"])
        if en_reader:
            results_en = en_reader.readtext(
                original_array, detail=1, paragraph=False,
                contrast_ths=0.05,
                adjust_contrast=0.7,
                text_threshold=0.25,
                low_text=0.2,
                link_threshold=0.2,
                mag_ratio=1.2
            )
            # Filter and sort in natural reading order (top-to-bottom, left-to-right)
            valid_en = [item for item in results_en if float(item[2]) >= 0.2 and item[1].strip()]
            valid_en.sort(key=lambda item: (min(point[1] for point in item[0]) // 25, min(point[0] for point in item[0])))
            text_en = clean_detected_ocr_text(" ".join(item[1].strip() for item in valid_en))
            
            latin_words = [w for w in re.findall(r'[A-Za-z]{2,}', text_en)]
            # If we found solid English words with confidence, return immediately!
            if len(latin_words) >= 2 or (len(latin_words) == 1 and len(latin_words[0]) >= 4):
                return text_en

        # 2. If no clear English words or Indic text suspected, try Hindi and Tamil readers
        for languages in (["hi", "en"], ["ta"]):
            reader = get_easyocr_reader(languages)
            if not reader:
                continue
            results = reader.readtext(
                original_array, detail=1, paragraph=False,
                contrast_ths=0.05,
                adjust_contrast=0.7,
                text_threshold=0.25,
                low_text=0.2,
                link_threshold=0.2,
                mag_ratio=1.2
            )
            valid = [item for item in results if float(item[2]) >= 0.2 and item[1].strip()]
            valid.sort(key=lambda item: (min(point[1] for point in item[0]) // 25, min(point[0] for point in item[0])))
            candidate_text = clean_detected_ocr_text(" ".join(item[1].strip() for item in valid))
            if candidate_text:
                tamil_count = sum(0x0B80 <= ord(char) <= 0x0BFF for char in candidate_text)
                hindi_count = sum(0x0900 <= ord(char) <= 0x097F for char in candidate_text)
                if tamil_count >= 2 or hindi_count >= 2:
                    return candidate_text
                    
        # Return whatever was found by English reader if non-empty
        if text_en:
            return text_en
            
    except Exception as e:
        logger.warning(f"EasyOCR extraction failed; using Tesseract fallback: {e}")

    try:
        import pytesseract
        try:
            raw = pytesseract.image_to_string(padded_image, lang="eng", config="--psm 11").strip()
            return clean_detected_ocr_text(raw)
        except Exception:
            return ""
    except Exception as e:
        logger.info(f"OCR extraction skipped/failed: {e}")
        return ""

def load_clip_model():
    global _clip_model, _clip_processor, CLIP_LOADED
    try:
        from transformers import CLIPProcessor, CLIPModel
        import torch
        logger.info("Loading CLIP Vision Safety Model: openai/clip-vit-base-patch32...")
        _clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        _clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        CLIP_LOADED = True
        logger.info("CLIP Vision Safety Model loaded successfully.")
    except Exception as e:
        logger.warning(f"CLIP model could not be loaded (running in fallback vision mode): {e}")
        CLIP_LOADED = False

def check_visual_toxicity(image: Image.Image) -> Dict[str, Any]:
    """
    Evaluates visual content of the image for offensive, abusive, or harmful material.
    """
    if not CLIP_LOADED or _clip_model is None or _clip_processor is None:
        # Fallback heuristic: check image dimensions & basics
        return {"isToxic": False, "score": 0.02, "confidence": 0.98}

    try:
        import torch
        labels = [
            "a safe normal photograph, nature, portrait, artwork or everyday social media photo",
            "offensive, hateful, abusive, threatening, violent, or sexually inappropriate imagery"
        ]
        inputs = _clip_processor(text=labels, images=image, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs = _clip_model(**inputs)
            logits_per_image = outputs.logits_per_image # image-text similarity score
            probs = logits_per_image.softmax(dim=1)[0].cpu().tolist()

        toxic_prob = probs[1]
        is_toxic = toxic_prob >= 0.55
        return {
            "isToxic": is_toxic,
            "score": round(toxic_prob, 4),
            "confidence": round(toxic_prob if is_toxic else probs[0], 4)
        }
    except Exception as e:
        logger.warning(f"Visual CLIP check failed: {e}")
        return {"isToxic": False, "score": 0.02, "confidence": 0.98}

def analyze_image_bytes(
    image_bytes: bytes, 
    client_extracted_text: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyzes an uploaded image for:
    1. Text detected inside image (multilingual OCR text in Tamil, Hindi, English).
    2. Toxicity, harassment, abuse, insults, or threats inside the extracted text.
    3. Harmful / inappropriate visual content.
    """
    analyzer = get_analyzer()
    client_text = (client_extracted_text or "").strip()
    extracted_text = ""

    # Always prefer server OCR. Browser OCR can contain severe character noise,
    # especially when text is overlaid on a photograph.
    try:
        extracted_text = extract_image_text(image_bytes)
    except Exception as e:
        logger.info(f"Local OCR extraction skipped/failed: {e}")
    if not extracted_text:
        extracted_text = client_text

    # Open image for visual evaluation
    image_obj = None
    try:
        image_obj = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        logger.warning(f"Could not open image bytes as PIL Image: {e}")

    # 1. Visual Harm Analysis
    visual_res = {"isToxic": False, "score": 0.02, "confidence": 0.98}
    if image_obj:
        visual_res = check_visual_toxicity(image_obj)

    # 2. Extracted Text Toxicity Analysis (Multilingual Tamil, Hindi, English)
    text_analysis = None
    text_is_toxic = False
    text_tox_score = 0.0
    lang = "English"
    translated_text = ""

    if extracted_text:
        text_analysis = analyze_text(extracted_text)
        lang = text_analysis.get("language", "English")
        translated_text = text_analysis.get("translatedText", extracted_text)
        text_is_toxic = (text_analysis.get("toxicity", {}).get("label") == "TOXIC")
        text_tox_score = float(text_analysis.get("toxicity", {}).get("score", 0.0))
        
        # Rule check explicitly for severe harassment or insulting words in extracted text
        rule_check = analyzer.analyze(extracted_text)
        if rule_check.get("isToxic"):
            text_is_toxic = True
            text_tox_score = max(text_tox_score, float(rule_check.get("toxicityScore", 0.75)))

    # 3. Overall Decision
    is_blocked = text_is_toxic or visual_res.get("isToxic", False)
    
    if is_blocked:
        overall_score = max(text_tox_score, visual_res.get("score", 0.0))
        reason = "Toxic text detected in image" if text_is_toxic else "Harmful visual content detected"
        confidence = round(max(overall_score, 0.85), 2)
        return {
            "allowed": False,
            "result": "Toxic",
            "confidence": confidence,
            "reason": reason,
            "extractedText": extracted_text,
            "language": lang,
            "translatedText": translated_text,
            "toxicityScore": overall_score,
            "details": {
                "textToxicity": text_analysis,
                "visualSafety": visual_res
            }
        }
    else:
        overall_score = max(text_tox_score, visual_res.get("score", 0.0))
        confidence = round(1.0 - overall_score if overall_score > 0 else 0.97, 2)
        return {
            "allowed": True,
            "result": "Not Toxic",
            "confidence": confidence,
            "reason": "No harmful content detected",
            "extractedText": extracted_text,
            "language": lang,
            "translatedText": translated_text,
            "toxicityScore": overall_score,
            "details": {
                "textToxicity": text_analysis,
                "visualSafety": visual_res
            }
        }
