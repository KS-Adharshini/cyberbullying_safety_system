from datetime import datetime, timedelta
from typing import List, Dict, Any

def parse_ts(ts) -> datetime:
    if isinstance(ts, datetime):
        return ts
    if isinstance(ts, str):
        try:
            return datetime.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            return datetime.utcnow()
    return datetime.utcnow()

def calculate_consecutive_days(timestamps: List[datetime]) -> int:
    """
    Calculates the maximum consecutive days with toxic comments.
    """
    if not timestamps:
        return 0
        
    # Extract unique dates sorted
    dates = sorted(list(set(parse_ts(ts).date() for ts in timestamps)))
    
    max_consec = 1
    current_consec = 1
    
    for i in range(1, len(dates)):
        # Check if the date is exactly 1 day after the previous date
        if dates[i] - dates[i-1] == timedelta(days=1):
            current_consec += 1
        else:
            max_consec = max(max_consec, current_consec)
            current_consec = 1
            
    max_consec = max(max_consec, current_consec)
    return max_consec

def analyze_harassment(comments: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes harassment statistics, risk scores, and alerts for a user's comment history.
    """
    total_comments = len(comments)
    if total_comments == 0:
        return {
            "totalComments": 0,
            "toxicCommentsCount": 0,
            "toxicRatio": 0.0,
            "averageToxicity": 0.0,
            "frequencyScore": 0.0,
            "consecutiveDays": 0,
            "consecutiveScore": 0.0,
            "riskScore": 0.0,
            "riskLevel": "Low",
            "repeatedHarassmentDetected": False,
            "repeatedHarassmentReason": "",
            "victimAnalysis": [],
            "commentsPerDay": {}
        }
        
    toxic_comments = [c for c in comments if c.get("isToxic", False)]
    toxic_count = len(toxic_comments)
    
    # 1. Toxic Comment Ratio (0.0 to 100.0)
    toxic_ratio = (toxic_count / total_comments) * 100.0
    
    # 2. Average Toxicity (0.0 to 100.0)
    avg_toxicity = (sum(c.get("toxicityScore", 0.0) for c in comments) / total_comments) * 100.0
    
    # 3. Frequency Score (0.0 to 100.0)
    # Toxic comments count in the last 7 days.
    # Map: 10+ toxic comments in 7 days = 100 points, otherwise linear scaling.
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    recent_toxic = [c for c in toxic_comments if parse_ts(c.get("timestamp")) >= seven_days_ago]
    recent_toxic_count = len(recent_toxic)
    frequency_score = min((recent_toxic_count / 10.0) * 100.0, 100.0)
    
    # 4. Consecutive Toxic Days Score (0.0 to 100.0)
    # Max consecutive days with at least one toxic comment.
    # Map: 5+ consecutive days = 100 points, otherwise linear scaling.
    toxic_timestamps = [c.get("timestamp") for c in toxic_comments]
    consecutive_days = calculate_consecutive_days(toxic_timestamps)
    consecutive_score = min((consecutive_days / 5.0) * 100.0, 100.0)
    
    # Risk Score calculation:
    # 40% Toxic Comment Ratio + 25% Average Toxicity + 20% Frequency + 15% Consecutive Days
    risk_score = (
        (0.40 * toxic_ratio) +
        (0.25 * avg_toxicity) +
        (0.20 * frequency_score) +
        (0.15 * consecutive_score)
    )
    risk_score = round(min(max(risk_score, 0.0), 100.0), 1)
    
    # Risk Level mapping
    if risk_score < 25:
        risk_level = "Low"
    elif risk_score < 50:
        risk_level = "Medium"
    elif risk_score < 75:
        risk_level = "High"
    else:
        risk_level = "Critical"
        
    # Victim Analysis: count toxic comments directed to each victim (commentTo)
    victim_map = {}
    for c in toxic_comments:
        victim = c.get("commentTo")
        if victim:
            victim_map[victim] = victim_map.get(victim, 0) + 1
            
    victim_analysis = []
    for victim, count in victim_map.items():
        victim_analysis.append({
            "username": victim,
            "toxicCount": count
        })
    # Sort victims by toxic count descending
    victim_analysis.sort(key=lambda x: x["toxicCount"], reverse=True)
    
    # Repeated Harassment Detection:
    # Check if a user has targeted the same person within a 7-day window.
    # Specifically, we look for sliding 7-day windows directed to the same commentTo.
    repeated_detected = False
    repeated_reason = ""
    
    # Group toxic comments by target user
    toxic_by_target = {}
    for c in toxic_comments:
        target = c.get("commentTo")
        if target:
            toxic_by_target.setdefault(target, []).append(c)
            
    for target, target_comments in toxic_by_target.items():
        # Sort by timestamp
        target_comments.sort(key=lambda x: parse_ts(x["timestamp"]))
        
        # Sliding window check
        n = len(target_comments)
        for i in range(n):
            window = []
            start_time = parse_ts(target_comments[i]["timestamp"])
            limit_time = start_time + timedelta(days=7)
            
            for j in range(i, n):
                if parse_ts(target_comments[j]["timestamp"]) <= limit_time:
                    window.append(target_comments[j])
                else:
                    break
                    
            if len(window) >= 3:  # Threshold for repeated attacks in 7 days
                repeated_detected = True
                days_span = (parse_ts(window[-1]["timestamp"]) - parse_ts(window[0]["timestamp"])).days
                if days_span == 0:
                    days_span = 1
                repeated_reason = f"Repeatedly targeted {target} - {len(window)} toxic comments within {days_span} days"
                break  # Alert on first violation found
        if repeated_detected:
            break
            
    # Timeline data: Count comments (total & toxic) per day for the last 14 days
    comments_per_day = {}
    for i in range(14):
        day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        comments_per_day[day] = {"total": 0, "toxic": 0}
        
    for c in comments:
        day_str = parse_ts(c.get("timestamp")).strftime("%Y-%m-%d")
        if day_str in comments_per_day:
            comments_per_day[day_str]["total"] += 1
            if c.get("isToxic", False):
                comments_per_day[day_str]["toxic"] += 1
                
    # Format timeline for Recharts (Chronological order)
    timeline = []
    for day in sorted(comments_per_day.keys()):
        timeline.append({
            "date": day,
            "total": comments_per_day[day]["total"],
            "toxic": comments_per_day[day]["toxic"]
        })
        
    return {
        "totalComments": total_comments,
        "toxicCommentsCount": toxic_count,
        "toxicRatio": round(toxic_ratio, 1),
        "averageToxicity": round(avg_toxicity, 1),
        "frequencyScore": round(frequency_score, 1),
        "consecutiveDays": consecutive_days,
        "consecutiveScore": round(consecutive_score, 1),
        "riskScore": risk_score,
        "riskLevel": risk_level,
        "repeatedHarassmentDetected": repeated_detected,
        "repeatedHarassmentReason": repeated_reason,
        "victimAnalysis": victim_analysis,
        "timeline": timeline
    }
