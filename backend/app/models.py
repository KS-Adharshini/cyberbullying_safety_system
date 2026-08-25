from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class UserModel(BaseModel):
    username: str = Field(..., description="Unique username")
    displayName: str
    profilePic: str
    followers: int = 0
    following: int = 0
    postsCount: int = 0
    status: str = "Normal"  # Normal, Warned, Suspended
    joinedAt: datetime = Field(default_factory=datetime.utcnow)

class PostModel(BaseModel):
    postId: str
    username: str
    profilePic: str
    location: str
    postImage: str
    caption: str
    likes: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class PostCreate(BaseModel):
    username: str
    caption: str = ""
    location: str = "World"
    postImage: str = "" # base64 or URL
    extractedText: Optional[str] = None

from typing import List, Optional, Dict, Any, Union

class CommentCreate(BaseModel):
    postId: str
    commentBy: str
    commentText: str
    language: Optional[str] = None
    translatedText: Optional[str] = None
    toxicityScore: Optional[float] = None
    isToxic: Optional[bool] = None
    toxicity: Optional[Dict[str, Any]] = None
    sentiment: Optional[Union[str, Dict[str, Any]]] = None
    emotion: Optional[Dict[str, Any]] = None

class CommentModel(BaseModel):
    commentId: str
    postId: str
    commentBy: str
    commentTo: str
    commentText: str
    toxicityScore: float
    isToxic: bool
    sentiment: Union[str, Dict[str, Any]]
    originalText: Optional[str] = None
    translatedText: Optional[str] = None
    language: Optional[str] = None
    toxicity: Optional[Dict[str, Any]] = None
    emotion: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ModerationLogModel(BaseModel):
    logId: str
    action: str  # WARN, SUSPEND, DELETE_COMMENT, HIDE_COMMENT, IGNORE_COMMENT
    targetUser: str
    moderator: str = "AI_System"
    reason: str
    details: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ActionRequest(BaseModel):
    username: str
    reason: str
    details: Optional[str] = None

class CommentActionRequest(BaseModel):
    commentId: str
    action: str  # DELETE, HIDE, IGNORE
    reason: Optional[str] = None
