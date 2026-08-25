const { pipeline, env } = require('@xenova/transformers');
const fs = require('fs');
const path = require('path');

// Configure Transformers.js to cache models locally in a temp folder
const tempCacheDir = path.join(__dirname, 'public', 'models', 'temp_cache');
env.cacheDir = tempCacheDir;

const models = [
  { task: 'text-classification', id: 'Xenova/toxic-bert', name: 'toxic-bert' },
  { task: 'text-classification', id: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', name: 'distilbert-base-uncased-finetuned-sst-2-english' },
  { task: 'translation', id: 'Xenova/opus-mt-mul-en', name: 'opus-mt-mul-en' },
  { task: 'translation', id: 'Xenova/opus-mt-hi-en', name: 'opus-mt-hi-en' }
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
  
  if (fs.existsSync(tempCacheDir)) {
    console.log("Listing temp_cache contents recursively:");
    function printTree(dir, depth = 0) {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const itemPath = path.join(dir, item.name);
        console.log("  ".repeat(depth) + "- " + item.name + (item.isDirectory() ? "/" : ""));
        if (item.isDirectory() && depth < 3) {
          printTree(itemPath, depth + 1);
        }
      }
    }
    printTree(tempCacheDir);
  } else {
    console.log("temp_cache directory does not exist!");
  }

  // Locate the snapshots and copy them to clean paths
  const targetRoot = path.join(__dirname, 'public', 'models', 'Xenova');
  
  for (const m of models) {
    const snapshotSource = path.join(tempCacheDir, 'Xenova', m.name);
    const destinationPath = path.join(targetRoot, m.name);
    
    if (!fs.existsSync(snapshotSource)) {
      console.warn(`Source path not found for ${m.id}: ${snapshotSource}`);
      continue;
    }
    
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
