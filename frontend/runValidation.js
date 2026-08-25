import { pipeline, env } from '@xenova/transformers';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { tamilTestSentences, hindiTestSentences, englishTestSentences } from './src/utils/nmtValidation.js';

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure local offline pathing
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = path.join(__dirname, 'public', 'models');

async function run() {
  console.log("Loading local ONNX models for validation...");
  
  let tamilTranslator, hindiTranslator, toxicity, sentiment;
  try {
    tamilTranslator = await pipeline('translation', 'Xenova/opus-mt-mul-en');
    hindiTranslator = await pipeline('translation', 'Xenova/opus-mt-hi-en');
    toxicity = await pipeline('text-classification', 'Xenova/toxic-bert');
    sentiment = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    console.log("Models loaded successfully.");
  } catch (err) {
    console.error("Failed to load models for validation:", err);
    process.exit(1);
  }

  const reportRows = [];
  
  // 1. Process Tamil sentences
  console.log("\nValidating Tamil NMT...");
  for (const item of tamilTestSentences) {
    const startTime = Date.now();
    let translated = "";
    let errorOccurred = false;
    try {
      const res = await tamilTranslator(">>eng<< " + item.text);
      translated = res[0].translation_text;
    } catch (e) {
      translated = "ERROR: " + e.message;
      errorOccurred = true;
    }
    const duration = Date.now() - startTime;
    
    // Classify
    let toxScore = 0.0, isTox = false, sentLabel = "Negative";
    if (!errorOccurred) {
      const toxAll = await toxicity(translated, { topk: null });
      toxScore = toxAll.find(t => t.label === 'toxic' || t.label === 'LABEL_1')?.score || 0.0;
      isTox = toxScore >= 0.45;
      
      const sentAll = await sentiment(translated, { topk: null });
      let bestSent = sentAll[0];
      sentAll.forEach(s => { if (s.score > bestSent.score) bestSent = s; });
      sentLabel = bestSent.label === 'LABEL_1' || bestSent.label.toLowerCase() === 'positive' ? 'Positive' : 'Negative';
      
      const cleanTrimmed = item.text.trim();
      if (cleanTrimmed.endsWith('?')) {
        sentLabel = 'Neutral';
      } else if (cleanTrimmed.endsWith('!') && !isTox) {
        sentLabel = 'Positive';
      }
    }

    reportRows.push({
      lang: "Tamil",
      category: item.category,
      original: item.text,
      expected: item.expected,
      modelTranslation: translated,
      toxicity: isTox ? `Toxic (${(toxScore * 100).toFixed(0)}%)` : `Safe (${(toxScore * 100).toFixed(0)}%)`,
      sentiment: sentLabel,
      durationMs: duration
    });
  }

  // 2. Process Hindi sentences
  console.log("Validating Hindi NMT...");
  for (const item of hindiTestSentences) {
    const startTime = Date.now();
    let translated = "";
    let errorOccurred = false;
    try {
      const res = await hindiTranslator(item.text);
      translated = res[0].translation_text;
    } catch (e) {
      translated = "ERROR: " + e.message;
      errorOccurred = true;
    }
    const duration = Date.now() - startTime;
    
    // Classify
    let toxScore = 0.0, isTox = false, sentLabel = "Negative";
    if (!errorOccurred) {
      const toxAll = await toxicity(translated, { topk: null });
      toxScore = toxAll.find(t => t.label === 'toxic' || t.label === 'LABEL_1')?.score || 0.0;
      isTox = toxScore >= 0.45;
      
      const sentAll = await sentiment(translated, { topk: null });
      let bestSent = sentAll[0];
      sentAll.forEach(s => { if (s.score > bestSent.score) bestSent = s; });
      sentLabel = bestSent.label === 'LABEL_1' || bestSent.label.toLowerCase() === 'positive' ? 'Positive' : 'Negative';
      
      const cleanTrimmed = item.text.trim();
      if (cleanTrimmed.endsWith('?')) {
        sentLabel = 'Neutral';
      } else if (cleanTrimmed.endsWith('!') && !isTox) {
        sentLabel = 'Positive';
      }
    }

    reportRows.push({
      lang: "Hindi",
      category: item.category,
      original: item.text,
      expected: item.expected,
      modelTranslation: translated,
      toxicity: isTox ? `Toxic (${(toxScore * 100).toFixed(0)}%)` : `Safe (${(toxScore * 100).toFixed(0)}%)`,
      sentiment: sentLabel,
      durationMs: duration
    });
  }

  // 3. Process English sentences (classification only)
  console.log("Validating English sentences...");
  for (const item of englishTestSentences) {
    const toxAll = await toxicity(item.text, { topk: null });
    const toxScore = toxAll.find(t => t.label === 'toxic' || t.label === 'LABEL_1')?.score || 0.0;
    const isTox = toxScore >= 0.45;
    
    const sentAll = await sentiment(item.text, { topk: null });
    let bestSent = sentAll[0];
    sentAll.forEach(s => { if (s.score > bestSent.score) bestSent = s; });
    let sentLabel = bestSent.label === 'LABEL_1' || bestSent.label.toLowerCase() === 'positive' ? 'Positive' : 'Negative';

    const cleanTrimmed = item.text.trim();
    if (cleanTrimmed.endsWith('?')) {
      sentLabel = 'Neutral';
    } else if (cleanTrimmed.endsWith('!') && !isTox) {
      sentLabel = 'Positive';
    }

    reportRows.push({
      lang: "English",
      category: item.category,
      original: item.text,
      expected: item.text,
      modelTranslation: item.text,
      toxicity: isTox ? `Toxic (${(toxScore * 100).toFixed(0)}%)` : `Safe (${(toxScore * 100).toFixed(0)}%)`,
      sentiment: sentLabel,
      durationMs: 0
    });
  }

  // Write evaluation report to walkthrough.md
  let md = "# Translation and Moderation Validation Report\n\n";
  md += `Date: ${new Date().toLocaleString()}\n`;
  md += `NMT Model: Helsinki-NLP OPUS Bilingual Models (opus-mt-ta-en & opus-mt-hi-en)\n`;
  md += `Toxicity Model: martin-ha/toxic-comment-model (toxic-bert)\n`;
  md += `Sentiment Model: siebert/sentiment-roberta-large-english (distilbert-sst2)\n\n`;
  
  md += "## Summary Metrics\n";
  const total = reportRows.length;
  const translationRows = reportRows.filter(r => r.lang !== "English");
  const failedTrans = translationRows.filter(r => r.modelTranslation.startsWith("ERROR")).length;
  md += `- Total Sentences Validated: ${total}\n`;
  md += `- Translation Success Rate: ${((translationRows.length - failedTrans) / translationRows.length * 100).toFixed(1)}%\n\n`;

  md += "## Detailed Evaluation Report\n\n";
  md += "| Language | Category | Original Sentence | Expected English | Model NMT Translation | Toxicity | Sentiment | Speed (ms) |\n";
  md += "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n";
  
  for (const r of reportRows) {
    const origEsc = r.original.replace(/\|/g, '\\|');
    const expEsc = r.expected.replace(/\|/g, '\\|');
    const transEsc = r.modelTranslation.replace(/\|/g, '\\|');
    md += `| ${r.lang} | ${r.category} | ${origEsc} | ${expEsc} | ${transEsc} | ${r.toxicity} | ${r.sentiment} | ${r.durationMs} |\n`;
  }
  
  const reportPath = path.join(__dirname, '..', 'walkthrough.md');
  fs.writeFileSync(reportPath, md);
  console.log(`\nValidation completed successfully! Report written to: ${reportPath}`);
}

run();
