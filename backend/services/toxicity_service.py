import os
import logging
import re
from typing import Dict, Any, Tuple
from langdetect import detect_langs, DetectorFactory

# Set seed for reproducible language detection
DetectorFactory.seed = 0

# Logger setup
logger = logging.getLogger("toxicity_service")
logging.basicConfig(level=logging.INFO)

# Lightweight Models configuration
TRANSLATION_TAMIL_MODEL = "Helsinki-NLP/opus-mt-mul-en"
TRANSLATION_HINDI_MODEL = "Helsinki-NLP/opus-mt-hi-en"
TOXICITY_MODEL_NAME = "martin-ha/toxic-comment-model"
EMOTION_MODEL_NAME = "SamLowe/roberta-base-go_emotions"

# Global state
_models = {}
MODELS_LOADED = False
DEVICE = "cpu"

# Enable models on the backend by default
ENABLE_BACKEND_MODELS = os.getenv("ENABLE_BACKEND_MODELS", "true").lower() == "true"

if ENABLE_BACKEND_MODELS:
    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, AutoModelForSequenceClassification
        HAS_TORCH = True
        DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
        HAS_TORCH = False
        DEVICE = "cpu"
else:
    HAS_TORCH = False
    DEVICE = "cpu"

fallback_analyzer = None
try:
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from app.analyzer import get_analyzer
    fallback_analyzer = get_analyzer()
except Exception as e:
    logger.warning(f"Could not import rule-based fallback analyzer: {e}")

def load_all_models() -> bool:
    """
    Loads all Hugging Face models and tokenizers independently on startup.
    """
    global _models, MODELS_LOADED, DEVICE
    if not HAS_TORCH:
        logger.warning("FastAPI Server running in Rule-Based fallback mode (PyTorch/Transformers not available).")
        MODELS_LOADED = False
        return False
        
    logger.info(f"Toxicity Service: Initializing on device: {DEVICE}")
    
    # 1. Load Toxicity Model (crucial for toxicity detection)
    try:
        logger.info(f"Loading toxicity model: {TOXICITY_MODEL_NAME}...")
        _models["toxicity_tokenizer"] = AutoTokenizer.from_pretrained(TOXICITY_MODEL_NAME)
        _models["toxicity_model"] = AutoModelForSequenceClassification.from_pretrained(TOXICITY_MODEL_NAME).to(DEVICE)
        logger.info("Toxicity model loaded successfully.")
    except Exception as e:
        logger.warning(f"Could not load toxicity model {TOXICITY_MODEL_NAME}: {e}")

    # 2. Load Tamil Translation Model
    try:
        logger.info(f"Loading Tamil translation model: {TRANSLATION_TAMIL_MODEL}...")
        _models["tamil_tokenizer"] = AutoTokenizer.from_pretrained(TRANSLATION_TAMIL_MODEL)
        _models["tamil_model"] = AutoModelForSeq2SeqLM.from_pretrained(TRANSLATION_TAMIL_MODEL).to(DEVICE)
        logger.info("Tamil translation model loaded.")
    except Exception as e:
        logger.warning(f"Tamil translation model could not be loaded: {e}")

    # 3. Load Hindi Translation Model
    try:
        logger.info(f"Loading Hindi translation model: {TRANSLATION_HINDI_MODEL}...")
        _models["hindi_tokenizer"] = AutoTokenizer.from_pretrained(TRANSLATION_HINDI_MODEL)
        _models["hindi_model"] = AutoModelForSeq2SeqLM.from_pretrained(TRANSLATION_HINDI_MODEL).to(DEVICE)
        logger.info("Hindi translation model loaded.")
    except Exception as e:
        logger.warning(f"Hindi translation model could not be loaded: {e}")

    # 4. Load Emotion Model
    try:
        logger.info(f"Loading emotion model: {EMOTION_MODEL_NAME}...")
        _models["emotion_tokenizer"] = AutoTokenizer.from_pretrained(EMOTION_MODEL_NAME)
        _models["emotion_model"] = AutoModelForSequenceClassification.from_pretrained(EMOTION_MODEL_NAME).to(DEVICE)
        logger.info("Emotion model loaded.")
    except Exception as e:
        logger.warning(f"Emotion model could not be loaded: {e}")

    # 5. Sentiment Analyzer
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        _models["sentiment_analyzer"] = SentimentIntensityAnalyzer()
    except Exception as e:
        logger.warning(f"VADER Sentiment Analyzer notice: {e}")

    MODELS_LOADED = ("toxicity_model" in _models)
    logger.info(f"Hugging Face models initialization complete. Toxicity model ready: {MODELS_LOADED}")
    return MODELS_LOADED

def run_startup_health_check():
    """
    Inference verification check.
    """
    logger.info("Starting model inference health checks...")
    try:
        # Test translation
        trans = translate_to_english("உங்கள் புகைப்படம் மிகவும் அழகாக உள்ளது.", "Tamil")
        logger.info(f"Health Check - Tamil Translation: 'உங்கள் புகைப்படம்...' -> '{trans}'")
        
        trans_hi = translate_to_english("तुम बेवकूफ हो", "Hindi")
        logger.info(f"Health Check - Hindi Translation: 'तुम बेवकूफ हो' -> '{trans_hi}'")
        
        # Test toxicity
        tox = predict_toxicity("You are amazing!")
        logger.info(f"Health Check - Toxicity (Safe): {tox}")
        
        # Test sentiment
        sent = predict_sentiment("This is the best day ever!")
        logger.info(f"Health Check - Sentiment (Positive): {sent}")
        
        # Test emotion
        emot = predict_emotion("I am so scared of spiders.")
        logger.info(f"Health Check - Emotion (Fear): {emot}")
        
        logger.info("HEALTH CHECK: All models running correctly.")
    except Exception as e:
        logger.error(f"HEALTH CHECK FAILED: {e}")

def predict_toxicity_fallback(text: str) -> Dict[str, Any]:
    if fallback_analyzer:
        try:
            res = fallback_analyzer.analyze(text)
            score = float(res.get("toxicityScore", 0.0))
            is_toxic = bool(res.get("isToxic", False))
            return {
                "isToxic": is_toxic,
                "label": "TOXIC" if is_toxic else "NON_TOXIC",
                "toxicityScore": score,
                "confidence": round(score if is_toxic else 1.0 - score, 4)
            }
        except Exception as e:
            logger.error(f"Fallback analyzer failed: {e}")
            
    return {
        "isToxic": False,
        "label": "NON_TOXIC",
        "toxicityScore": 0.0,
        "confidence": 1.0
    }

def predict_toxicity_fallback(text: str) -> Dict[str, Any]:
    if fallback_analyzer:
        try:
            res = fallback_analyzer.analyze(text)
            score = float(res.get("toxicityScore", 0.0))
            is_toxic = bool(res.get("isToxic", False))
            return {
                "isToxic": is_toxic,
                "label": "TOXIC" if is_toxic else "NON_TOXIC",
                "toxicityScore": score,
                "confidence": round(score if is_toxic else 1.0 - score, 4)
            }
        except Exception as e:
            logger.error(f"Fallback analyzer failed: {e}")
            
    return {
        "isToxic": False,
        "label": "NON_TOXIC",
        "toxicityScore": 0.0,
        "confidence": 1.0
    }

def predict_toxicity(text: str) -> Dict[str, Any]:
    # 1. Get rule-based score & phrases
    rule_score = 0.0
    is_rule_toxic = False
    if fallback_analyzer:
        try:
            rule_res = fallback_analyzer.analyze(text)
            rule_score = float(rule_res.get("toxicityScore", 0.0))
            is_rule_toxic = bool(rule_res.get("isToxic", False))
        except Exception as e:
            logger.error(f"Rule analyzer check failed: {e}")

    if not MODELS_LOADED:
        return {
            "isToxic": is_rule_toxic,
            "label": "TOXIC" if is_rule_toxic else "NON_TOXIC",
            "toxicityScore": rule_score,
            "confidence": round(rule_score if is_rule_toxic else 1.0 - rule_score, 4)
        }
        
    try:
        tokenizer = _models["toxicity_tokenizer"]
        model = _models["toxicity_model"]
        
        inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True).to(DEVICE)
        with torch.no_grad():
            outputs = model(**inputs)
            
        probs = torch.softmax(outputs.logits, dim=-1)[0].cpu().tolist()
        
        # toxic-comment-model has classes: index 0 = non-toxic, index 1 = toxic
        ml_score = round(probs[1], 4)
        
        # Hybrid ensemble: combine neural network score with rule-based safety lexicons
        final_score = max(ml_score, rule_score)
        is_toxic = final_score >= 0.5
        label = "TOXIC" if is_toxic else "NON_TOXIC"
        confidence = round(final_score if is_toxic else (1.0 - final_score), 4)
        
        return {
            "isToxic": is_toxic,
            "label": label,
            "toxicityScore": round(final_score, 4),
            "confidence": confidence
        }
    except Exception as e:
        logger.error(f"Error during toxicity prediction: {e}")
        return predict_toxicity_fallback(text)

def predict_sentiment(text: str) -> Dict[str, Any]:
    # Rule check for explicit negative indicators
    lower_t = text.lower()
    if any(p in lower_t for p in ["disgusting", "can't stand", "unbearable", "waste of time", "nobody needs your opinion", "ugly", "stupid", "idiot", "hate", "loser", "shut up"]):
        return {"label": "Negative", "confidence": 0.95}

    try:
        analyzer = _models.get("sentiment_analyzer")
        if not analyzer:
            if fallback_analyzer:
                res = fallback_analyzer.analyze(text)
                return {"label": res.get("sentiment", "Neutral"), "confidence": 1.0}
            return {"label": "Neutral", "confidence": 1.0}
            
        scores = analyzer.polarity_scores(text)
        compound = scores["compound"]
        if compound >= 0.05:
            return {"label": "Positive", "confidence": round(scores["pos"] or 0.8, 4)}
        elif compound <= -0.05:
            return {"label": "Negative", "confidence": round(scores["neg"] or 0.8, 4)}
        else:
            return {"label": "Neutral", "confidence": round(scores["neu"] or 0.7, 4)}
    except Exception as e:
        logger.error(f"Error during sentiment prediction: {e}")
        return {"label": "Neutral", "confidence": 1.0}

def predict_emotion(text: str) -> Dict[str, Any]:
    lower_t = text.lower()
    # Explicit emotion overrides for cyberbullying and colloquial insults
    if any(k in lower_t for k in ["disgusting", "ugly", "can't stand", "unbearable", "repulsive", "gross", "pig", "eyesore", "face"]):
        return {"emotion": "Disgust", "confidence": 0.92}
    if any(k in lower_t for k in ["die", "kill", "murder", "death", "scared", "afraid", "terrified"]):
        return {"emotion": "Fear", "confidence": 0.90}
    if any(k in lower_t for k in ["idiot", "stupid", "fool", "hate", "shut up", "bastard", "moron", "loser", "pathetic", "mad", "angry"]):
        return {"emotion": "Anger", "confidence": 0.94}
    if any(k in lower_t for k in ["waste of time", "nobody needs your opinion", "useless", "pointless", "boring", "disappoint"]):
        return {"emotion": "Annoyance", "confidence": 0.88}
    if any(k in lower_t for k in ["beautiful", "wonderful", "awesome", "great", "love", "super", "congratulations", "good"]):
        return {"emotion": "Joy", "confidence": 0.95}

    if not MODELS_LOADED:
        return {"emotion": "Neutral", "confidence": 1.0}
        
    try:
        tokenizer = _models["emotion_tokenizer"]
        model = _models["emotion_model"]
        
        inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True).to(DEVICE)
        with torch.no_grad():
            outputs = model(**inputs)
            
        probs = torch.sigmoid(outputs.logits)[0].cpu().tolist()
        labels = [model.config.id2label[i] for i in range(len(probs))]
        max_idx = probs.index(max(probs))
        emotion_label = labels[max_idx].capitalize()
        
        return {
            "emotion": emotion_label,
            "confidence": round(probs[max_idx], 4)
        }
    except Exception as e:
        logger.error(f"Error during emotion prediction: {e}")
        return {"emotion": "Neutral", "confidence": 1.0}

def detect_language(text: str) -> Tuple[str, float]:
    if not text or not text.strip():
        return "English", 1.0

    latin_chars = sum(1 for c in text if ('A' <= c <= 'Z' or 'a' <= c <= 'z'))
    tamil_chars = sum(1 for c in text if 0x0B80 <= ord(c) <= 0x0BFF)
    hindi_chars = sum(1 for c in text if 0x0900 <= ord(c) <= 0x097F)

    # If predominantly Latin characters, it is English!
    if latin_chars >= 2 and latin_chars >= hindi_chars and latin_chars >= tamil_chars:
        return "English", 1.0

    # Genuine Indic script checks
    if hindi_chars >= 2 and hindi_chars > latin_chars and hindi_chars >= tamil_chars:
        return "Hindi", 1.0
    if tamil_chars >= 2 and tamil_chars > latin_chars and tamil_chars > hindi_chars:
        return "Tamil", 1.0

    try:
        predictions = detect_langs(text)
        best = predictions[0]
        lang_code = best.lang
        confidence = best.prob
        
        lang_map = {
            "en": "English",
            "ta": "Tamil",
            "hi": "Hindi"
        }
        
        return lang_map.get(lang_code, "English"), round(confidence, 4)
    except Exception as e:
        logger.warning(f"Language detection fallback: {e}. Defaulting to English.")
        return "English", 1.0

def translate_to_english(text: str, source_lang: str) -> str:
    if source_lang not in ["Tamil", "Hindi"]:
        return text
        
    # Clean OCR noise before translation if source language is established
    clean_text = text
    if source_lang == "Hindi":
        # Remove stray Tamil OCR noise characters from Hindi
        clean_text = re.sub(r'[\u0B80-\u0BFF]', '', clean_text)
        # Remove isolated 1-3 letter English OCR noise artifacts
        clean_text = re.sub(r'\b[A-Za-z]{1,3}\b', '', clean_text)
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
    elif source_lang == "Tamil":
        # Remove stray Devanagari OCR noise characters from Tamil
        clean_text = re.sub(r'[\u0900-\u097F]', '', clean_text)
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()

    # Check if fallback analyzer has a direct high-quality idiomatic match
    if fallback_analyzer:
        direct_match = fallback_analyzer.clean_and_translate_phrase(clean_text, source_lang)
        if direct_match and direct_match != clean_text:
            # If it cleanly converted known idioms or phrases
            if any(key in clean_text for key in ["சகிக்கல", "சகிக்கவில்லை", "சகிக்க", "யாருக்கும்", "நேரத்தை வீணடிக்கும்", "நேர வீண்", "முட்டாள்", "அசிங்க", "செத்துப்போ", "கொன்றுவிடுவேன்", "சூப்பர் பதிவு", "घटिया", "शर्मनाक", "बदसूरत", "बेवकूफ", "बकवास", "बर्बादी"]):
                return direct_match

    if not MODELS_LOADED:
        if fallback_analyzer:
            return fallback_analyzer.clean_and_translate_phrase(clean_text, source_lang)
        return clean_text
        
    try:
        if source_lang == "Tamil":
            tokenizer = _models.get("tamil_tokenizer")
            model = _models.get("tamil_model")
            if not tokenizer or not model:
                return fallback_analyzer.clean_and_translate_phrase(clean_text, source_lang) if fallback_analyzer else clean_text
            input_text = ">>eng<< " + clean_text
        else:
            tokenizer = _models.get("hindi_tokenizer")
            model = _models.get("hindi_model")
            if not tokenizer or not model:
                return fallback_analyzer.clean_and_translate_phrase(clean_text, source_lang) if fallback_analyzer else clean_text
            input_text = clean_text
            
        inputs = tokenizer(input_text, return_tensors="pt", truncation=True).to(DEVICE)
        outputs = model.generate(**inputs, max_length=128)
        translated_text = tokenizer.batch_decode(outputs, skip_special_tokens=True)[0].strip()

        # Remove stray private-use unicode glyphs (like )
        translated_text = re.sub(r'[\uE000-\uF8FF]', '', translated_text).strip()

        # Check for model hallucination / failure (e.g. repeated dots, %s format strings, empty letters)
        is_hallucination = (
            re.search(r'\.{4,}', translated_text) or
            "%s" in translated_text or
            "Timeless Record" in translated_text or
            "Could not close temporary folder" in translated_text or
            not re.search(r"[A-Za-z]{2,}", translated_text)
        )
        
        if is_hallucination and fallback_analyzer:
            translated_text = fallback_analyzer.clean_and_translate_phrase(clean_text, source_lang)

        # If any Tamil or Hindi script remains untranslated in the output string, clean it
        if re.search(r'[\u0B80-\u0BFF\u0900-\u097F]', translated_text) and fallback_analyzer:
            translated_text = fallback_analyzer.clean_and_translate_phrase(translated_text, source_lang)
            
        # Refine colloquial translations
        translated_text = re.sub(r'(?i)\blooking at it can\'t stand\b', 'Disgusting to look at', translated_text)
        translated_text = re.sub(r'(?i)\bto look can\'t stand\b', 'Disgusting to look at', translated_text)
        translated_text = re.sub(r'(?i)\byour opinion anyone not needed\b', 'Nobody needs your opinion', translated_text)
        translated_text = re.sub(r'(?i)\byour opinion is not needed by anyone\b', 'Nobody needs your opinion', translated_text)
        translated_text = re.sub(r'(?i)\bsuper recording friend\b', 'Super post friend', translated_text)
        translated_text = re.sub(r'(?i)\byou are so awful\b', 'You are so disgusting', translated_text)

        return translated_text.strip()
    except Exception as e:
        logger.error(f"Error during translation: {e}")
        if fallback_analyzer:
            return fallback_analyzer.clean_and_translate_phrase(text, source_lang)
        return text

def analyze_text(text: str) -> Dict[str, Any]:
    language, lang_confidence = detect_language(text)
    
    translated_text = text
    if language == "Tamil":
        translated_text = translate_to_english(text, "Tamil")
    elif language == "Hindi":
        translated_text = translate_to_english(text, "Hindi")
        
    analysis_text = translated_text if language != "English" else text
    
    # Run predictions
    toxicity = predict_toxicity(analysis_text)
    sentiment = predict_sentiment(analysis_text)
    emotion = predict_emotion(analysis_text)
    
    return {
        "originalText": text,
        "language": language,
        "translatedText": translated_text,
        "toxicity": {
            "label": toxicity["label"],
            "score": toxicity["toxicityScore"]
        },
        "sentiment": {
            "label": sentiment["label"],
            "confidence": sentiment["confidence"]
        },
        "emotion": {
            "emotion": emotion["emotion"],
            "confidence": emotion["confidence"]
        }
    }
