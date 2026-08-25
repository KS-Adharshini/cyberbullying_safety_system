const { pipeline, env } = require('@xenova/transformers');
const fs = require('fs');
const path = require('path');

// Configure Transformers.js to cache models locally in a temp folder
const tempCacheDir = path.join(__dirname, 'frontend', 'public', 'models', 'temp_cache');
env.cacheDir = tempCacheDir;

const models = [
  { task: 'text-classification', id: 'Xenova/toxic-comment-model', name: 'toxic-comment-model' },
  { task: 'text-classification', id: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', name: 'distilbert-base-uncased-finetuned-sst-2-english' },
  { task: 'text-classification', id: 'Xenova/roberta-base-go_emotions', name: 'roberta-base-go_emotions' },
  { task: 'translation', id: 'Xenova/opus-mt-mul-en', name: 'opus-mt-mul-en' }
];

// Helper to copy directory recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function run() {
  console.log("Starting Hugging Face model downloads via Node.js...");
  
  for (const m of models) {
    console.log(`\n=======================================\nDownloading ${m.id} (${m.task})...`);
    try {
      await pipeline(m.task, m.id);
      console.log(`Finished downloading ${m.id}`);
    } catch (err) {
      console.error(`Error downloading ${m.id}:`, err);
    }
  }

  console.log("\n=======================================\nProcessing cache files...");
  
  // Locate the snapshots and copy them to clean paths
  const targetRoot = path.join(__dirname, 'frontend', 'public', 'models', 'Xenova');
  
  for (const m of models) {
    const repoFolderName = `models--Xenova--${m.name}`;
    const repoPath = path.join(tempCacheDir, repoFolderName, 'snapshots');
    
    if (!fs.existsSync(repoPath)) {
      console.warn(`Snapshot path not found for ${m.id}: ${repoPath}`);
      continue;
    }
    
    const commits = fs.readdirSync(repoPath);
    if (commits.length === 0) {
      console.warn(`No commits found in snapshots for ${m.id}`);
      continue;
    }
    
    const latestCommit = commits[0];
    const snapshotSource = path.join(repoPath, latestCommit);
    const destinationPath = path.join(targetRoot, m.name);
    
    console.log(`Copying files for ${m.id} -> ${destinationPath}...`);
    try {
      copyDirSync(snapshotSource, destinationPath);
      console.log(`Successfully copied ${m.id} to clean serving path.`);
    } catch (copyErr) {
      console.error(`Failed to copy ${m.id}:`, copyErr);
    }
  }

  // Cleanup temp cache
  console.log("\nCleaning up temporary cache...");
  try {
    fs.rmSync(tempCacheDir, { recursive: true, force: true });
    console.log("Cleanup finished.");
  } catch (cleanErr) {
    console.warn("Cleanup warning:", cleanErr);
  }

  console.log("\nAll models successfully downloaded, structured, and ready to serve!");
}

run();
