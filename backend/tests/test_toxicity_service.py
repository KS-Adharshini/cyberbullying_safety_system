# /// script
# dependencies = [
#   "transformers",
#   "torch",
#   "langdetect",
#   "sacremoses",
#   "sentencepiece",
#   "accelerate"
# ]
# ///

import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.toxicity_service import load_all_models, predict_toxicity, predict_sentiment, predict_emotion, translate_to_english

def run_tests():
    print("Loading Hugging Face models for testing...")
    success = load_all_models()
    if not success:
        print("FAIL: Could not load models.")
        sys.exit(1)
        
    print("\n================== Running Tests ==================")

    # Test 1: Clearly Positive Sentence
    pos_res = predict_sentiment("This is a wonderful, amazing day! I am so happy.")
    print(f"Positive Test Input: 'This is a wonderful...' -> Sentiment: {pos_res}")
    assert pos_res["label"] == "Positive", f"Expected Positive, got {pos_res['label']}"
    assert pos_res["confidence"] > 0.5, "Expected confident positive sentiment"

    # Test 2: Clearly Negative Sentence
    neg_res = predict_sentiment("This is the worst product ever. I hate it.")
    print(f"Negative Test Input: 'This is the worst...' -> Sentiment: {neg_res}")
    assert neg_res["label"] == "Negative", f"Expected Negative, got {neg_res['label']}"
    assert neg_res["confidence"] > 0.5, "Expected confident negative sentiment"

    # Test 3: Clearly Toxic Sentence
    tox_res = predict_toxicity("You are an idiot and I hate you so much.")
    print(f"Toxic Test Input: 'You are an idiot...' -> Toxicity: {tox_res}")
    assert tox_res["isToxic"] == True, "Expected isToxic = True"
    assert tox_res["label"] == "TOXIC", "Expected label = TOXIC"

    # Test 4: Emotional Sentences (GoEmotions)
    joy_res = predict_emotion("I am so thrilled and excited about our vacation!")
    print(f"Joy Test Input: 'I am so thrilled...' -> Emotion: {joy_res}")
    assert joy_res["emotion"].lower() in ["joy", "excitement", "admiration", "love"], f"Expected joy/excitement, got {joy_res['emotion']}"

    fear_res = predict_emotion("I am terrified of what might happen in the dark.")
    print(f"Fear Test Input: 'I am terrified...' -> Emotion: {fear_res}")
    assert fear_res["emotion"].lower() == "fear", f"Expected fear, got {fear_res['emotion']}"

    print("\nALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
