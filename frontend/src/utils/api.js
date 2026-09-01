import { 
  MOCK_POSTS, getLocalComments, getLocalUsers, getLocalLogs, getLocalNotifications, addLocalNotification, getLocalReposts, addLocalRepost, getLocalImageReports, addLocalImageReport,
  markLocalNotificationRead, markAllLocalNotificationsRead,
  addLocalComment, deleteLocalComment, deleteLocalCommentsByPost, deleteLocalPost, warnLocalUser, unwarnLocalUser, suspendLocalUser, unsuspendLocalUser, addLocalPost 
} from './mockData'
import { runAiPipeline, loadPipelineModels, isModelReady, isModelLoading, modelLoadingStatus } from './aiPipeline'
import Tesseract from 'tesseract.js'

const BACKEND_URL = 'http://127.0.0.1:8000'
const PHOTO_ASSETS = [
  '/photos/164cecaf732f8b069124d966d8563031.jpg',
  '/photos/3b39d7dd5a89209a4f456693ca2efa9d.jpg',
  '/photos/4415c674c7306020ba6cc0853949db8f.jpg',
  '/photos/5f5ad7ba5b95589b119792e5196067a1.jpg',
  '/photos/97be6ca92464446f9df420a40fef2530.jpg',
  '/photos/cb67b417697a3d60ab9c7968786cf403.jpg',
  '/photos/e508c55f4963383cda09d7208fc8b3ea.jpg',
  '/photos/f5f8a45f67da9e79de40e437a3225c1d.jpg'
]

// Pre-load in-browser Hugging Face models in the background on startup
try {
  loadPipelineModels().catch(err => console.warn("Failed to pre-load browser HF models:", err));
} catch (e) {
  console.warn("Error triggering browser HF models:", e);
}

// Simple client-side toxicity classifier for offline fallback
const tamilDictClient = {
  "அருமையான": "wonderful", "பதிவு": "post", "பதிவுகள்": "posts", "அருமை": "awesome", "முட்டாள்": "stupid",
  "நல்ல": "good", "நல்லது": "good", "மோசம்": "bad", "மோசமாக": "very bad", "மோசமான": "bad", "கெட்ட": "evil", "நன்றி": "thanks",
  "மிக்க": "very much", "பிடிக்கவில்லை": "don't like", "பிடிக்கல": "don't like", "பிடிச்சிருக்கு": "liked it",
  "கோபம்": "angry", "அழகு": "beautiful", "அழகான": "beautiful", "அழகாக": "beautiful",
  "சூப்பர்": "super", "நேரம்": "time", "நேரத்தை": "time", "வீண்": "waste", "வீணான": "wasteful", "வீணடிக்கும்": "wasting", "கழிவு": "waste",
  "அருவருப்பான": "disgusting", "அருவருப்பாக": "disgusting", "அருவருப்பு": "disgusting", "அசிங்கம்": "ugly", "அசிங்கமா": "ugly", "அசிங்கமாக": "ugly", "பைத்தியம்": "crazy",
  "நாய்": "dog", "நாயே": "dog", "செத்துப்போ": "go die", "சாவு": "die", "செத்து": "die", "கொன்றுவிடுவேன்": "will kill you", "கொல்வேன்": "will kill",
  "உங்கள்": "Your", "உன்": "your", "உனது": "your", "உன்னை": "you", "உனக்கு": "you", "புகைப்படம்": "photograph", "படம்": "picture",
  "மிகவும்": "very", "ரொம்ப": "very", "ரொம்ப": "very", "உள்ளது": "is", "இருக்கிறது": "is", "இருக்க": "are", "இருக்கிறாய்": "are",
  "நீ": "you", "பார்க்க": "to look", "பார்க்கவே": "to look at", "பார்க்கும்": "looking", "சகிக்கல": "disgusting", "சகிக்கவில்லை": "disgusting", "சகிக்க": "bear",
  "சகிக்கமுடியல": "unbearable", "சகிக்கமுடியவில்லை": "unbearable", "தேவையில்லை": "not needed", "தேவை": "need", "இல்லை": "not", "வேண்டாம்": "unwanted",
  "யாருக்கும்": "anyone", "கருத்து": "opinion", "கருத்தை": "opinion", "கருத்துக்கள்": "opinions", "மச்சான்": "dude", "நண்பா": "friend", "நண்பன்": "friend",
  "வாழ்த்துக்கள்": "congratulations", "சுவையான": "delicious", "சுவையாக": "delicious", "உணவு": "food", "நாள்": "day", "இன்று": "today", "நாளை": "tomorrow"
};

const translateTamilWord = (word) => {
  const clean = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
  if (tamilDictClient[clean]) return tamilDictClient[clean];
  if (clean.includes("அசிங்க")) return "ugly";
  if (clean.includes("கொல்") || clean.includes("கொன்")) return "kill";
  if (clean.includes("செத்து") || clean.includes("சாவு")) return "die";
  if (clean.includes("நாய")) return "dog";
  if (clean.includes("முட்டாள்")) return "stupid";
  if (clean.includes("பைத்தியம்")) return "crazy";
  if (clean.includes("அழகு") || clean.includes("அழக")) return "beautiful";
  if (clean.includes("புகைப்பட")) return "photograph";
  if (clean.includes("நண்ப")) return "friend";
  if (clean.includes("தெரி")) return "look";
  if (clean.includes("பேசு") || clean.includes("பேசி")) return "speak";
  if (clean.includes("ரொம்ப") || clean.includes("ரொம்ப") || clean.includes("மிகவும்")) return "very";
  if (clean === "உன்" || clean === "உனது") return "your";
  if (clean.includes("உங்கள்") || clean.includes("உன்")) {
    if (["உன்", "உன்னை", "உனக்கு"].includes(clean)) return "you";
    return "your";
  }
  if (clean === "நீ") return "you";
  if (clean.includes("இருக்")) return "are";
  if (clean.includes("உள்ளது") || clean.includes("இருக்கிறது")) return "is";
  if (clean.includes("பதிவு")) return "post";
  if (clean.includes("போஸ்ட்")) return "post";
  if (clean.includes("வீண்")) return "waste";
  if (clean.includes("அருமை")) return "wonderful";
  if (clean.includes("நன்றி")) return "thanks";
  if (clean.includes("பிடிக்க") || clean.includes("பிடி")) return "dislike";
  if (clean.includes("கோபம்")) return "angry";
  if (clean.includes("அருவருப்") || clean.includes("சகிக்க")) return "disgusting";
  if (clean.includes("கருத்து")) return "opinion";
  if (clean.includes("யாருக்")) return "anyone";
  if (clean.includes("தேவை")) return "not needed";
  
  return clean;
};

const translateHindiWord = (word) => {
  const clean = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
  const hindiDict = {
    "बेवकूफ": "stupid", "अच्छा": "good", "बहुत": "very", "बुरा": "bad", "धन्यवाद": "thanks",
    "सुंदर": "beautiful", "बकवास": "nonsense", "समय": "time", "बर्बादी": "waste",
    "मूर्ख": "fool", "पागल": "crazy", "गधा": "donkey", "कचरा": "garbage", "नफरत": "hate",
    "प्यार": "love", "पोस्ट": "post", "बढ़िया": "great", "शानदार": "excellent",
    "मर": "die", "मार": "kill", "सुअर": "pig", "कुत्ता": "dog", "चेहरा": "face", "शर्म": "shame"
  };
  if (hindiDict[clean]) return hindiDict[clean];
  if (clean.includes("बदसूरत")) return "ugly";
  if (clean.includes("बेवकूफ")) return "stupid";
  if (clean.includes("मूर्ख")) return "fool";
  if (clean.includes("पागल")) return "crazy";
  if (clean.includes("सुअर")) return "pig";
  if (clean.includes("कुत्ता") || clean.includes("कुत्ते")) return "dog";
  if (clean.includes("मर")) return "die";
  if (clean.includes("मार")) return "kill";
  if (clean.includes("दफा")) return "get lost";
  if (clean.includes("बकवास")) return "nonsense";
  if (clean.includes("बेकार")) return "waste";
  if (clean.includes("पोस्ट") || clean.includes("पास्ट")) return "post";
  if (clean === "तुम्हारे" || clean === "तुम्हारा" || clean === "तुम्हारी" || clean === "आपका" || clean === "आपकी") return "your";
  if (clean.includes("तुम")) return "you";
  if (clean.includes("दिख") || clean.includes("लगत")) return "look";
  if (clean.includes("हो") || clean.includes("हैं")) return "are";
  if (clean.includes("है")) return "is";

  return clean;
};

const analyzeToxicityClient = (text) => {
  const clean = text.toLowerCase();
  let language = "English";
  let translatedText = text;
  const latinChars = (text.match(/[A-Za-z]/g) || []).length;
  const tamilChars = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
  const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;

  if (latinChars >= 2 && latinChars >= hindiChars && latinChars >= tamilChars) {
    language = "English";
    translatedText = text;
  } else if (hindiChars >= 2 && hindiChars > latinChars && hindiChars >= tamilChars) {
    language = "Hindi";
    let cleanHindi = text.replace(/[\u0B80-\u0BFF]/g, '').replace(/\b[A-Za-z]{1,3}\b/g, '').trim();
    if (cleanHindi.includes("घटिया") && (cleanHindi.includes("होना ही") || cleanHindi.includes("शर्मनाक") || cleanHindi.includes("तेरा"))) {
      translatedText = "You are so disgusting that your very existence is shameful.";
    } else if (cleanHindi.includes("इतनी घटिया") || cleanHindi.includes("घटिया है") || cleanHindi.includes("घटिया")) {
      translatedText = "You are so terrible and disgusting.";
    } else if (cleanHindi.includes("शर्मनाक")) {
      translatedText = "It is shameful.";
    } else if (cleanHindi.includes("बदसूरत")) {
      translatedText = "You are very ugly.";
    } else if (cleanHindi.includes("समय की बर्बादी") || cleanHindi.includes("समय की बर्बादी है")) {
      translatedText = "Waste of time.";
    } else if (cleanHindi.includes("बहुत अच्छा") || cleanHindi.includes("बहुत बढ़िया")) {
      translatedText = "Very good.";
    } else {
      const words = cleanHindi.split(/\s+/);
      const transWords = words.map(w => translateHindiWord(w));
      translatedText = transWords.join(" ");
    }
  } else if (tamilChars >= 2 && tamilChars > latinChars && tamilChars > hindiChars) {
    language = "Tamil";
    let cleanTamil = text.replace(/[\u0900-\u097F]/g, '').trim();
    if (cleanTamil.includes("பார்க்கவே சகிக்கல") || cleanTamil.includes("பார்க்க சகிக்கவில்லை") || cleanTamil.includes("பார்க்கவே சகிக்கவில்லை") || cleanTamil.includes("பார்க்க சகிக்கல")) {
      translatedText = "Disgusting to look at.";
    } else if (cleanTamil.includes("உன் கருத்து யாருக்கும் தேவையில்லை") || cleanTamil.includes("யாருக்கும்") && (cleanTamil.includes("தேவையில்லை") || cleanTamil.includes("not needed"))) {
      translatedText = "Nobody needs your opinion.";
    } else if (cleanTamil.includes("அருமையான பதிவு")) {
      translatedText = "Wonderful post.";
    } else if (cleanTamil.includes("உங்கள் புகைப்படம் மிகவும் அழகாக உள்ளது")) {
      translatedText = "Your photograph is very beautiful.";
    } else if (cleanTamil.includes("நேர வீண்") || cleanTamil.includes("நேரத்தை வீணடிக்கும்") || cleanTamil.includes("வீணான நேரம்")) {
      translatedText = "Waste of time post.";
    } else if (cleanTamil.includes("நீ மிகவும் முட்டாள்")) {
      translatedText = "You are very stupid.";
    } else if (cleanTamil.includes("உன் முகம் ரொம்ப அசிங்கமாக இருக்கிறது") || cleanTamil.includes("முகம் ரொம்ப அசிங்கமாக")) {
      translatedText = "Your face is very ugly.";
    } else if (cleanTamil.includes("அசிங்கமாக உள்ளது") || cleanTamil.includes("மிகவும் அசிங்கமாக உள்ளது")) {
      translatedText = "It is very ugly.";
    } else {
      const words = cleanTamil.split(/\s+/);
      const transWords = words.map(w => translateTamilWord(w));
      translatedText = transWords.join(" ");
      translatedText = translatedText.replace(/your opinion anyone not needed/i, "Nobody needs your opinion");
      translatedText = translatedText.replace(/to look at disgusting/i, "Disgusting to look at");
    }
  }

  const positiveWords = [
    "love", "like", "good", "great", "nice", "awesome", "beautiful", "stunning", "cool",
    "wonderful", "amazing", "excellent", "superb", "brilliant", "fantastic", "cute",
    "happy", "joy", "friendly", "beautiful!", "perfect", "gorgeous", "lovely"
  ];
  
  const negativeWords = [
    "waste", "bad", "useless", "stupid", "idiot", "garbage", "trash", "hate", "terrible",
    "worst", "boring", "awful", "annoying", "pathetic", "loser", "dumb", "ugly", "fat",
    "creep", "pig", "suck", "sucks", "poor", "disappointing", "horrible", "mean", "rude",
    "harass", "bully", "pointless", "nonsense"
  ];

  const toxicPhrases = [
    "kill yourself", "go die", "nobody likes you", "hate you", 
    "worthless piece", "shut up", "everyone hates you", "you are garbage", 
    "ugly pig", "pathetic loser", "delete your account", "you are so stupid",
    "you're so stupid", "nobody cares", "no one cares about you",
    "nobody cares about you", "just disappear", "you should disappear",
    "you're useless", "go away", "never come back", "don't come back",
    "nobody wants you", "nobody loves you", "you are so useless", "even your excuses are pathetic",
    "when you open your mouth", "open your mouth", "stupidity comes out",
    "shut your mouth", "shut your face", "keep your mouth shut",
    "you have no brain", "brainless fool", "you look like a clown",
    "you make me sick", "delete your post", "nobody cares what you think"
  ];
  
  const toxicWords = {
    "idiot": 0.75, "idiotic": 0.75, "idiocy": 0.70, "loser": 0.70, "losers": 0.70,
    "dumb": 0.65, "dumbass": 0.80, "dumber": 0.65, "dumbest": 0.65,
    "ugly": 0.70, "ugliness": 0.70, "fat": 0.55, "fatty": 0.60,
    "trash": 0.65, "garbage": 0.65, "worthless": 0.80, "disgusting": 0.75,
    "stupid": 0.65, "stupidity": 0.75, "stupidly": 0.65, "freak": 0.70, "freaks": 0.70,
    "failure": 0.65, "pathetic": 0.75, "creep": 0.70, "creepy": 0.65, "pig": 0.65, "pigs": 0.65,
    "hate": 0.60, "hateful": 0.70, "useless": 0.70, "jerk": 0.65, "fool": 0.60, "foolish": 0.60,
    "moron": 0.75, "moronic": 0.75, "bastard": 0.85, "bitch": 0.85, "asshole": 0.85,
    "slut": 0.85, "whore": 0.85, "scum": 0.80, "clown": 0.60, "toxic": 0.65, "toxicity": 0.65,
    "brainless": 0.75, "bullshit": 0.75, "suck": 0.55, "sucks": 0.55, "eyesore": 0.70,
    "die": 0.85, "kill": 0.85, "repulsive": 0.75
  };

  const textToAnalyze = language === "English" ? clean : translatedText.toLowerCase();

  // 1. Toxicity Score Calculation
  let score = 0.05; // base rating for neutral text
  let phraseMatch = false;
  for (const phrase of toxicPhrases) {
    if (textToAnalyze.includes(phrase)) {
      phraseMatch = true;
      break;
    }
  }

  const words = textToAnalyze.split(/\W+/);

  if (phraseMatch) {
    score = 0.85;
  } else {
    let wordMatches = 0;
    let maxFoundWeight = 0.0;
    words.forEach(w => {
      if (toxicWords[w]) {
        maxFoundWeight = Math.max(maxFoundWeight, toxicWords[w]);
        score = Math.max(score, toxicWords[w]);
        wordMatches++;
      }
    });

    // Check for severe profanities / insults inside fused OCR tokens (e.g. stupidity, openyour, thisbitch, youidiot)
    Object.keys(toxicWords).forEach(tw => {
      if (toxicWords[tw] >= 0.6 && textToAnalyze.includes(tw)) {
        maxFoundWeight = Math.max(maxFoundWeight, toxicWords[tw]);
        score = Math.max(score, toxicWords[tw]);
        wordMatches++;
      }
    });

    if (maxFoundWeight >= 0.55) {
      score = maxFoundWeight;
    }

    if (wordMatches > 1) {
      score = Math.min(score + 0.1, 0.95);
    }
    // General negative count influence
    if (score <= 0.05) {
      let negCount = 0;
      words.forEach(w => {
        if (negativeWords.includes(w)) negCount++;
      });
      if (negCount > 0) {
        score = Math.min(0.12 + negCount * 0.08, 0.45);
      }
    }
  }

  score = parseFloat(score.toFixed(2));
  const isToxic = score >= 0.5;

  // 2. Sentiment Calculation
  let posCount = 0;
  let negCount = 0;
  words.forEach(w => {
    if (positiveWords.includes(w)) posCount++;
    if (negativeWords.includes(w)) negCount++;
  });

  // Handle specific negative sentiment phrases
  if (textToAnalyze.includes("waste of time") || textToAnalyze.includes("pointless")) {
    negCount += 2;
  }

  let sentimentLabel = "Neutral";
  let sentimentConfidence = 0.5;

  const cleanTrimmed = text.trim();
  if (cleanTrimmed.endsWith('?')) {
    sentimentLabel = "Neutral";
    sentimentConfidence = 0.95;
  } else if (cleanTrimmed.endsWith('!') && !isToxic) {
    sentimentLabel = "Positive";
    sentimentConfidence = 0.90;
  } else if (isToxic) {
    sentimentLabel = "Negative";
    sentimentConfidence = Math.max(0.75, score);
  } else if (negCount > posCount) {
    sentimentLabel = "Negative";
    sentimentConfidence = Math.min(0.5 + (negCount - posCount) * 0.15, 0.95);
  } else if (posCount > negCount) {
    sentimentLabel = "Positive";
    sentimentConfidence = Math.min(0.55 + (posCount - negCount) * 0.15, 0.98);
  } else {
    sentimentLabel = "Neutral";
    sentimentConfidence = 0.7;
  }
  sentimentConfidence = parseFloat(sentimentConfidence.toFixed(2));

  // 3. Emotion Selection
  let emotionLabel = "Neutral";
  let emotionConfidence = 0.85;

  if (textToAnalyze.includes("waste of time") || textToAnalyze.includes("boring") || textToAnalyze.includes("pointless")) {
    emotionLabel = "Sadness";
    emotionConfidence = 0.88;
  } else if (textToAnalyze.includes("hate") || textToAnalyze.includes("mad") || textToAnalyze.includes("angry") || textToAnalyze.includes("shut up")) {
    emotionLabel = "Anger";
    emotionConfidence = 0.93;
  } else if (textToAnalyze.includes("disgusting") || textToAnalyze.includes("gross") || textToAnalyze.includes("ugly") || textToAnalyze.includes("pig")) {
    emotionLabel = "Disgust";
    emotionConfidence = 0.91;
  } else if (textToAnalyze.includes("die") || textToAnalyze.includes("kill") || textToAnalyze.includes("afraid") || textToAnalyze.includes("scared")) {
    emotionLabel = "Fear";
    emotionConfidence = 0.9;
  } else if (posCount > 0) {
    emotionLabel = "Joy";
    emotionConfidence = Math.min(0.7 + posCount * 0.1, 0.95);
  } else if (negCount > 0) {
    emotionLabel = "Sadness";
    emotionConfidence = Math.min(0.7 + negCount * 0.1, 0.9);
  }
  emotionConfidence = parseFloat(emotionConfidence.toFixed(2));

  return {
    originalText: text,
    language: language,
    translatedText: translatedText,
    toxicityScore: score,
    isToxic: isToxic,
    toxicity: {
      label: isToxic ? "TOXIC" : "NON_TOXIC",
      score: score
    },
    sentiment: {
      label: sentimentLabel,
      confidence: sentimentConfidence
    },
    emotion: {
      emotion: emotionLabel,
      confidence: emotionConfidence
    }
  };
};

// Calculate consecutive days on client side
const calculateConsecutiveDaysClient = (timestamps) => {
  if (timestamps.length === 0) return 0;
  const dates = [...new Set(timestamps.map(ts => new Date(ts).toDateString()))]
    .map(d => new Date(d))
    .sort((a, b) => a - b);
    
  let maxConsec = 1;
  let currentConsec = 1;
  for (let i = 1; i < dates.length; i++) {
    const diffTime = Math.abs(dates[i] - dates[i-1]);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      currentConsec++;
    } else {
      maxConsec = Math.max(maxConsec, currentConsec);
      currentConsec = 1;
    }
  }
  return Math.max(maxConsec, currentConsec);
};

const cleanClientOcrText = (rawText) => {
  if (!rawText) return '';
  // Remove non-printable control characters
  let text = rawText.replace(/[\x00-\x1F\x7F]/g, ' ');
  const tokens = text.split(/\s+/).filter(tok => {
    // Keep Indic tokens
    if (/[\u0B80-\u0BFF\u0900-\u097F]/.test(tok)) return true;
    // Strip purely symbol noise tokens (e.g. '|', '{', '}', '%', '«', '»', '—', '=')
    const cleanWord = tok.replace(/[^A-Za-z0-9]/g, '');
    if (cleanWord.length >= 2) return true;
    if (['a', 'i', 'to', 'in', 'on', 'at', 'is', 'no', 'so', 'my', 'he', 'we', 'or', 'me', 'us'].includes(cleanWord.toLowerCase())) return true;
    return false;
  });
  return tokens.join(' ').trim();
};

const prepareOcrImage = (imageSource) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const scale = Math.min(2.0, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    resolve(canvas);
  };
  image.onerror = reject;
  image.src = imageSource;
});

// Main API handlers with fallback
export const api = {
  getAiStatus: () => {
    return {
      isLoading: isModelLoading,
      status: modelLoadingStatus,
      isReady: isModelReady()
    };
  },

  // Use several English page layouts because text in photos is often sparse
  // and surrounded by unrelated visual detail.
  performClientOcr: async (imageSource) => {
    try {
      const imageResponse = await fetch(imageSource);
      const imageBlob = await imageResponse.blob();
      const formData = new FormData();
      formData.append('file', imageBlob, 'ocr-image');
      const backendOcr = await fetch(`${BACKEND_URL}/api/ocr-image`, {
        method: 'POST',
        body: formData
      });
      if (backendOcr.ok) {
        const result = await backendOcr.json();
        if (result.extractedText && result.extractedText.trim()) {
          return result.extractedText.trim();
        }
      }
    } catch (backendOcrError) {
      console.warn("EasyOCR backend unavailable, using browser OCR:", backendOcrError);
    }

    try {
      const enhancedSource = await prepareOcrImage(imageSource);
      const englishCandidates = [];
      for (const [source, pageMode] of [
        [imageSource, 3],
        [enhancedSource, 11],
        [imageSource, 6]
      ]) {
        try {
          const result = await Tesseract.recognize(source, 'eng', {
            logger: m => console.log('Tesseract OCR:', m.status, Math.round((m.progress || 0) * 100) + '%'),
            config: { tessedit_pageseg_mode: pageMode }
          });
          const rawText = result.data && result.data.text ? result.data.text.trim() : '';
          const cleanedText = cleanClientOcrText(rawText);
          if (cleanedText) {
            const confidence = Number(result.data.confidence) || 0;
            const validWords = (cleanedText.match(/[A-Za-z]{3,}/g) || []).length;
            englishCandidates.push({ text: cleanedText, score: confidence * 0.5 + validWords * 10 });
          }
        } catch (e) {
          // ignore single pageMode error
        }
      }
      englishCandidates.sort((first, second) => second.score - first.score);
      const englishText = englishCandidates[0] ? englishCandidates[0].text : '';

      // Check Indic text
      let multilingualText = '';
      try {
        const multilingualResult = await Tesseract.recognize(enhancedSource, 'eng+tam+hin');
        multilingualText = multilingualResult.data && multilingualResult.data.text
          ? cleanClientOcrText(multilingualResult.data.text.trim())
          : '';
      } catch (e) {
        // Indic language pack might not be loaded in browser
      }

      const indicCharacterCount = [...multilingualText].filter(character => {
        const codePoint = character.charCodeAt(0);
        return (codePoint >= 0x0B80 && codePoint <= 0x0BFF)
          || (codePoint >= 0x0900 && codePoint <= 0x097F);
      }).length;
      const hasMeaningfulIndicText = indicCharacterCount >= 4;
      if (!englishText && hasMeaningfulIndicText) {
        return multilingualText;
      }
      return englishText || (hasMeaningfulIndicText ? multilingualText : '');
    } catch (err) {
      console.warn("OCR fallback to English:", err);
      try {
        const { data } = await Tesseract.recognize(imageSource, 'eng');
        return (data && data.text) ? cleanClientOcrText(data.text.trim()) : '';
      } catch (e2) {
        console.error("Browser OCR failed:", e2);
        return '';
      }
    }
  },

  // Analyze Text/Comment for Toxicity
  analyzeComment: async (text) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const data = await res.json();
        const isToxic = data.label === 'TOXIC' || (data.score && data.score >= 0.5);
        return {
          isToxic,
          toxicityScore: data.score || 0.0,
          label: data.label,
          sentiment: { label: isToxic ? "Negative" : "Positive" },
          emotion: { emotion: isToxic ? "Anger" : "Joy" }
        };
      }
    } catch (err) {
      console.warn("Backend toxicity endpoint unavailable, using client analysis...", err);
    }
    return analyzeToxicityClient(text);
  },

  analyzeToxicity: async (text) => {
    return api.analyzeComment(text);
  },

  // Analyze Image for Toxicity & Harassment (Visual + OCR Text)
  analyzeImage: async (fileOrBase64, clientExtractedText = '') => {
    let textToAnalyze = (clientExtractedText || '').trim();

    // 1. Try Backend Safety Endpoint
    try {
      let res;
      if (typeof fileOrBase64 === 'string') {
        // Base64 JSON request
        res = await fetch(`${BACKEND_URL}/api/analyze-image-json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_base64: fileOrBase64,
            extracted_text: textToAnalyze
          })
        });
      } else {
        // FormData multipart request
        const formData = new FormData();
        formData.append('file', fileOrBase64);
        if (textToAnalyze) {
          formData.append('extracted_text', textToAnalyze);
        }
        res = await fetch(`${BACKEND_URL}/api/analyze-image`, {
          method: 'POST',
          body: formData
        });
      }

      if (res && res.ok) {
        const data = await res.json();
        // If backend blocked the image or extracted text, return backend decision
        if (data && (!data.allowed || data.result === 'Toxic' || (data.extractedText && data.extractedText.trim()))) {
          return data;
        }

        // If backend returned safe but didn't detect any text, double check with browser OCR
        if (typeof fileOrBase64 === 'string') {
          const localText = await api.performClientOcr(fileOrBase64);
          if (localText && localText.trim()) {
            const localAnalysis = analyzeToxicityClient(localText);
            if (localAnalysis.isToxic) {
              return {
                allowed: false,
                result: "Toxic",
                confidence: Math.max(localAnalysis.toxicityScore, 0.88),
                reason: `Toxic text detected in image: '${localText}'`,
                extractedText: localText,
                language: localAnalysis.language,
                translatedText: localAnalysis.translatedText,
                toxicityScore: localAnalysis.toxicityScore
              };
            }
            return {
              ...data,
              extractedText: localText,
              language: localAnalysis.language
            };
          }
        }
        return data;
      }
    } catch (err) {
      console.warn("Backend image analysis failed/offline, running client-side fallback...", err);
    }

    // 2. Client-side Fallback Evaluation (Browser Tesseract OCR + Local Toxicity Engine)
    if (!textToAnalyze && typeof fileOrBase64 === 'string') {
      try {
        textToAnalyze = await api.performClientOcr(fileOrBase64);
      } catch (ocrErr) {
        console.warn("Client OCR failed:", ocrErr);
      }
    }

    if (textToAnalyze) {
      const textAnalysis = analyzeToxicityClient(textToAnalyze);
      const isToxic = textAnalysis.isToxic;
      const toxScore = textAnalysis.toxicityScore;
      if (isToxic) {
        return {
          allowed: false,
          result: "Toxic",
          confidence: Math.max(toxScore, 0.88),
          reason: `Toxic text detected in image: '${textToAnalyze}'`,
          extractedText: textToAnalyze,
          language: textAnalysis.language,
          translatedText: textAnalysis.translatedText,
          toxicityScore: toxScore
        };
      }
      return {
        allowed: true,
        result: "Not Toxic",
        confidence: 0.95,
        reason: "No harmful content detected",
        extractedText: textToAnalyze,
        language: textAnalysis.language,
        translatedText: textAnalysis.translatedText,
        toxicityScore: toxScore
      };
    }

    return {
      allowed: true,
      result: "Not Toxic",
      confidence: 0.95,
      reason: "No harmful content detected",
      extractedText: "",
      language: "English",
      toxicityScore: 0.02
    };
  },

  // Uploaded photo assets from Photo folder
  PHOTO_ASSETS,

  // GET /posts
  getPosts: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/posts`);
      if (!res.ok) throw new Error('Backend failed');
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn("Backend offline, loading mock posts fallback...", err);
      return [...MOCK_POSTS];
    }
  },

  getImageReports: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/admin/image-reports`);
      if (!res.ok) throw new Error('Backend failed');
      return await res.json();
    } catch (err) {
      const posts = await api.getPosts();
      const reasons = ['Harassment or bullying', 'Hate speech or symbols', 'Violence or dangerous content', 'Spam or misleading content', 'Inappropriate content'];
      const demoReports = posts.slice(0, 6).map((post, index) => ({
        reportId: `local-report-${index}`,
        postId: post.postId,
        postImage: post.postImage,
        reportedAccount: post.username,
        reportingAccount: ['anjali_art', 'john_smith', 'foodie_girl'][index % 3],
        reason: reasons[index % reasons.length],
        aiResult: index % 3 === 0 ? 'Harassment detected' : index % 3 === 1 ? 'No harmful content detected' : 'Inappropriate content detected',
        aiCategory: ['harassment', 'safe', 'inappropriate', 'spam', 'hate', 'violence'][index],
        aiConfidence: [0.94, 0.88, 0.79, 0.71, 0.91, 0.67][index],
        severity: ['High', 'Low', 'Medium', 'Medium', 'High', 'Low'][index],
        status: index < 4 ? 'Pending' : 'Resolved',
        createdAt: new Date(Date.now() - index * 86400000).toISOString(),
        resolutionHours: index < 4 ? null : 6 + index
      }));
      return [...getLocalImageReports(), ...demoReports];
    }
  },

  updateImageReport: async (reportId, status, deleteImage = false, postId = '') => {
    try {
      const res = await fetch(`${BACKEND_URL}/admin/image-reports/${reportId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, deleteImage, postId })
      });
      if (res.ok) {
        const data = await res.json();
        if (deleteImage && postId && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('post-deleted', { detail: { postId } }));
        }
        return data;
      }
    } catch (err) {
      console.warn('Backend unavailable while updating image report.', err);
    }
    if (deleteImage && postId) {
      deleteLocalPost(postId);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('post-deleted', { detail: { postId } }));
      }
    }
    return { status: 'success' };
  },

  getNotifications: async (username) => {
    try {
      const res = await fetch(`${BACKEND_URL}/notifications/${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error('Backend failed');
      return await res.json();
    } catch (err) {
      return getLocalNotifications(username);
    }
  },

  repostPost: async ({ postId, reposter }) => {
    try {
      const res = await fetch(`${BACKEND_URL}/reposts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, reposter })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not repost post');
      return data;
    } catch (err) {
      if (err.message !== 'Failed to fetch') throw err;
      const post = MOCK_POSTS.find(item => item.postId === postId);
      if (!post) throw new Error('Post not found');
      const repost = addLocalRepost({ repostId: '', postId, reposter, originalOwner: post.username, postImage: post.postImage, caption: post.caption });
      addLocalNotification({ recipientUsername: post.username, actorUsername: reposter, type: 'repost', message: 'reposted your post', postId, postOwner: post.username, postImage: post.postImage, read: false });
      return repost;
    }
  },

  getAdminReposts: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/admin/reposts`);
      if (!res.ok) throw new Error('Backend failed');
      return await res.json();
    } catch (err) {
      return getLocalReposts();
    }
  },

  markNotificationRead: async (notificationId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/notifications/${notificationId}/read`, { method: 'PATCH' });
      if (res.ok) return await res.json();
    } catch (err) {
      // Use the local fallback below when the backend is unavailable.
    }
    markLocalNotificationRead(notificationId);
    return { status: 'success' };
  },

  markAllNotificationsRead: async (username) => {
    try {
      const res = await fetch(`${BACKEND_URL}/notifications/${encodeURIComponent(username)}/read-all`, { method: 'PATCH' });
      if (res.ok) return await res.json();
    } catch (err) {
      // Use the local fallback below when the backend is unavailable.
    }
    markAllLocalNotificationsRead(username);
    return { status: 'success' };
  },

  reportPost: async ({ postId, reporter, reason, postOwner, postImage }) => {
    try {
      const res = await fetch(`${BACKEND_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, reporter, reason })
      });
      const data = await res.json();
      if (!res.ok) {
        const backendError = new Error(data.detail || 'Could not submit report');
        backendError.code = res.status;
        throw backendError;
      }
      return data;
    } catch (err) {
      if (err.code !== 404 && err.code !== 500 && err.message !== 'Failed to fetch') throw err;
      const post = MOCK_POSTS.find(item => item.postId === postId);
      const owner = postOwner || post?.username;
      const image = postImage || post?.postImage || '';
      addLocalImageReport({ postId, postImage: image, reportedAccount: owner || 'unknown', reportingAccount: reporter, reason, aiResult: 'Pending AI analysis', aiCategory: 'inappropriate', aiConfidence: 0, severity: 'Medium' });
      if (owner) {
        addLocalNotification({ recipientUsername: owner, actorUsername: 'Safety Team', type: 'report', message: `your post was reported: ${reason}`, postId, postOwner: owner, postImage: image, read: false });
      }
      addLocalNotification({ recipientUsername: reporter, actorUsername: 'Safety Team', type: 'report', message: `your report was submitted: ${reason}`, postId, postOwner: owner, postImage: image, read: false });
      return { status: 'success', message: 'Report submitted successfully.' };
    }
  },

  // POST /posts (Create a new post)
  createPost: async (postData) => {
    try {
      const res = await fetch(`${BACKEND_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      if (res.status === 403 || res.status === 400) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Could not create post');
      }
      if (!res.ok) throw new Error('Backend failed');
      return await res.json();
    } catch (err) {
      console.warn("Backend offline, creating post locally in mockData...", err);
      const localPost = {
        postId: `post_${Date.now()}`,
        username: postData.username,
        profilePic: `https://api.dicebear.com/7.x/adventurer/svg?seed=${postData.username}`,
        location: postData.location || "World",
        postImage: postData.postImage,
        caption: postData.caption || "",
        likes: 0,
        timestamp: new Date().toISOString()
      };
      return addLocalPost(localPost);
    }
  },

  // DELETE /posts/{id} (Permanently deletes post and all associated references)
  deletePost: async (postId, username) => {
    try {
      const query = username ? `?username=${encodeURIComponent(username)}` : '';
      const res = await fetch(`${BACKEND_URL}/posts/${postId}${query}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn("Backend returned error deleting post:", errData);
      }
    } catch (err) {
      console.warn("Backend delete endpoint not reachable, updating local memory...", err);
    }
    
    // Always clean local storage fallback memory as well
    deleteLocalPost(postId);
    
    // Dispatch global custom event so all active components remove it instantly
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('post-deleted', { detail: { postId } }));
    }
    
    return { status: "success", message: "Post and all related data permanently deleted." };
  },

  // POST /comments
  createComment: async (postId, commentBy, commentText) => {
    // 1. Run browser-local Hugging Face models if they are ready to get high-fidelity analysis
    let clientAnalysis = null;
    if (isModelReady()) {
      try {
        clientAnalysis = await runAiPipeline(commentText);
      } catch (pipelineErr) {
        console.warn("Transformers.js client analysis failed:", pipelineErr);
      }
    }

    try {
      const payload = {
        postId,
        commentBy,
        commentText,
        ...(clientAnalysis ? {
          language: clientAnalysis.language,
          translatedText: clientAnalysis.translatedText,
          toxicityScore: clientAnalysis.toxicityScore,
          isToxic: clientAnalysis.isToxic,
          toxicity: clientAnalysis.toxicity,
          sentiment: clientAnalysis.sentiment,
          emotion: clientAnalysis.emotion
        } : {})
      };

      const res = await fetch(`${BACKEND_URL}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.status === 403) {
        const data = await res.json();
        throw new Error(data.detail);
      }
      if (!res.ok) throw new Error('Backend failed');
      return await res.json();
    } catch (err) {
      // If warning from backend server, propagate it
      if (err.message.includes("suspended")) {
        throw err;
      }
      console.warn("Backend offline, saving comment to local memory...", err);
      
      const user = getLocalUsers().find(u => u.username === commentBy.toLowerCase());
      if (user && user.status === "Suspended") {
        throw new Error("Your account has been suspended by a moderator for repeated harassment.");
      }

      const post = MOCK_POSTS.find(p => p.postId === postId);
      const postOwner = post ? post.username : "unknown";
      
      let analysis = clientAnalysis;
      if (!analysis) {
        try {
          analysis = await runAiPipeline(commentText);
        } catch (pipelineErr) {
          console.warn("Transformers.js in-browser NMT/classification failed, using local keyword fallback...", pipelineErr);
          analysis = analyzeToxicityClient(commentText);
        }
      }

      const localComment = {
        commentId: `c_local_${Date.now()}`,
        postId,
        commentBy: commentBy.toLowerCase(),
        commentTo: postOwner,
        commentText,
        ...analysis,
        timestamp: new Date().toISOString()
      };

      return addLocalComment(localComment);
    }
  },

  // GET /comments
  getComments: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.commentBy) queryParams.append('commentBy', filters.commentBy);
      if (filters.commentTo) queryParams.append('commentTo', filters.commentTo);
      if (filters.isToxic !== undefined) queryParams.append('isToxic', filters.isToxic);
      if (filters.query) queryParams.append('query', filters.query);

      const res = await fetch(`${BACKEND_URL}/comments?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Backend failed');
      return await res.json();
    } catch (err) {
      console.warn("Backend offline, loading comments from local memory...", err);
      let comments = getLocalComments();
      if (filters.commentBy) {
        comments = comments.filter(c => c.commentBy === filters.commentBy.toLowerCase());
      }
      if (filters.commentTo) {
        comments = comments.filter(c => c.commentTo === filters.commentTo.toLowerCase());
      }
      if (filters.isToxic !== undefined) {
        comments = comments.filter(c => c.isToxic === filters.isToxic);
      }
      if (filters.query) {
        comments = comments.filter(c => c.commentText.toLowerCase().includes(filters.query.toLowerCase()));
      }
      return comments;
    }
  },

  // GET /users
  getUsers: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/users`);
      if (!res.ok) throw new Error('Backend failed');
      return await res.json();
    } catch (err) {
      console.warn("Backend offline, loading users from local memory...", err);
      return getLocalUsers();
    }
  },

  // GET /user/{username}
  getUserProfile: async (username) => {
    try {
      const res = await fetch(`${BACKEND_URL}/user/${username}`);
      if (!res.ok) throw new Error('Backend failed');
      return await res.json();
    } catch (err) {
      console.warn("Backend offline, loading profile from local memory...", err);
      const user = getLocalUsers().find(u => u.username === username.toLowerCase());
      if (!user) throw new Error("User profile not found");

      const posts = MOCK_POSTS.filter(p => p.username === username.toLowerCase());
      const comments = getLocalComments().filter(c => c.commentBy === username.toLowerCase());
      
      const toxicComments = comments.filter(c => c.isToxic);
      const toxicPercentage = comments.length ? parseFloat((toxicComments.length / comments.length * 100).toFixed(1)) : 0.0;

      const victims = {};
      toxicComments.forEach(c => {
        if (c.commentTo) {
          victims[c.commentTo] = (victims[c.commentTo] || 0) + 1;
        }
      });
      const victimsTargeted = Object.keys(victims).map(v => ({ username: v, count: victims[v] }))
        .sort((a, b) => b.count - a.count);

      // Generate 7-day timeline
      const now = new Date();
      const timelineMap = {};
      for (let i = 0; i < 7; i++) {
        const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timelineMap[day] = { total: 0, toxic: 0 };
      }
      comments.forEach(c => {
        const day = c.timestamp.split('T')[0];
        if (timelineMap[day]) {
          timelineMap[day].total++;
          if (c.isToxic) timelineMap[day].toxic++;
        }
      });
      const timeline = Object.keys(timelineMap).sort().map(d => ({
        date: d,
        total: timelineMap[d].total,
        toxic: timelineMap[d].toxic
      }));

      return {
        profile: user,
        posts,
        comments,
        toxicPercentage,
        victimsTargeted,
        recentToxicComments: toxicComments.slice(0, 10),
        timeline
      };
    }
  },

  // GET /moderator/{username}
  getModeratorSummary: async (username) => {
    try {
      const res = await fetch(`${BACKEND_URL}/moderator/${username}`);
      if (!res.ok) throw new Error('Backend failed');
      return await res.json();
    } catch (err) {
      console.warn("Backend offline, generating moderator summary from local memory...", err);
      const user = getLocalUsers().find(u => u.username === username.toLowerCase());
      if (!user) throw new Error("User not found");

      const comments = getLocalComments().filter(c => c.commentBy === username.toLowerCase());
      const toxicComments = comments.filter(c => c.isToxic);

      // Threat risk calculations
      const totalCount = comments.length;
      const toxicRatio = totalCount ? (toxicComments.length / totalCount) * 100 : 0;
      const avgToxicity = totalCount ? (comments.reduce((sum, c) => sum + c.toxicityScore, 0) / totalCount) * 100 : 0;

      // Frequency calculation (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentToxic = toxicComments.filter(c => new Date(c.timestamp) >= sevenDaysAgo);
      const frequencyScore = Math.min((recentToxic.length / 10) * 100, 100);

      // Consecutive days
      const consecutiveDays = calculateConsecutiveDaysClient(toxicComments.map(c => c.timestamp));
      const consecutiveScore = Math.min((consecutiveDays / 5) * 100, 100);

      const riskScore = parseFloat((
        (0.40 * toxicRatio) +
        (0.25 * avgToxicity) +
        (0.20 * frequencyScore) +
        (0.15 * consecutiveScore)
      ).toFixed(1));

      let riskLevel = "Low";
      if (riskScore >= 75) riskLevel = "Critical";
      else if (riskScore >= 50) riskLevel = "High";
      else if (riskScore >= 25) riskLevel = "Medium";

      // Victim targeted breakdown
      const victimMap = {};
      toxicComments.forEach(c => {
        if (c.commentTo) {
          victimMap[c.commentTo] = (victimMap[c.commentTo] || 0) + 1;
        }
      });
      const victimAnalysis = Object.keys(victimMap).map(v => ({ username: v, toxicCount: victimMap[v] }))
        .sort((a, b) => b.toxicCount - a.toxicCount);

      // Repeated harassment logic (at least 3 toxic comments to same person in 7 days)
      let repeatedDetected = false;
      let repeatedReason = "";
      
      const toxicByTarget = {};
      toxicComments.forEach(c => {
        if (c.commentTo) {
          if (!toxicByTarget[c.commentTo]) toxicByTarget[c.commentTo] = [];
          toxicByTarget[c.commentTo].push(c);
        }
      });

      for (const target in toxicByTarget) {
        const sorted = toxicByTarget[target].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
        for (let i = 0; i < sorted.length; i++) {
          const start = new Date(sorted[i].timestamp);
          const limit = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
          const window = sorted.slice(i).filter(c => new Date(c.timestamp) <= limit);
          if (window.length >= 3) {
            repeatedDetected = true;
            const daysSpan = Math.max(1, Math.ceil(Math.abs(new Date(window[window.length-1].timestamp) - new Date(window[0].timestamp)) / (1000 * 60 * 60 * 24)));
            repeatedReason = `Repeatedly targeted ${target} - ${window.length} toxic comments within ${daysSpan} days`;
            break;
          }
        }
        if (repeatedDetected) break;
      }

      // Generate 14-day timeline
      const now = new Date();
      const timelineMap = {};
      for (let i = 0; i < 14; i++) {
        const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timelineMap[day] = { total: 0, toxic: 0 };
      }
      comments.forEach(c => {
        const day = c.timestamp.split('T')[0];
        if (timelineMap[day]) {
          timelineMap[day].total++;
          if (c.isToxic) timelineMap[day].toxic++;
        }
      });
      const timeline = Object.keys(timelineMap).sort().map(d => ({
        date: d,
        total: timelineMap[d].total,
        toxic: timelineMap[d].toxic
      }));

      // Logs
      const logs = getLocalLogs().filter(log => log.targetUser === username.toLowerCase());

      return {
        profile: user,
        metrics: {
          totalComments: totalCount,
          toxicCommentsCount: toxicComments.length,
          toxicRatio: parseFloat(toxicRatio.toFixed(1)),
          averageToxicity: parseFloat((avgToxicity / 100).toFixed(2)) * 100, // scaled properly
          frequencyScore: parseFloat(frequencyScore.toFixed(1)),
          consecutiveDays,
          riskScore,
          riskLevel
        },
        repeatedHarassment: {
          detected: repeatedDetected,
          reason: repeatedReason
        },
        victimAnalysis,
        timeline,
        commentsHistory: comments,
        logs
      };
    }
  },

  // DELETE /comment/{id} (Permanently deletes text comment)
  deleteComment: async (commentId, username) => {
    try {
      const query = username ? `?username=${encodeURIComponent(username)}` : '';
      const res = await fetch(`${BACKEND_URL}/comment/${commentId}${query}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn("Backend returned error deleting comment:", errData);
      }
    } catch (err) {
      console.warn("Backend offline, deleting comment from local memory...", err);
    }
    
    // Always delete from local fallback memory
    deleteLocalComment(commentId);
    
    // Dispatch global event so all components remove the comment immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('comment-deleted', { detail: { commentId } }));
    }
    
    return { status: "success", message: "Comment permanently deleted." };
  },

  // POST /warn
  warnUser: async (username, reason, details) => {
    try {
      const res = await fetch(`${BACKEND_URL}/warn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, reason, details })
      });
      if (!res.ok) throw new Error('Backend failed');
      return await res.json();
    } catch (err) {
      console.warn("Backend offline, warning user locally...", err);
      warnLocalUser(username, reason, details);
      return { status: "success", message: "Warned locally" };
    }
  },

  // POST /suspend
  suspendUser: async (username, reason, details) => {
    try {
      const res = await fetch(`${BACKEND_URL}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, reason, details })
      });
      if (!res.ok) throw new Error('Backend failed');
      return await res.json();
    } catch (err) {
      console.warn("Backend offline, suspending user locally...", err);
      suspendLocalUser(username, reason, details);
      return { status: "success", message: "Suspended locally" };
    }
  },

  // POST /unsuspend
  unsuspendUser: async (username, reason, details) => {
    try {
      const res = await fetch(`${BACKEND_URL}/unsuspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, reason, details })
      });
      if (!res.ok) throw new Error('Backend failed');
      return await res.json();
    } catch (err) {
      console.warn("Backend offline, unsuspending user locally...", err);
      unsuspendLocalUser(username, reason, details);
      return { status: "success", message: "Unsuspended locally" };
    }
  },

  // POST /unwarn
  unwarnUser: async (username, reason, details) => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`warn_acknowledged_${username}`);
        localStorage.removeItem(`warn_acknowledged_${username}`);
      }
      const res = await fetch(`${BACKEND_URL}/unwarn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, reason: reason || 'Warning revoked by moderator', details: details || '' })
      });
      if (!res.ok) throw new Error('Backend failed');
      return await res.json();
    } catch (err) {
      console.warn("Backend offline, unwarning user locally...", err);
      unwarnLocalUser(username, reason, details);
      return { status: "success", message: "Unwarned locally" };
    }
  },

  // POST /acknowledge
  acknowledgeWarning: async (username) => {
    try {
      const res = await fetch(`${BACKEND_URL}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, reason: 'Acknowledged warning', details: '' })
      });
      if (!res.ok) throw new Error('Backend failed');
      return await res.json();
    } catch (err) {
      console.warn("Backend offline, acknowledging warning locally...", err);
      const localUsers = getLocalUsers();
      const found = localUsers.find(u => u.username === username.toLowerCase());
      if (found) {
        found.status = "Warned";
      }
      return { status: "success", message: "Warning dismissed locally." };
    }
  }
};
