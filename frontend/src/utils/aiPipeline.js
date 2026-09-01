import { pipeline, env } from '@xenova/transformers';

// Configure local model serving to load directly from our local Vite dev server
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = '/models/';

// Bypass browser cache for local model fetches to avoid stale cache results
const originalFetch = window.fetch;
env.fetch = async (url, options) => {
  if (typeof url === 'string' && url.includes('models/')) {
    const separator = url.includes('?') ? '&' : '?';
    const cbUrl = `${url}${separator}cb=${Date.now()}`;
    return originalFetch(cbUrl, {
      ...options,
      cache: 'no-cache'
    });
  }
  return originalFetch(url, options);
};

let tamilTranslatorInstance = null;
let hindiTranslatorInstance = null;
let toxicityInstance = null;
let sentimentInstance = null;

let loadingPromise = null;
export let isModelLoading = false;
export let modelLoadingStatus = "";

export const loadPipelineModels = async (onProgress) => {
  // Browser-side models are disabled to prioritize native deep learning execution on the Python backend.
  isModelLoading = false;
  modelLoadingStatus = "";
  return Promise.resolve();
};

export const isModelReady = () => {
  return false;
};

export const runAiPipeline = async (text) => {
  // 1. Script-based automatic language detection
  const latinChars = (text.match(/[A-Za-z]/g) || []).length;
  const tamilChars = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
  const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;

  let language = "English";
  if (latinChars >= 2 && latinChars >= hindiChars && latinChars >= tamilChars) {
    language = "English";
  } else if (hindiChars >= 2 && hindiChars > latinChars && hindiChars >= tamilChars) {
    language = "Hindi";
  } else if (tamilChars >= 2 && tamilChars > latinChars && tamilChars > hindiChars) {
    language = "Tamil";
  }

  // Check if models are fully loaded; if not, fail fast to use regex fallback
  if (!tamilTranslatorInstance || !hindiTranslatorInstance || !toxicityInstance || !sentimentInstance) {
    throw new Error("Hugging Face models are still loading in the background.");
  }

  // 2. Neural Machine Translation
  let translatedText = text;
  if (language !== "English") {
    console.info(`[NMT] Translating: detected_language=${language} via specialized OPUS model`);
    console.info(`[NMT] Original Text: "${text}"`);
    
    let translationResult;
    try {
      if (language === "Tamil") {
        translationResult = await tamilTranslatorInstance(">>eng<< " + text);
      } else {
        translationResult = await hindiTranslatorInstance(text);
      }
    } catch (transErr) {
      console.error(`[NMT] Translation failed:`, transErr);
      throw new Error(`Translation failed for language: ${language}. Error: ${transErr.message}`);
    }
    
    if (!translationResult || !translationResult[0] || !translationResult[0].translation_text) {
      throw new Error(`Translation model returned empty output for language: ${language}`);
    }
    
    translatedText = translationResult[0].translation_text;
    
    console.info(`[NMT] Raw Model Output:`, JSON.stringify(translationResult));
    console.info(`[NMT] Final Translated Text: "${translatedText}"`);
  }

  const targetText = translatedText;

  // 3. Toxicity Classification
  const toxicityAll = await toxicityInstance(targetText, { topk: null });
  const toxicScore = toxicityAll.find(item => item.label === 'toxic' || item.label === 'LABEL_0')?.score || 0.01;
  const isToxic = toxicScore >= 0.45;

  // 4. Sentiment Classification (SST-2)
  const sentimentAll = await sentimentInstance(targetText, { topk: null });
  let bestSentiment = sentimentAll[0];
  sentimentAll.forEach(s => {
    if (s.score > bestSentiment.score) bestSentiment = s;
  });
  
  let sentimentLabel = (bestSentiment.label === 'LABEL_1' || bestSentiment.label.toLowerCase() === 'positive') ? 'Positive' : 'Negative';
  let sentimentConfidence = bestSentiment.score;

  // Custom User Overrides: questions ending with '?' are Neutral; exclamation '!' are Positive (if not toxic)
  const cleanTrimmed = text.trim();
  if (cleanTrimmed.endsWith('?')) {
    sentimentLabel = 'Neutral';
    sentimentConfidence = 0.95;
  } else if (cleanTrimmed.endsWith('!') && !isToxic) {
    sentimentLabel = 'Positive';
    sentimentConfidence = 0.90;
  }

  // 5. Dynamic Emotion Mapping
  let emotionLabel = "Neutral";
  let emotionConfidence = 0.85;

  if (isToxic) {
    emotionLabel = "Anger";
    emotionConfidence = parseFloat(toxicScore.toFixed(4));
  } else if (sentimentLabel === "Negative") {
    const lowerText = targetText.toLowerCase();
    if (lowerText.includes("scared") || lowerText.includes("afraid") || lowerText.includes("terrified") || lowerText.includes("fear")) {
      emotionLabel = "Fear";
    } else if (lowerText.includes("disgust") || lowerText.includes("gross") || lowerText.includes("ugly")) {
      emotionLabel = "Disgust";
    } else {
      emotionLabel = "Sadness";
    }
    emotionConfidence = parseFloat(sentimentConfidence.toFixed(4));
  } else if (sentimentLabel === "Positive") {
    const lowerText = targetText.toLowerCase();
    if (lowerText.includes("love") || lowerText.includes("adore")) {
      emotionLabel = "Love";
    } else if (lowerText.includes("wow") || lowerText.includes("surprise") || lowerText.includes("shock")) {
      emotionLabel = "Surprise";
    } else {
      emotionLabel = "Joy";
    }
    emotionConfidence = parseFloat(sentimentConfidence.toFixed(4));
  }

  return {
    originalText: text,
    language: language,
    translatedText: translatedText,
    toxicityScore: parseFloat(toxicScore.toFixed(4)),
    isToxic: isToxic,
    toxicity: {
      label: isToxic ? "TOXIC" : "NON_TOXIC",
      score: parseFloat(toxicScore.toFixed(4))
    },
    sentiment: {
      label: sentimentLabel,
      confidence: parseFloat(sentimentConfidence.toFixed(4))
    },
    emotion: {
      emotion: emotionLabel,
      confidence: parseFloat(emotionConfidence.toFixed(4))
    }
  };
};
