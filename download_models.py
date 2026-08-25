# /// script
# dependencies = [
#   "huggingface_hub"
# ]
# ///
import os
from huggingface_hub import snapshot_download

models = [
    "toxic-comment-model",
    "distilbert-base-uncased-finetuned-sst-2-english",
    "roberta-base-go_emotions",
    "opus-mt-mul-en"
]

print("Starting Hugging Face model downloads for offline browser use...")
os.makedirs("frontend/public/models/Xenova", exist_ok=True)

for model in models:
    repo_id = f"Xenova/{model}"
    target_dir = f"frontend/public/models/Xenova/{model}"
    print(f"\nDownloading snapshot for {repo_id} -> {target_dir}...")
    try:
        snapshot_download(
            repo_id=repo_id,
            local_dir=target_dir,
            ignore_patterns=["*.git*", "*.md", "*.bin", "*.safetensors", "*.pt"]
        )
        print(f"Successfully downloaded {repo_id}")
    except Exception as e:
        print(f"Error downloading {repo_id}: {e}")

print("\nAll models downloaded successfully for local browser serving!")
