import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load env variables
# Locate .env in backend directory
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/harassment_detection")

print(f"Connecting to MongoDB at: {MONGO_URI}")
client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=1000)
db = client.get_default_database()
if db is None or db.name == 'test' or db.name == 'admin':
    db = client['harassment_detection']
