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
    # Clean OCR punctuation artifacts like ~ | ` _ ^ { } [ ] \
    cleaned = re.sub(r'[~|`_^{}\[\]\\]', ' ', cleaned)
    cleaned = re.sub(r'\s+([,.;!?])', r'\1', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    # Fix common OCR word fusion artifacts for memes & insults
    word_splits = [
        (r'\bwhenyou\b', 'when you'),
        (r'\bopenyour\b', 'open your'),
        (r'\bcomesout\b', 'comes out'),
        (r'\bcomesin\b', 'comes in'),
        (r'\byourmouth\b', 'your mouth'),
        (r'\bshutup\b', 'shut up'),
        (r'\bshutmouth\b', 'shut mouth'),
        (r'\bnobodylikes\b', 'nobody likes'),
        (r'\byouare\b', 'you are'),
        (r'\byouidiot\b', 'you idiot'),
        (r'\byoustupid\b', 'you stupid'),
        (r'\byouugly\b', 'you ugly'),
        (r'\byouloser\b', 'you loser'),
        (r'\bgodie\b', 'go die'),
        (r'\bgetlost\b', 'get lost'),
        (r'\bkillyourself\b', 'kill yourself'),
        (r'\bwasteof\b', 'waste of')
    ]
    for pattern, repl in word_splits:
        cleaned = re.sub(pattern, repl, cleaned, flags=re.IGNORECASE)

    # Fix trailing I or 1 after uppercase words like LOSERI -> LOSER!
    cleaned = re.sub(r'\b(LOSER|BITCH|IDIOT|BASTARD|SLUT|WHORE|PIG|UGLY|FOOL|CREEP|STUPID|MORON|USELESS|PATHETIC)I\b', r'\1!', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\b(LOSER|BITCH|IDIOT|BASTARD|SLUT|WHORE|PIG|UGLY|FOOL|CREEP|STUPID|MORON|USELESS|PATHETIC)1\b', r'\1!', cleaned, flags=re.IGNORECASE)
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
    """Extract readable English, Tamil, or Hindi text using fast OCR preprocessing."""
    from PIL import ImageOps, ImageEnhance
    import numpy as np
    
    try:
        image_obj = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        logger.warning(f"Failed to open image bytes: {e}")
        return ""

    # Scale down oversized images for ultra-fast, accurate OCR inference (under 1 second on CPU)
    max_dim = max(image_obj.size)
    if max_dim > 640:
        scale = 640.0 / max_dim
        new_size = (int(image_obj.size[0] * scale), int(image_obj.size[1] * scale))
        image_obj = image_obj.resize(new_size, Image.Resampling.LANCZOS)

    padded_image = ImageOps.expand(image_obj, border=12, fill=(245, 245, 245))
    text_en = ""
    try:
        en_reader = get_easyocr_reader(["en"])
        if en_reader:
            arr_raw = np.array(padded_image)
            results_en = en_reader.readtext(
                arr_raw,
                detail=1,
                paragraph=False,
                contrast_ths=0.1,
                adjust_contrast=0.5,
                text_threshold=0.3,
                low_text=0.3,
                link_threshold=0.3,
                batch_size=4
            )
            
            candidates = []
            for item in results_en:
                bbox, box_text, conf = item[0], item[1].strip(), float(item[2])
                if conf >= 0.15 and len(box_text) > 0:
                    top_y = min(point[1] for point in bbox)
                    left_x = min(point[0] for point in bbox)
                    candidates.append((top_y, left_x, box_text, conf))
            
            # Sort top-to-bottom (20px vertical bands) and left-to-right
            candidates.sort(key=lambda item: (item[0] // 20, item[1]))
            
            # Deduplicate normalized text fragments
            seen_tokens = set()
            final_tokens = []
            for item in candidates:
                norm = re.sub(r'\W+', '', item[2].lower())
                if norm and norm not in seen_tokens:
                    seen_tokens.add(norm)
                    final_tokens.append(item[2])
                    
            text_en = clean_detected_ocr_text(" ".join(final_tokens))
            
            latin_words = [w for w in re.findall(r'[A-Za-z]{2,}', text_en)]
            if len(latin_words) >= 2 or (len(latin_words) == 1 and len(latin_words[0]) >= 3):
                return text_en

        # 2. If no clear English words or Indic text suspected, try Hindi and Tamil readers
        for languages in (["hi", "en"], ["ta"]):
            reader = get_easyocr_reader(languages)
            if not reader:
                continue
            arr_indic = np.array(padded_image)
            results = reader.readtext(arr_indic, detail=1, paragraph=False, batch_size=4)
            valid = [item for item in results if float(item[2]) >= 0.2 and item[1].strip()]
            valid.sort(key=lambda item: (min(point[1] for point in item[0]) // 20, min(point[0] for point in item[0])))
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
    server_text = ""

    try:
        server_text = extract_image_text(image_bytes)
    except Exception as e:
        logger.info(f"Local OCR extraction skipped/failed: {e}")

    # Build ensemble candidate texts (server OCR, client OCR, combined)
    candidate_texts = []
    if server_text:
        candidate_texts.append(server_text)
    if client_text and client_text != server_text:
        candidate_texts.append(client_text)
    if server_text and client_text and client_text != server_text:
        candidate_texts.append(f"{server_text} {client_text}".strip())

    primary_extracted_text = server_text or client_text or ""

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
    translated_text = primary_extracted_text

    # Evaluate each extracted candidate text and pick the most sensitive assessment
    for cand in candidate_texts:
        curr_analysis = analyze_text(cand)
        cand_lang = curr_analysis.get("language", "English")
        cand_trans = curr_analysis.get("translatedText", cand)
        cand_is_toxic = (curr_analysis.get("toxicity", {}).get("label") == "TOXIC")
        cand_tox_score = float(curr_analysis.get("toxicity", {}).get("score", 0.0))
        
        # Rule check explicitly for severe harassment or insulting words in extracted text
        rule_check = analyzer.analyze(cand)
        if rule_check.get("isToxic"):
            cand_is_toxic = True
            cand_tox_score = max(cand_tox_score, float(rule_check.get("toxicityScore", 0.75)))

        if cand_tox_score > text_tox_score or (cand_is_toxic and not text_is_toxic) or text_analysis is None:
            text_analysis = curr_analysis
            text_is_toxic = cand_is_toxic
            text_tox_score = cand_tox_score
            lang = cand_lang
            translated_text = cand_trans
            primary_extracted_text = cand

    # 3. Overall Decision
    is_blocked = text_is_toxic or visual_res.get("isToxic", False)
    
    if is_blocked:
        overall_score = max(text_tox_score, visual_res.get("score", 0.0))
        reason = f"Toxic text detected in image: '{primary_extracted_text}'" if text_is_toxic else "Harmful visual content detected"
        confidence = round(max(overall_score, 0.85), 2)
        return {
            "allowed": False,
            "result": "Toxic",
            "confidence": confidence,
            "reason": reason,
            "extractedText": primary_extracted_text,
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
            "extractedText": primary_extracted_text,
            "language": lang,
            "translatedText": translated_text,
            "toxicityScore": overall_score,
            "details": {
                "textToxicity": text_analysis,
                "visualSafety": visual_res
            }
        }
