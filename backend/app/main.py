import uvicorn
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import sys
# Make sure parent directory is in path to import services.toxicity_service
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.routes import router as api_router, ensure_seeded_data
from services.toxicity_service import load_all_models

# Load env variables
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path)

PORT = int(os.getenv("PORT", 8000))

app = FastAPI(
    title="Repeated Harassment Detection API",
    description="Backend API with Toxicity Analyzer & Repeated Harassment Detection for Trust & Safety dashboards.",
    version="1.0.0"
)

# Set up CORS middleware to allow calls from any domain (crucial for local Vite frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    print("FastAPI Application starting up...")
    try:
        # Pre-seed the database on startup so it is immediately populated
        await ensure_seeded_data()
        print("Database verification / seeding completed.")
    except Exception as e:
        print(f"Error during database initialization: {e}")

    try:
        print("Initializing Hugging Face models...")
        load_all_models()
    except Exception as e:
        print(f"Error loading Hugging Face models: {e}")

    try:
        print("Pre-warming EasyOCR reader...")
        from services.image_safety_service import get_easyocr_reader
        get_easyocr_reader(["en"])
        print("EasyOCR reader pre-warmed.")
    except Exception as e:
        print(f"EasyOCR reader pre-warming notice: {e}")

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Repeated Harassment Detection API is running. Go to /docs for Swagger UI documentation."
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
