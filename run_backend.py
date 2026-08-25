# /// script
# dependencies = [
#   "fastapi",
#   "uvicorn",
#   "transformers",
#   "torch",
#   "langdetect",
#   "sacremoses",
#   "sentencepiece",
#   "accelerate",
#   "motor",
#   "pymongo",
#   "nltk",
#   "python-dotenv"
# ]
# ///
import uvicorn
import sys
import os

if __name__ == "__main__":
    # Add workspace directory to path
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    print("Booting Safety Portal FastAPI Server...")
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=False)
