import uuid
import base64
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, Depends, File, UploadFile, Form, Body
from typing import List, Optional
from bson import ObjectId
from app.db import db
from app.models import (
    UserModel, PostModel, PostCreate, CommentCreate, CommentModel, 
    ModerationLogModel, ActionRequest, CommentActionRequest
)
from app.analyzer import get_analyzer
from app.harassment import analyze_harassment
from services.toxicity_service import analyze_text, predict_toxicity
from services.image_safety_service import analyze_image_bytes, extract_image_text
from pydantic import BaseModel

class AnalyzeRequest(BaseModel):
    text: str

class AnalyzeImageJsonRequest(BaseModel):
    image_base64: str
    extracted_text: Optional[str] = None

class ReportCreate(BaseModel):
    postId: str
    reporter: str
    reason: str

class RepostCreate(BaseModel):
    postId: str
    reposter: str

router = APIRouter()
analyzer = get_analyzer()

# Seed database with sample posts and users if empty
async def ensure_seeded_data():
    seed_flag = await db.system_config.find_one({"key": "initial_seed_completed"})
    if seed_flag:
        return

    post_count = await db.posts.count_documents({})
    if post_count > 0:
        await db.system_config.update_one({"key": "initial_seed_completed"}, {"$set": {"key": "initial_seed_completed", "timestamp": datetime.utcnow()}}, upsert=True)
        return

    print("Seeding initial mock data...")
    import random
    
    # 1. Seed 20 sample users
    sample_users = [
        {"username": "rahul_07", "displayName": "Rahul Kumar", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=rahul", "followers": 524, "following": 320, "postsCount": 3, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=30), "verified": False},
        {"username": "anjali_art", "displayName": "Anjali Sen", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=anjali", "followers": 890, "following": 290, "postsCount": 2, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=20), "verified": True},
        {"username": "john_smith", "displayName": "John Smith", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=john", "followers": 120, "following": 550, "postsCount": 1, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=15), "verified": False},
        {"username": "travel_with_me", "displayName": "Sarah Jenkins", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=sarah", "followers": 4200, "following": 412, "postsCount": 2, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=40), "verified": True},
        {"username": "foodie_girl", "displayName": "Priya Sharma", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=priya", "followers": 1205, "following": 415, "postsCount": 2, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=25), "verified": False},
        {"username": "tech_vibes", "displayName": "Amit Das", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=amit", "followers": 612, "following": 180, "postsCount": 2, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=10), "verified": False},
        {"username": "college_memes", "displayName": "Kunal Verma", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=kunal", "followers": 8520, "following": 55, "postsCount": 1, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=50), "verified": False},
        {"username": "fitness_freak", "displayName": "David Miller", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=david", "followers": 3200, "following": 150, "postsCount": 2, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=12), "verified": False},
        {"username": "nature_pics", "displayName": "Neha Patel", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=neha", "followers": 980, "following": 340, "postsCount": 1, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=18), "verified": False},
        {"username": "gamer_hub", "displayName": "Vikram Singh", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=vikram", "followers": 450, "following": 220, "postsCount": 1, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=8), "verified": False},
        {"username": "fashion_guru", "displayName": "Rhea Sen", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=rhea", "followers": 9850, "following": 480, "postsCount": 1, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=35), "verified": True},
        {"username": "music_lovers", "displayName": "Rohan Mehra", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=rohan", "followers": 1540, "following": 380, "postsCount": 0, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=14), "verified": False},
        {"username": "bookworm_life", "displayName": "Ishita Bose", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=ishita", "followers": 640, "following": 390, "postsCount": 0, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=16), "verified": False},
        {"username": "pet_tales", "displayName": "Arjun Kapur", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=arjun", "followers": 2300, "following": 140, "postsCount": 0, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=22), "verified": False},
        {"username": "sports_central", "displayName": "Kabir Dev", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=kabir", "followers": 1120, "following": 400, "postsCount": 0, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=28), "verified": False},
        {"username": "wanderer", "displayName": "Riya Jain", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=riya", "followers": 870, "following": 510, "postsCount": 0, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=9), "verified": False},
        {"username": "daily_vlog", "displayName": "Nikhil Roy", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=nikhil", "followers": 1430, "following": 190, "postsCount": 0, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=5), "verified": False},
        {"username": "code_pioneer", "displayName": "Sneha Gupta", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=sneha", "followers": 3100, "following": 350, "postsCount": 0, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=45), "verified": False},
        {"username": "artistic_mind", "displayName": "Maya Roy", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=maya", "followers": 1240, "following": 290, "postsCount": 0, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=17), "verified": False},
        {"username": "sara_travels", "displayName": "Sara Taylor", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=sarat", "followers": 880, "following": 210, "postsCount": 0, "status": "Normal", "joinedAt": datetime.utcnow() - timedelta(days=19), "verified": False}
    ]
    
    for u in sample_users:
        await db.users.update_one({"username": u["username"]}, {"$setOnInsert": u}, upsert=True)
        
    # 2. Seed initial mock posts
    sample_posts = [
        {"postId": "post_1", "username": "rahul_07", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=rahul", "location": "Ooty, India", "postImage": "/photos/164cecaf732f8b069124d966d8563031.jpg", "caption": "Enjoying the beautiful hills of Ooty! #nature #trip", "likes": 524, "timestamp": datetime.utcnow() - timedelta(days=8)},
        {"postId": "post_2", "username": "foodie_girl", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=priya", "location": "Mumbai, India", "postImage": "/photos/3b39d7dd5a89209a4f456693ca2efa9d.jpg", "caption": "Gateway of India at sunset. Pure magic! ✨", "likes": 842, "timestamp": datetime.utcnow() - timedelta(days=7)},
        {"postId": "post_3", "username": "anjali_art", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=anjali", "location": "Cafeteria", "postImage": "/photos/4415c674c7306020ba6cc0853949db8f.jpg", "caption": "Coffee first, questions later. ☕🍰", "likes": 215, "timestamp": datetime.utcnow() - timedelta(days=6)},
        {"postId": "post_4", "username": "travel_with_me", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=sarah", "location": "San Francisco, USA", "postImage": "/photos/5f5ad7ba5b95589b119792e5196067a1.jpg", "caption": "Golden Gate bridge lookin' foggy as always.", "likes": 981, "timestamp": datetime.utcnow() - timedelta(days=5)},
        {"postId": "post_5", "username": "nature_pics", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=neha", "location": "Himalayas, India", "postImage": "/photos/97be6ca92464446f9df420a40fef2530.jpg", "caption": "Reaching new heights. The view from the peak is worth every step.", "likes": 1205, "timestamp": datetime.utcnow() - timedelta(days=4)},
        {"postId": "post_6", "username": "rahul_07", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=rahul", "location": "Home Office", "postImage": "/photos/cb67b417697a3d60ab9c7968786cf403.jpg", "caption": "Building my AI project all night. Keep grinding! 💻🤖", "likes": 341, "timestamp": datetime.utcnow() - timedelta(days=3)},
        {"postId": "post_7", "username": "anjali_art", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=anjali", "location": "Art Gallery", "postImage": "/photos/e508c55f4963383cda09d7208fc8b3ea.jpg", "caption": "Fell in love with this abstract piece. Painting has a voice of its own.", "likes": 612, "timestamp": datetime.utcnow() - timedelta(days=2)},
        {"postId": "post_8", "username": "john_smith", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=john", "location": "Dog Park", "postImage": "/photos/f5f8a45f67da9e79de40e437a3225c1d.jpg", "caption": "Look at those eyes! Who's a good boy? 🐶💖", "likes": 472, "timestamp": datetime.utcnow() - timedelta(days=1)},
        {"postId": "post_9", "username": "travel_with_me", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=sarah", "location": "Library", "postImage": "/photos/164cecaf732f8b069124d966d8563031.jpg", "caption": "Quiet afternoons and high-quality books. 📚☕", "likes": 310, "timestamp": datetime.utcnow() - timedelta(hours=12)},
        {"postId": "post_10", "username": "rahul_07", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=rahul", "location": "Gym", "postImage": "/photos/3b39d7dd5a89209a4f456693ca2efa9d.jpg", "caption": "No pain, no gain. Back at it! 💪🏋️‍♂️", "likes": 405, "timestamp": datetime.utcnow() - timedelta(hours=3)},
        {"postId": "post_11", "username": "foodie_girl", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=priya", "location": "Local Kitchen", "postImage": "/photos/4415c674c7306020ba6cc0853949db8f.jpg", "caption": "Freshly baked pizza from scratch! 🍕😋 #foodporn", "likes": 980, "timestamp": datetime.utcnow() - timedelta(days=2)},
        {"postId": "post_12", "username": "gamer_hub", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=vikram", "location": "Gamer Zone", "postImage": "/photos/5f5ad7ba5b95589b119792e5196067a1.jpg", "caption": "Rate my setup! Ready for the tournament. 🎮🎧", "likes": 315, "timestamp": datetime.utcnow() - timedelta(days=1.5)},
        {"postId": "post_13", "username": "fashion_guru", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=rhea", "location": "Milan, Italy", "postImage": "/photos/97be6ca92464446f9df420a40fef2530.jpg", "caption": "Fashion week vibes! Wearing custom luxury apparel. 🧥🕶️", "likes": 1190, "timestamp": datetime.utcnow() - timedelta(days=4)},
        {"postId": "post_14", "username": "tech_vibes", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=amit", "location": "Concert Hall", "postImage": "/photos/cb67b417697a3d60ab9c7968786cf403.jpg", "caption": "Late night jamming. Acoustic sessions are the best. 🎸⚡", "likes": 290, "timestamp": datetime.utcnow() - timedelta(hours=12)},
        {"postId": "post_15", "username": "college_memes", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=kunal", "location": "Hostel Room", "postImage": "/photos/e508c55f4963383cda09d7208fc8b3ea.jpg", "caption": "Studying for semester exams at 3 AM. 📚😴", "likes": 1540, "timestamp": datetime.utcnow() - timedelta(days=5)},
        {"postId": "post_16", "username": "fitness_freak", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=david", "location": "Muscle Beach Gym", "postImage": "/photos/f5f8a45f67da9e79de40e437a3225c1d.jpg", "caption": "Early morning workout done! Consistency is key 💪🔥 #fitness #goals", "likes": 640, "timestamp": datetime.utcnow() - timedelta(days=3)},
        {"postId": "post_17", "username": "fitness_freak", "profilePic": "https://api.dicebear.com/7.x/adventurer/svg?seed=david", "location": "Powerhouse Arena", "postImage": "/photos/164cecaf732f8b069124d966d8563031.jpg", "caption": "Pushing past the limits today. No excuses! 🏋️‍♂️✨", "likes": 482, "timestamp": datetime.utcnow() - timedelta(days=1)}
    ]
    await db.posts.insert_many(sample_posts)
    await db.system_config.update_one({"key": "initial_seed_completed"}, {"$set": {"key": "initial_seed_completed", "timestamp": datetime.utcnow()}}, upsert=True)
    
    # 3. Seed 200+ comments programmatically matching the JS mockData structure
    john_harasses_rahul = [
        {"postId": "post_1", "text": "Nobody likes your posts.", "timestamp": datetime.utcnow() - timedelta(days=6)},
        {"postId": "post_6", "text": "You are a pathetic loser.", "timestamp": datetime.utcnow() - timedelta(days=3)},
        {"postId": "post_6", "text": "Such a failure, why do you even code?", "timestamp": datetime.utcnow() - timedelta(days=2)},
        {"postId": "post_10", "text": "You look like an ugly pig in the gym.", "timestamp": datetime.utcnow() - timedelta(days=1)},
        {"postId": "post_10", "text": "Get lost, garbage user.", "timestamp": datetime.utcnow() - timedelta(hours=2)},
        {"postId": "post_1", "text": "You are so stupid.", "timestamp": datetime.utcnow() - timedelta(days=4)},
        {"postId": "post_6", "text": "Go away.", "timestamp": datetime.utcnow() - timedelta(days=2)}
    ]
    
    comments = []
    comment_id_count = 1
    
    for item in john_harasses_rahul:
        analysis = analyzer.analyze(item["text"])
        comments.append({
            "commentId": f"c_{comment_id_count}",
            "postId": item["postId"],
            "commentBy": "john_smith",
            "commentTo": "rahul_07",
            "commentText": item["text"],
            "toxicityScore": float(analysis["toxicityScore"]),
            "isToxic": bool(analysis["isToxic"]),
            "sentiment": analysis["sentiment"],
            "timestamp": item["timestamp"]
        })
        comment_id_count += 1
        
    users_list = [u["username"] for u in sample_users]
    
    normal_templates = [
        "Amazing click! 😍", "Beautiful picture! ❤️", "Wow, looks spectacular!", 
        "Awesome shot, keep it up!", "Absolutely stunning!", "Where is this location?", 
        "Incredible photo!", "Great caption!", "Looks like an amazing experience!", 
        "So beautiful!", "Perfect capture! 📸", "So inspiring!", "Love the vibes here!", 
        "Great work!", "Superb shot!", "Lovely!", "Nice click!", "This is fire 🔥", 
        "Brilliant!", "Wow!", "Spectacular!", "Outstanding!", "Cool setup!", 
        "This looks delicious!", "Love it!", "Nice!", "So good!"
    ]

    toxic_templates = [
        "You are so stupid.", "Nobody cares about your life.", "Delete your account immediately.",
        "You're useless.", "Go away, loser.", "This is trash.", "Disgusting post.",
        "You are a failure.", "Worst photo ever.", "No one asked for your opinion.",
        "Ugly profile.", "You look terrible.", "Nobody likes you."
    ]
    
    # Consistent randomized seeding
    random.seed(42)
    for post in sample_posts:
        post_id = post["postId"]
        post_owner = post["username"]
        comments_count = random.randint(12, 17)
        
        for _ in range(comments_count):
            commenter = post_owner
            while commenter == post_owner:
                commenter = random.choice(users_list)
                
            if commenter == "john_smith" and post_owner == "rahul_07":
                continue
                
            is_toxic = random.random() < 0.15
            text = random.choice(toxic_templates) if is_toxic else random.choice(normal_templates)
            
            analysis = analyzer.analyze(text)
            days_ago = random.random() * 10
            ts = datetime.utcnow() - timedelta(days=days_ago)
            
            comments.append({
                "commentId": f"c_{comment_id_count}",
                "postId": post_id,
                "commentBy": commenter,
                "commentTo": post_owner,
                "commentText": text,
                "toxicityScore": float(analysis["toxicityScore"]),
                "isToxic": bool(analysis["isToxic"]),
                "sentiment": analysis["sentiment"],
                "timestamp": ts
            })
            comment_id_count += 1
            
    await db.comments.insert_many(comments)
    print("Mock data seeded successfully!")

# Ensure a user exists or create a default one
async def get_or_create_user(username: str):
    username = username.strip().lower()
    user = await db.users.find_one({"username": username})
    if not user:
        # Create a new user profile on the fly
        new_user = {
            "username": username,
            "displayName": username.capitalize(),
            "profilePic": f"https://api.dicebear.com/7.x/adventurer/svg?seed={username}",
            "followers": 350,
            "following": 240,
            "postsCount": 0,
            "status": "Normal",
            "joinedAt": datetime.utcnow()
        }
        await db.users.insert_one(new_user)
        return new_user
    return user


# Endpoints

@router.get("/posts", response_model=List[PostModel])
async def get_posts():
    await ensure_seeded_data()
    cursor = db.posts.find({}).sort("timestamp", -1)
    posts = await cursor.to_list(length=100)
    return posts

@router.post("/reports")
async def report_post(report_in: ReportCreate):
    reporter = report_in.reporter.strip().lower()
    reason = report_in.reason.strip()
    if not reason:
        raise HTTPException(status_code=400, detail="A report reason is required")
    post = await db.posts.find_one({"postId": report_in.postId})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    timestamp = datetime.utcnow()
    report_id = str(uuid.uuid4())
    await db.reports.insert_one({
        "reportId": report_id,
        "postId": report_in.postId,
        "reporter": reporter,
        "postOwner": post["username"],
        "reason": reason,
        "timestamp": timestamp
    })
    post_fields = {"postId": report_in.postId, "postOwner": post["username"], "postImage": post.get("postImage", "")}
    await db.notifications.insert_many([
        {"notificationId": str(uuid.uuid4()), "recipientUsername": post["username"], "actorUsername": "Safety Team", "type": "report", "message": f"your post was reported: {reason}", **post_fields, "read": False, "timestamp": timestamp},
        {"notificationId": str(uuid.uuid4()), "recipientUsername": reporter, "actorUsername": "Safety Team", "type": "report", "message": f"your report was submitted: {reason}", **post_fields, "read": False, "timestamp": timestamp}
    ])
    return {"status": "success", "message": "Report submitted successfully.", "reportId": report_id}

@router.post("/reposts")
async def repost_post(repost_in: RepostCreate):
    reposter = repost_in.reposter.strip().lower()
    post = await db.posts.find_one({"postId": repost_in.postId})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    repost = {
        "repostId": str(uuid.uuid4()),
        "postId": repost_in.postId,
        "reposter": reposter,
        "originalOwner": post["username"],
        "postImage": post.get("postImage", ""),
        "caption": post.get("caption", ""),
        "timestamp": datetime.utcnow()
    }
    await db.reposts.insert_one(repost)
    await db.notifications.insert_one({
        "notificationId": str(uuid.uuid4()),
        "recipientUsername": post["username"],
        "actorUsername": reposter,
        "type": "repost",
        "message": "reposted your post",
        "postId": repost_in.postId,
        "postOwner": post["username"],
        "postImage": post.get("postImage", ""),
        "read": False,
        "timestamp": repost["timestamp"]
    })
    repost.pop("_id", None)
    return repost

@router.get("/admin/reposts")
async def get_admin_reposts():
    cursor = db.reposts.find({}).sort("timestamp", -1)
    reposts = await cursor.to_list(length=100)
    valid_reposts = []
    for repost in reposts:
        post = await db.posts.find_one({"postId": repost.get("postId")})
        if post:
            repost.pop("_id", None)
            valid_reposts.append(repost)
        else:
            # Clean orphan repost
            await db.reposts.delete_one({"repostId": repost.get("repostId")})
    return valid_reposts

@router.get("/notifications/{username}")
async def get_notifications(username: str):
    cursor = db.notifications.find({"recipientUsername": username.strip().lower()}).sort("timestamp", -1)
    notifications = await cursor.to_list(length=100)
    for notification in notifications:
        notification.pop("_id", None)
    return notifications

@router.get("/admin/image-reports")
async def get_image_reports():
    cursor = db.reports.find({}).sort("timestamp", -1)
    reports = await cursor.to_list(length=200)
    result = []
    for report in reports:
        post = await db.posts.find_one({"postId": report["postId"]})
        analysis = report.get("aiAnalysis") or {}
        result.append({
            "reportId": report["reportId"],
            "postId": report["postId"],
            "postImage": report.get("postImage") or (post or {}).get("postImage", ""),
            "reportedAccount": report.get("postOwner") or (post or {}).get("username", "unknown"),
            "reportingAccount": report["reporter"],
            "reason": report["reason"],
            "aiResult": analysis.get("result", "Pending AI analysis"),
            "aiCategory": analysis.get("category", "inappropriate"),
            "aiConfidence": analysis.get("confidence", 0),
            "severity": report.get("severity", "Medium"),
            "status": report.get("status", "Pending"),
            "deleted": report.get("imageDeleted", False),
            "createdAt": report["timestamp"],
            "resolutionHours": report.get("resolutionHours")
        })
    return result

@router.patch("/admin/image-reports/{reportId}")
async def update_image_report(reportId: str, payload: dict = Body(...)):
    status = payload.get("status", "Pending")
    report = await db.reports.find_one({"reportId": reportId})
    if not report:
        raise HTTPException(status_code=404, detail="Image report not found")
    update = {"status": status}
    if payload.get("deleteImage") and payload.get("postId"):
        target_post_id = payload["postId"]
        post = await db.posts.find_one({"postId": target_post_id})
        await db.comments.delete_many({"postId": target_post_id})
        await db.reposts.delete_many({"postId": target_post_id})
        await db.notifications.delete_many({"postId": target_post_id})
        await db.posts.delete_one({"postId": target_post_id})
        if post:
            user = await db.users.find_one({"username": post["username"]})
            if user:
                new_count = max(0, (user.get("postsCount", 1) - 1))
                await db.users.update_one(
                    {"username": post["username"]},
                    {"$set": {"postsCount": new_count}}
                )
        update["imageDeleted"] = True
        update["postDeleted"] = True
    if status == "Resolved":
        update["resolutionHours"] = round((datetime.utcnow() - report["timestamp"]).total_seconds() / 3600, 1)
    await db.reports.update_one({"reportId": reportId}, {"$set": update})
    return {"status": "success", "reportId": reportId, "reportStatus": status}

@router.patch("/notifications/{notificationId}/read")
async def mark_notification_read(notificationId: str):
    await db.notifications.update_one({"notificationId": notificationId}, {"$set": {"read": True}})
    return {"status": "success"}

@router.patch("/notifications/{username}/read-all")
async def mark_all_notifications_read(username: str):
    await db.notifications.update_many({"recipientUsername": username.strip().lower()}, {"$set": {"read": True}})
    return {"status": "success"}

@router.post("/posts", response_model=PostModel)
async def create_post(post_in: PostCreate):
    username = post_in.username.strip().lower()
    user = await get_or_create_user(username)
    if user.get("status") == "Suspended":
        raise HTTPException(status_code=403, detail="Your account has been suspended by a moderator.")

    # Defense-in-depth safety check on post image
    if post_in.postImage:
        try:
            # Check if base64 image data
            if "," in post_in.postImage:
                header, encoded = post_in.postImage.split(",", 1)
                img_bytes = base64.b64decode(encoded)
            else:
                img_bytes = base64.b64decode(post_in.postImage)
            
            safety_check = analyze_image_bytes(img_bytes, post_in.extractedText)
            if not safety_check.get("allowed", True):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Image upload blocked: {safety_check.get('reason', 'Potentially harmful content detected')}."
                )
        except HTTPException:
            raise
        except Exception:
            pass # Non-base64 URL or fallback

    new_post_id = f"post_{int(datetime.utcnow().timestamp()*1000)}"
    new_post = {
        "postId": new_post_id,
        "username": username,
        "profilePic": user.get("profilePic", f"https://api.dicebear.com/7.x/adventurer/svg?seed={username}"),
        "location": post_in.location or "Somewhere on Earth",
        "postImage": post_in.postImage,
        "caption": post_in.caption or "",
        "likes": 0,
        "timestamp": datetime.utcnow()
    }
    
    await db.posts.insert_one(new_post)
    await db.users.update_one({"username": username}, {"$inc": {"postsCount": 1}})
    new_post.pop("_id", None)
    return new_post

@router.delete("/posts/{postId}")
async def delete_post(postId: str, username: str = Query(...)):
    clean_user = username.strip().lower()
    is_admin = clean_user in ["admin", "moderator", "safety_admin", "administrator"]
    
    post = await db.posts.find_one({"postId": postId})
    if post:
        if post["username"] != clean_user and not is_admin:
            raise HTTPException(status_code=403, detail="You can only delete your own posts unless you are an Admin")
        
        # Decrement post owner count
        user = await db.users.find_one({"username": post["username"]})
        if user:
            new_count = max(0, (user.get("postsCount", 1) - 1))
            await db.users.update_one(
                {"username": post["username"]},
                {"$set": {"postsCount": new_count}}
            )
        
        if is_admin:
            log = {
                "logId": str(uuid.uuid4()),
                "action": "DELETE_POST",
                "targetUser": post["username"],
                "moderator": clean_user,
                "reason": "Admin permanently deleted post.",
                "details": f"Post ID: {postId}, Caption: {post.get('caption', '')}",
                "timestamp": datetime.utcnow()
            }
            await db.moderation_logs.insert_one(log)

    # Cascade delete all related data across collections permanently
    deleted_comments = await db.comments.delete_many({"postId": postId})
    deleted_reposts = await db.reposts.delete_many({"postId": postId})
    deleted_reports = await db.reports.delete_many({"postId": postId})
    deleted_notifs = await db.notifications.delete_many({"postId": postId})
    deleted_post = await db.posts.delete_one({"postId": postId})

    return {
        "status": "success",
        "message": "Post and all associated comments, reposts, reports, and notifications permanently deleted.",
        "deletedPost": deleted_post.deleted_count,
        "deletedComments": deleted_comments.deleted_count,
        "deletedReposts": deleted_reposts.deleted_count
    }

@router.post("/api/analyze-image")
async def analyze_image_upload(
    file: UploadFile = File(...),
    extracted_text: Optional[str] = Form(None)
):
    try:
        contents = await file.read()
        analysis = analyze_image_bytes(contents, extracted_text)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image analysis error: {str(e)}")

@router.post("/api/ocr-image")
async def ocr_image_upload(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        return {"extractedText": extract_image_text(contents)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR error: {str(e)}")

@router.post("/api/analyze-image-json")
async def analyze_image_json(req: AnalyzeImageJsonRequest):
    try:
        b64_str = req.image_base64
        if "," in b64_str:
            _, b64_str = b64_str.split(",", 1)
        contents = base64.b64decode(b64_str)
        analysis = analyze_image_bytes(contents, req.extracted_text)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image analysis error: {str(e)}")

@router.post("/comments", response_model=CommentModel)
async def create_comment(comment_in: CommentCreate):
    # Verify post exists
    post = await db.posts.find_one({"postId": comment_in.postId})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    commenter_username = comment_in.commentBy.strip().lower()
    # Check if commenter is suspended
    commenter = await get_or_create_user(commenter_username)
    if commenter.get("status") == "Suspended":
        raise HTTPException(status_code=403, detail="Your account has been suspended by a moderator for repeated harassment.")

    # Target user (commentTo) is the owner of the post
    target_username = post["username"]
    
    # Check if pre-analyzed by the client
    if comment_in.translatedText is not None:
        language = comment_in.language
        translated_text = comment_in.translatedText
        is_toxic = comment_in.isToxic
        toxicity_score = comment_in.toxicityScore
        toxicity = comment_in.toxicity
        sentiment = comment_in.sentiment
        emotion = comment_in.emotion
    else:
        # Run Hugging Face multilingual safety pipeline
        analysis = analyze_text(comment_in.commentText)
        language = analysis["language"]
        translated_text = analysis["translatedText"]
        is_toxic = bool(analysis["toxicity"]["label"] == "TOXIC")
        toxicity_score = float(analysis["toxicity"]["score"])
        toxicity = analysis["toxicity"]
        sentiment = analysis["sentiment"]
        emotion = analysis["emotion"]
        
    # Create Comment Object storing both legacy flat values and multilingual details
    comment_data = {
        "commentId": str(uuid.uuid4()),
        "postId": comment_in.postId,
        "commentBy": commenter_username,
        "commentTo": target_username,
        "commentText": comment_in.commentText,
        
        # Multilingual Pipeline Fields (Requirement 7)
        "originalText": comment_in.commentText,
        "translatedText": translated_text,
        "language": language,
        
        # Legacy/Backward compatibility fields
        "toxicityScore": toxicity_score,
        "isToxic": is_toxic,
        
        # Structured dictionaries (validated by Union types in CommentModel)
        "toxicity": toxicity,
        "sentiment": sentiment,
        "emotion": emotion,
        "timestamp": datetime.utcnow()
    }
    
    # Save comment
    await db.comments.insert_one(comment_data)
    return comment_data

@router.post("/api/analyze")
async def analyze_toxicity_api(req: AnalyzeRequest):
    """
    POST /api/analyze (Requirement 6)
    Runs toxicity prediction using Toxic-BERT.
    """
    try:
        res = predict_toxicity(req.text)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Toxicity analysis failed: {str(e)}")

@router.get("/comments", response_model=List[CommentModel])
async def get_comments(
    commentBy: Optional[str] = None,
    commentTo: Optional[str] = None,
    isToxic: Optional[bool] = None,
    query: Optional[str] = None
):
    filter_dict = {}
    if commentBy:
        filter_dict["commentBy"] = commentBy.strip().lower()
    if commentTo:
        filter_dict["commentTo"] = commentTo.strip().lower()
    if isToxic is not None:
        filter_dict["isToxic"] = isToxic
    if query:
        filter_dict["commentText"] = {"$regex": query, "$options": "i"}
        
    cursor = db.comments.find(filter_dict).sort("timestamp", -1)
    comments = await cursor.to_list(length=200)
    return comments

@router.get("/users")
async def get_users():
    # Return lists of all users in the system
    cursor = db.users.find({}, {"_id": 0})
    users = await cursor.to_list(length=100)
    return users

@router.get("/user/{username}")
async def get_user_profile(username: str):
    username = username.strip().lower()
    user = await get_or_create_user(username)
    
    # Fetch posts by user
    posts_cursor = db.posts.find({"username": username}).sort("timestamp", -1)
    posts = await posts_cursor.to_list(length=50)
    for p in posts:
        if "_id" in p:
            p["_id"] = str(p["_id"])
    
    # Fetch comments made by user
    comments_cursor = db.comments.find({"commentBy": username}).sort("timestamp", -1)
    comments = await comments_cursor.to_list(length=100)
    for c in comments:
        if "_id" in c:
            c["_id"] = str(c["_id"])
    
    # Calculate toxicity stats for this user
    toxic_comments = [c for c in comments if c.get("isToxic", False)]
    toxic_ratio = (len(toxic_comments) / len(comments) * 100) if comments else 0.0
    
    # Identify unique victims (commentTo) targeted by toxic comments
    victims = {}
    for c in toxic_comments:
        victim = c.get("commentTo")
        if victim:
            victims[victim] = victims.get(victim, 0) + 1
            
    victim_list = [{"username": v, "count": c} for v, c in victims.items()]
    victim_list.sort(key=lambda x: x["count"], reverse=True)
    
    # Calculate comments over time (timeline)
    now = datetime.utcnow()
    timeline_map = {}
    for i in range(7):
        day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        timeline_map[day] = {"total": 0, "toxic": 0}
        
    for c in comments:
        day_str = c.get("timestamp").strftime("%Y-%m-%d")
        if day_str in timeline_map:
            timeline_map[day_str]["total"] += 1
            if c.get("isToxic", False):
                timeline_map[day_str]["toxic"] += 1
                
    timeline = []
    for day in sorted(timeline_map.keys()):
        timeline.append({
            "date": day,
            "total": timeline_map[day]["total"],
            "toxic": timeline_map[day]["toxic"]
        })
        
    return {
        "profile": {
            "username": user["username"],
            "displayName": user["displayName"],
            "profilePic": user["profilePic"],
            "followers": user["followers"],
            "following": user["following"],
            "postsCount": len(posts),
            "status": user["status"]
        },
        "posts": posts,
        "comments": comments,
        "toxicPercentage": round(toxic_ratio, 1),
        "victimsTargeted": victim_list,
        "recentToxicComments": [
            {
                "commentId": c["commentId"],
                "postId": c["postId"],
                "commentTo": c["commentTo"],
                "commentText": c["commentText"],
                "toxicityScore": c["toxicityScore"],
                "timestamp": c["timestamp"]
            } for c in toxic_comments[:10]
        ],
        "timeline": timeline
    }

@router.get("/moderator/{username}")
async def get_moderator_user_summary(username: str):
    username = username.strip().lower()
    user = await get_or_create_user(username)
    
    # Fetch all comments made by the user
    comments_cursor = db.comments.find({"commentBy": username}).sort("timestamp", -1)
    comments = await comments_cursor.to_list(length=500)
    for c in comments:
        if "_id" in c:
            del c["_id"]
        if isinstance(c.get("timestamp"), datetime):
            c["timestamp"] = c["timestamp"].isoformat()
    
    # Analyze harassment using harassment module
    harassment_data = analyze_harassment(comments)
    
    # Fetch logs
    logs_cursor = db.moderation_logs.find({"targetUser": username}).sort("timestamp", -1)
    logs = await logs_cursor.to_list(length=20)
    
    # Clean logs for serialization
    logs_serialized = []
    for log in logs:
        logs_serialized.append({
            "logId": log["logId"],
            "action": log["action"],
            "moderator": log["moderator"],
            "reason": log["reason"],
            "details": log.get("details"),
            "timestamp": log["timestamp"].isoformat() if isinstance(log.get("timestamp"), datetime) else str(log.get("timestamp", ""))
        })
        
    return {
        "profile": {
            "username": user["username"],
            "displayName": user["displayName"],
            "profilePic": user["profilePic"],
            "status": user["status"]
        },
        "metrics": {
            "totalComments": harassment_data["totalComments"],
            "toxicCommentsCount": harassment_data["toxicCommentsCount"],
            "toxicRatio": harassment_data["toxicRatio"],
            "averageToxicity": harassment_data["averageToxicity"],
            "frequencyScore": harassment_data["frequencyScore"],
            "consecutiveDays": harassment_data["consecutiveDays"],
            "riskScore": harassment_data["riskScore"],
            "riskLevel": harassment_data["riskLevel"]
        },
        "repeatedHarassment": {
            "detected": harassment_data["repeatedHarassmentDetected"],
            "reason": harassment_data["repeatedHarassmentReason"]
        },
        "victimAnalysis": harassment_data["victimAnalysis"],
        "timeline": harassment_data["timeline"],
        "commentsHistory": comments,
        "logs": logs_serialized
    }

@router.delete("/comment/{commentId}")
async def delete_comment(commentId: str, username: Optional[str] = Query(None)):
    clean_user = (username or "admin").strip().lower()
    is_admin = clean_user in ["admin", "moderator", "safety_admin", "administrator"]
    
    comment = await db.comments.find_one({"commentId": commentId})
    if not comment:
        # Clean residual notifications if any
        await db.notifications.delete_many({"commentId": commentId})
        return {"status": "success", "message": "Comment not found or already deleted."}
        
    # Check authorization: comment author, post owner, or admin
    target_post = await db.posts.find_one({"postId": comment.get("postId")})
    is_post_owner = target_post and target_post.get("username") == clean_user
    is_comment_author = comment.get("commentBy") == clean_user
    
    if not (is_admin or is_post_owner or is_comment_author):
        raise HTTPException(status_code=403, detail="You can only delete your own comments unless you are the post owner or an Admin")
        
    res = await db.comments.delete_one({"commentId": commentId})
    await db.notifications.delete_many({"commentId": commentId})
    
    # Log moderation action
    if is_admin:
        log = {
            "logId": str(uuid.uuid4()),
            "action": "DELETE_COMMENT",
            "targetUser": comment.get("commentBy", "unknown"),
            "moderator": clean_user,
            "reason": "Admin permanently deleted comment.",
            "details": f"Comment Text: {comment.get('commentText', '')}",
            "timestamp": datetime.utcnow()
        }
        await db.moderation_logs.insert_one(log)
        
    return {"status": "success", "message": "Comment permanently deleted."}

@router.post("/warn")
async def warn_user(req: ActionRequest):
    username = req.username.strip().lower()
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Update status
    await db.users.update_one({"username": username}, {"$set": {"status": "Warned"}})
    
    # Log
    log = {
        "logId": str(uuid.uuid4()),
        "action": "WARN",
        "targetUser": username,
        "moderator": "AI_System",
        "reason": req.reason,
        "details": req.details,
        "timestamp": datetime.utcnow()
    }
    await db.moderation_logs.insert_one(log)
    return {"status": "success", "message": f"Warning issued to user {username}."}

@router.post("/suspend")
async def suspend_user(req: ActionRequest):
    username = req.username.strip().lower()
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Update status
    await db.users.update_one({"username": username}, {"$set": {"status": "Suspended"}})
    
    # Log
    log = {
        "logId": str(uuid.uuid4()),
        "action": "SUSPEND",
        "targetUser": username,
        "moderator": "AI_System",
        "reason": req.reason,
        "details": req.details,
        "timestamp": datetime.utcnow()
    }
    await db.moderation_logs.insert_one(log)
    return {"status": "success", "message": f"User {username} suspended."}

@router.post("/unsuspend")
async def unsuspend_user(req: ActionRequest):
    username = req.username.strip().lower()
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Update status
    await db.users.update_one({"username": username}, {"$set": {"status": "Normal"}})
    
    # Log
    log = {
        "logId": str(uuid.uuid4()),
        "action": "UNSUSPEND",
        "targetUser": username,
        "moderator": "AI_System",
        "reason": req.reason,
        "details": req.details,
        "timestamp": datetime.utcnow()
    }
    await db.moderation_logs.insert_one(log)
    return {"status": "success", "message": f"User {username} unsuspended."}

@router.post("/unwarn")
async def unwarn_user(req: ActionRequest):
    username = req.username.strip().lower()
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Reset status to Normal
    await db.users.update_one({"username": username}, {"$set": {"status": "Normal"}})
    
    # Log
    log = {
        "logId": str(uuid.uuid4()),
        "action": "UNWARN",
        "targetUser": username,
        "moderator": "Admin_Moderator",
        "reason": req.reason or "Warning revoked by moderator.",
        "details": req.details or "Account restored to Normal status without warning popup.",
        "timestamp": datetime.utcnow()
    }
    await db.moderation_logs.insert_one(log)
    return {"status": "success", "message": f"Warning revoked for user {username}. Status is now Normal."}

@router.post("/acknowledge")
async def acknowledge_warning(req: ActionRequest):
    username = req.username.strip().lower()
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Keep status as Warned
    await db.users.update_one({"username": username}, {"$set": {"status": "Warned"}})
    
    # Log moderation log reset
    log = {
        "logId": str(uuid.uuid4()),
        "action": "ACKNOWLEDGE_WARN",
        "targetUser": username,
        "moderator": "AI_System",
        "reason": "User acknowledged warning.",
        "details": "Status kept as Warned for safety tracking.",
        "timestamp": datetime.utcnow()
    }
    await db.moderation_logs.insert_one(log)
    return {"status": "success", "message": f"Warning acknowledged by user {username}."}
