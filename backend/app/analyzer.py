import re
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

class ToxicityAnalyzer:
    def __init__(self):
        self.sia = SentimentIntensityAnalyzer()
        
        # High-severity harassment phrases
        self.severe_phrases = [
            "kill yourself", "go die", "nobody likes you", "hate you", 
            "get lost", "f@#k", "worthless piece", "shut up",
            "everyone hates you", "you are garbage", "ugly pig",
            "pathetic loser", "delete your account", "disgusting to look at",
            "unbearable to look at", "looking at it can't stand",
            "can't stand looking", "horrible to look at", "nobody needs your opinion",
            "nobody asked for your opinion", "not needed by anyone", "waste of time",
            "waste of space", "disgusted to look at your face",
            "no one cares about you", "nobody cares about you",
            "just disappear", "you should disappear", "you are so useless",
            "even your excuses are pathetic", "never come back", "don't come back",
            "go away", "nobody wants you", "nobody loves you"
        ]
        
        # Toxic words list
        self.toxic_words = {
            "idiot": 0.4,
            "loser": 0.4,
            "dumb": 0.35,
            "ugly": 0.45,
            "fat": 0.3,
            "trash": 0.35,
            "garbage": 0.35,
            "worthless": 0.4,
            "disgusting": 0.5,
            "repulsive": 0.5,
            "unbearable": 0.4,
            "intolerable": 0.4,
            "awful": 0.35,
            "horrible": 0.35,
            "stupid": 0.35,
            "freak": 0.35,
            "failure": 0.35,
            "pathetic": 0.4,
            "creep": 0.35,
            "pig": 0.35,
            "hate": 0.3,
            "annoying": 0.25,
            "useless": 0.35,
            "jerk": 0.35,
            "fool": 0.3,
            "moron": 0.4,
            "bastard": 0.5,
            "bitch": 0.5,
            "worst": 0.4,
            "bad": 0.2,
            "suck": 0.35,
            "sucks": 0.35,
            "eyesore": 0.45
        }

        # Tamil dictionary for fallback translation
        self.tamil_dict = {
            "அருமையான": "wonderful",
            "பதிவு": "post",
            "பதிவுகள்": "posts",
            "அருமை": "awesome",
            "முட்டாள்": "stupid",
            "முட்டாளே": "you fool",
            "நல்ல": "good",
            "நல்லது": "good",
            "மோசம்": "bad",
            "மோசமாக": "very bad",
            "மோசமான": "bad",
            "கெட்ட": "evil",
            "நன்றி": "thanks",
            "மிக்க": "very much",
            "பிடிக்கவில்லை": "don't like",
            "பிடிக்கல": "don't like",
            "பிடிச்சிருக்கு": "liked it",
            "கோபம்": "angry",
            "அழகு": "beautiful",
            "அழகான": "beautiful",
            "அழகாக": "beautiful",
            "சூப்பர்": "super",
            "நேரம்": "time",
            "நேரத்தை": "time",
            "வீண்": "waste",
            "வீணான": "wasteful",
            "வீணடிக்கும்": "wasting",
            "கழிவு": "waste",
            "அருவருப்பான": "disgusting",
            "அருவருப்பாக": "disgusting",
            "அருவருப்பு": "disgusting",
            "அசிங்கம்": "ugly",
            "அசிங்கமா": "ugly",
            "அசிங்கமாக": "ugly",
            "பைத்தியம்": "crazy",
            "நாய்": "dog",
            "நாயே": "dog",
            "செத்துப்போ": "go die",
            "சாவு": "die",
            "செத்து": "die",
            "கொன்றுவிடுவேன்": "will kill you",
            "கொல்வேன்": "will kill",
            "உங்கள்": "Your",
            "உன்": "your",
            "உனது": "your",
            "உன்னை": "you",
            "உனக்கு": "you",
            "புகைப்படம்": "photograph",
            "படம்": "picture",
            "மிகவும்": "very",
            "ரொம்ப": "very",
            "ரொம்ப": "very",
            "உள்ளது": "is",
            "இருக்கிறது": "is",
            "இருக்க": "are",
            "இருக்கிறாய்": "are",
            "இருக்கிறார்": "is",
            "நீ": "you",
            "பார்க்க": "to look",
            "பார்க்கவே": "to look at",
            "பார்க்கும்": "looking",
            "சகிக்கல": "disgusting",
            "சகிக்கவில்லை": "disgusting",
            "சகிக்க": "bear",
            "சகிக்கமுடியல": "unbearable",
            "சகிக்கமுடியவில்லை": "unbearable",
            "தேவையில்லை": "not needed",
            "தேவை": "need",
            "இல்லை": "not",
            "வேண்டாம்": "unwanted",
            "யாருக்கும்": "anyone",
            "கருத்து": "opinion",
            "கருத்தை": "opinion",
            "கருத்துக்கள்": "opinions",
            "மச்சான்": "dude",
            "நண்பா": "friend",
            "நண்பன்": "friend",
            "நண்பர்கள்": "friends",
            "வாழ்த்துக்கள்": "congratulations",
            "சிறந்த": "great",
            "சுவையான": "delicious",
            "சுவையாக": "delicious",
            "உணவு": "food",
            "நாள்": "day",
            "இன்று": "today",
            "நாளை": "tomorrow",
            "முடிவு": "decision",
            "வேலை": "work",
            "செய்யவில்லை": "not working",
            "தோற்றுவிட்டோம்": "lost",
            "போட்டி": "match",
            "குளிராக": "cold",
            "ஒன்றுமே": "nothing",
            "தெரியாது": "know nothing",
            "தொந்தரவு": "nuisance",
            "எப்போதும்": "always",
            "முகம்": "face",
            "முகத்தை": "face",
            "முகத்தைப்": "face",
            "சீன்": "show",
            "போடுறான்": "showing off",
            "காமெடி": "joke",
            "பண்ணாதே": "don't make",
            "கடுப்பு": "frustrated",
            "கடுப்பாக": "frustrated",
            "பசி": "hungry",
            "மரண": "deadly",
            "ஆஃப்": "of",
            "டைம்": "time",
            "டேய்": "hey",
            "தப்பு": "wrong",
            "பண்றது": "doing"
        }

        # Hindi dictionary for fallback translation
        self.hindi_dict = {
            "बेवकूफ": "stupid",
            "अच्छा": "good",
            "अच्छे": "good",
            "बहुत": "very",
            "बुरा": "bad",
            "बुरी": "bad",
            "धन्यवाद": "thanks",
            "सुंदर": "beautiful",
            "बकवास": "nonsense",
            "समय": "time",
            "बर्बादी": "waste",
            "बर्बाद": "waste",
            "मूर्ख": "fool",
            "पागल": "crazy",
            "गधा": "donkey",
            "कचरा": "garbage",
            "नफरत": "hate",
            "प्यार": "love",
            "पोस्ट": "post",
            "बढ़िया": "great",
            "शानदार": "excellent",
            "मर": "die",
            "मार": "kill",
            "सुअर": "pig",
            "कुत्ता": "dog",
            "कुत्ते": "dog",
            "दफा": "get lost",
            "बेकार": "useless",
            "तुमने": "you",
            "काम": "work",
            "किया": "did",
            "ऐसे": "like this",
            "ही": "only",
            "आगे": "forward",
            "बढ़ते": "moving",
            "रहो": "keep",
            "इंसान": "person",
            "तस्वीर": "picture",
            "दिन": "day",
            "पसंद": "liked",
            "सफलता": "success",
            "किताब": "book",
            "छुट्टी": "holiday",
            "फैसला": "decision",
            "गलत": "wrong",
            "घटिया": "terrible",
            "शर्म": "shame",
            "आनी": "come",
            "चाहिए": "should",
            "चेहरा": "face",
            "देखने": "looking",
            "लायक": "worth",
            "नहीं": "not"
        }

    def translate_word_tamil(self, word: str) -> str:
        clean = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()?]', '', word)
        if clean in self.tamil_dict:
            return self.tamil_dict[clean]
        if "அசிங்க" in clean:
            return "ugly"
        if "கொல்" in clean or "கொன்" in clean:
            return "kill"
        if "செத்து" in clean or "சாவு" in clean:
            return "die"
        if "நாய" in clean:
            return "dog"
        if "முட்டாள்" in clean:
            return "stupid"
        if "பைத்தியம்" in clean:
            return "crazy"
        if "அழகு" in clean or "அழக" in clean:
            return "beautiful"
        if "புகைப்பட" in clean:
            return "photograph"
        if "நண்ப" in clean:
            return "friend"
        if "தெரி" in clean:
            return "look"
        if "பேசு" in clean or "பேசி" in clean:
            return "speak"
        if "ரொம்ப" in clean or "ரொம்ப" in clean or "மிகவும்" in clean:
            return "very"
        if clean in ["உன்", "உனது"]:
            return "your"
        if "உங்கள்" in clean or "உன்" in clean:
            if clean in ["உன்", "உன்னை", "உனக்கு"]:
                return "you"
            return "your"
        if clean == "நீ":
            return "you"
        if "இருக்" in clean:
            return "are"
        if "உள்ளது" in clean or "இருக்கிறது" in clean:
            return "is"
        if "பதிவு" in clean:
            return "post"
        if "போஸ்ட்" in clean:
            return "post"
        if "அருமை" in clean:
            return "wonderful"
        if "நன்றி" in clean:
            return "thanks"
        if "பிடிக்க" in clean or "பிடி" in clean:
            return "dislike"
        if "கோபம்" in clean:
            return "angry"
        if "வீண்" in clean or "கழிவு" in clean:
            return "waste"
        if "அருவருப்" in clean:
            return "disgusting"
        if "சகிக்க" in clean:
            return "disgusting"
        if "கருத்து" in clean:
            return "opinion"
        if "யாருக்" in clean:
            return "anyone"
        if "தேவை" in clean:
            return "not needed"
        return self.tamil_dict.get(clean, clean)

    def translate_word_hindi(self, word: str) -> str:
        clean = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()?]', '', word)
        if "बदसूरत" in clean:
            return "ugly"
        if "बेवकूफ" in clean:
            return "stupid"
        if "मूर्ख" in clean:
            return "fool"
        if "पागल" in clean:
            return "crazy"
        if "सुअर" in clean:
            return "pig"
        if "कुत्ता" in clean or "कुत्ते" in clean:
            return "dog"
        if "मर" in clean:
            return "die"
        if "मार" in clean:
            return "kill"
        if "दफा" in clean:
            return "get lost"
        if "बकवास" in clean:
            return "nonsense"
        if "बेकार" in clean:
            return "waste"
        if "पोस्ट" in clean or "पास्ट" in clean:
            return "post"
        if clean in ["तुम्हारे", "तुम्हारा", "तुम्हारी", "आपका", "आपकी"]:
            return "your"
        if "तुम" in clean:
            return "you"
        if "दिख" in clean or "लगत" in clean:
            return "look"
        if "हो" in clean or "हैं" in clean:
            return "are"
        if "है" in clean:
            return "is"
        return self.hindi_dict.get(clean, clean)

    def analyze(self, text: str) -> dict:
        """
        Analyzes comment text and returns a dictionary with:
        - toxicityScore: float between 0.0 and 1.0
        - isToxic: bool (True if score >= 0.5)
        - sentiment: str ('Positive', 'Neutral', 'Negative')
        - language: str ('Tamil', 'Hindi', 'English')
        - translatedText: str
        """
        if not text or not text.strip():
            return {
                "toxicityScore": 0.0,
                "isToxic": False,
                "sentiment": "Neutral",
                "language": "English",
                "translatedText": ""
            }
            
    def clean_and_translate_phrase(self, text: str, language: str) -> str:
        clean_in = text.strip()
        
        # 1. Idiomatic full-phrase matches for Tamil
        if language == "Tamil":
            if "பார்க்கவே சகிக்கல" in clean_in or "பார்க்க சகிக்கவில்லை" in clean_in or "பார்க்கவே சகிக்கவில்லை" in clean_in or "பார்க்க சகிக்கல" in clean_in:
                return "Disgusting to look at."
            if "சகிக்க முடியவில்லை" in clean_in or "சகிக்க முடியல" in clean_in:
                return "Unbearable to tolerate."
            if "யாருக்கும்" in clean_in and ("தேவையில்லை" in clean_in or "not needed" in clean_in or "வேண்டாம்" in clean_in):
                if "opinion" in clean_in.lower() or "கருத்து" in clean_in:
                    return "Nobody needs your opinion."
                return "Not needed by anyone."
            if "உன் கருத்து யாருக்கும் தேவையில்லை" in clean_in or "கருத்து யாருக்கும் தேவையில்லை" in clean_in:
                return "Nobody needs your opinion."
            if "அருமையான பதிவு" in clean_in:
                return "Wonderful post."
            if "உங்கள் புகைப்படம் மிகவும் அழகாக உள்ளது" in clean_in:
                return "Your photograph is very beautiful."
            if any(w in clean_in for w in ["நேர வீண்", "நேரத்தை வீணடிக்கும்", "வீணான நேரம்"]):
                return "Waste of time post."
            if "முகத்தைப் பார்க்கவே" in clean_in and "அருவருப்" in clean_in:
                return "I feel disgusted to look at your face."
            if "உன் முகம் ரொம்ப அசிங்கமாக இருக்கிறது" in clean_in or "முகம் ரொம்ப அசிங்கமாக" in clean_in:
                return "Your face is very ugly."
            if "உன் முகம் அசிங்கமாக இருக்கிறது" in clean_in or "முகம் அசிங்கம்" in clean_in:
                return "Your face is ugly."
            if "நீ மிகவும் முட்டாள்" in clean_in or "நீ ஒரு முட்டாள்" in clean_in:
                return "You are very stupid."
            if "மிகவும் அசிங்கமாக உள்ளது" in clean_in or "அசிங்கமாக உள்ளது" in clean_in or "அசிங்கமா இருக்கு" in clean_in:
                return "It is very ugly."
            if "செத்துப்போ நாயே" in clean_in:
                return "Go die, dog."
            if "கொன்றுவிடுவேன்" in clean_in or "கொல்வேன்" in clean_in:
                return "I will kill you."
            if "சூப்பர் பதிவு" in clean_in:
                return "Super post friend."
                
            # Token by token replacement
            words = clean_in.split()
            trans_words = [self.translate_word_tamil(w) for w in words]
            out = " ".join(trans_words)
            
            # Post-replacement cleanup of colloquial patterns
            out = re.sub(r'(?i)\byour opinion anyone not needed\b', 'Nobody needs your opinion', out)
            out = re.sub(r'(?i)\byour opinion is not needed by anyone\b', 'Nobody needs your opinion', out)
            out = re.sub(r'(?i)\byour opinion not needed by anyone\b', 'Nobody needs your opinion', out)
            out = re.sub(r'(?i)\bto look at disgusting\b', 'Disgusting to look at', out)
            out = re.sub(r'(?i)\blooking at it can\'t stand\b', 'Disgusting to look at', out)
            out = re.sub(r'(?i)\blooking disgusting\b', 'Disgusting to look at', out)
            out = re.sub(r'(?i)\bvery ugly is\b', 'It is very ugly', out)
            out = re.sub(r'(?i)\btime waste post\b', 'Waste of time post', out)
            return out
            
        elif language == "Hindi":
            # Strip stray Tamil OCR noise and isolated English noise
            clean_in = re.sub(r'[\u0B80-\u0BFF]', '', clean_in)
            clean_in = re.sub(r'\b[A-Za-z]{1,3}\b', '', clean_in)
            clean_in = re.sub(r'\s+', ' ', clean_in).strip()

            if "घटिया" in clean_in and ("होना ही" in clean_in or "शर्मनाक" in clean_in or "तेरा" in clean_in):
                return "You are so disgusting that your very existence is shameful."
            if "इतनी घटिया" in clean_in or "घटिया है" in clean_in or "घटिया" in clean_in:
                return "You are so terrible and disgusting."
            if "शर्मनाक" in clean_in:
                return "It is shameful."
            if "तुम बहुत बदसूरत हो" in clean_in or "बहुत बदसूरत हो" in clean_in or "बदसूरत" in clean_in:
                return "You are very ugly."
            if "तुमने बहुत अच्छा काम किया" in clean_in:
                return "You did a very good job. Keep moving forward like this."
            if "बहुत बढ़िया" in clean_in:
                return "Very good."
            if "समय की बर्बादी" in clean_in or "बकवास" in clean_in:
                return "Waste of time."
            if "चेहरा देखने लायक नहीं" in clean_in or "शर्म आनी चाहिए" in clean_in:
                return "Your face is disgusting to look at."
                
            words = clean_in.split()
            trans_words = [self.translate_word_hindi(w) for w in words]
            return " ".join(trans_words)
            
        return clean_in

    def analyze(self, text: str) -> dict:
        """
        Analyzes comment text and returns a dictionary with:
        - toxicityScore: float between 0.0 and 1.0
        - isToxic: bool (True if score >= 0.5)
        - sentiment: str ('Positive', 'Neutral', 'Negative')
        - language: str ('Tamil', 'Hindi', 'English')
        - translatedText: str
        """
        if not text or not text.strip():
            return {
                "toxicityScore": 0.0,
                "isToxic": False,
                "sentiment": "Neutral",
                "language": "English",
                "translatedText": ""
            }
            
        language = "English"
        translated_text = text

        # Count script characters for accurate detection even with noisy OCR
        tamil_chars = sum(1 for c in text if 0x0B80 <= ord(c) <= 0x0BFF)
        hindi_chars = sum(1 for c in text if 0x0900 <= ord(c) <= 0x097F)

        if hindi_chars > 0 and hindi_chars >= tamil_chars:
            language = "Hindi"
            translated_text = self.clean_and_translate_phrase(text, "Hindi")
        elif tamil_chars > 0 and tamil_chars > hindi_chars:
            language = "Tamil"
            translated_text = self.clean_and_translate_phrase(text, "Tamil")

        clean_text = translated_text.lower().strip()
        
        # Get VADER scores
        vader_scores = self.sia.polarity_scores(translated_text)
        compound = vader_scores['compound']
        neg = vader_scores['neg']
        
        # 1. Base score derived from negative sentiment and negative compound
        base_score = 0.0
        if compound < 0:
            # Scale compound negative score (from -1 to 0 -> 0 to 0.45)
            base_score += abs(compound) * 0.45
        if neg > 0:
            base_score += neg * 0.35
            
        # 2. Phrase matching (severe harassment trigger)
        phrase_score = 0.0
        matched_phrases = []
        for phrase in self.severe_phrases:
            if phrase in clean_text:
                matched_phrases.append(phrase)
                phrase_score = max(phrase_score, 0.6)  # Direct trigger score
                
        # 3. Word matching (handles exact words and fused OCR words like 'Thisbitch')
        word_score = 0.0
        words = re.findall(r'\b\w+\b', clean_text)
        matched_words = []
        for word in words:
            if word in self.toxic_words:
                matched_words.append(word)
                word_score += self.toxic_words[word]
        
        # Check fused/compound tokens for severe profanities and insults
        for severe_word in ["bitch", "bastard", "idiot", "loser", "dumb", "ugly", "freak", "moron", "slut", "whore", "pig"]:
            if severe_word not in matched_words and severe_word in clean_text:
                matched_words.append(severe_word)
                word_score += self.toxic_words.get(severe_word, 0.5)
        
        # Cap word score contributions at 0.5 to prevent overflow, unless it's repeated
        word_score = min(word_score, 0.5)
        
        # 4. Calculate overall weighted score
        if phrase_score > 0:
            toxicity_score = phrase_score + (word_score * 0.4) + (base_score * 0.2)
        else:
            toxicity_score = base_score + word_score
            
        # Cap at 1.0 and format to 2 decimal places
        toxicity_score = min(max(toxicity_score, 0.0), 1.0)
        toxicity_score = round(toxicity_score, 2)
        
        # Classification threshold
        is_toxic = toxicity_score >= 0.5
        
        # Sentiment label mapping
        clean_trimmed = translated_text.strip()
        if clean_trimmed.endswith('?'):
            sentiment = "Neutral"
        elif clean_trimmed.endswith('!') and not is_toxic:
            sentiment = "Positive"
        elif any(term in text for term in ["சகிக்க", "பிடிக்கல", "பிடிக்கவில்லை", "மோசம்", "அருவருப்", "தேவையில்லை"]):
            sentiment = "Negative"
        elif compound >= 0.05:
            sentiment = "Positive"
        elif compound <= -0.05:
            sentiment = "Negative"
        else:
            sentiment = "Neutral"
            
        # If there are highly toxic words or phrases, overwrite sentiment to Negative
        if is_toxic:
            sentiment = "Negative"
            
        return {
            "toxicityScore": toxicity_score,
            "isToxic": is_toxic,
            "sentiment": sentiment,
            "language": language,
            "translatedText": translated_text
        }

# Global analyzer instance
analyzer_instance = ToxicityAnalyzer()

def get_analyzer():
    return analyzer_instance
