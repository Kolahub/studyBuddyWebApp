import os
import sys
from typing import Dict, Any, List

# Add the models directory to the path to import the model classes
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import model handlers
from models.bart.bart_model import BartModelHandler
from models.xgboost.xgboost_classifier import UserClassifier

# Singleton instances to prevent loading models multiple times
bart_handler = None
classifier = None

def get_bart_handler():
    """Get or initialize the BART model handler"""
    global bart_handler
    if bart_handler is None:
        try:
            bart_handler = BartModelHandler()
        except Exception as e:
            print(f"Error initializing BART model: {e}")
            return None
    return bart_handler

def get_user_classifier():
    """Get or initialize the user classifier"""
    global classifier
    if classifier is None:
        try:
            classifier = UserClassifier()
        except Exception as e:
            print(f"Error initializing user classifier: {e}")
            return None
    return classifier

def generate_summary(content: str, learning_speed: str = "moderate") -> Dict[str, Any]:
    """
    Generate a summary using the BART model
    
    Args:
        content: The content to summarize
        learning_speed: The user's learning speed ("slow", "moderate", "fast")
        
    Returns:
        Dictionary containing the summary and metadata
    """
    handler = get_bart_handler()
    
    # Use mock function if handler is not available
    if handler is None:
        return _mock_summary(content, learning_speed)
        
    try:
        return handler.generate_summary(content, learning_speed)
    except Exception as e:
        print(f"Error generating summary: {e}")
        return _mock_summary(content, learning_speed)

def generate_quiz(content: str, learning_speed: str = "moderate") -> Dict[str, Any]:
    """
    Generate a quiz using the BART model
    
    Args:
        content: The content to create a quiz from
        learning_speed: The user's learning speed ("slow", "moderate", "fast")
        
    Returns:
        Dictionary containing the quiz questions and metadata
    """
    handler = get_bart_handler()
    
    # Use mock function if handler is not available
    if handler is None:
        return _mock_quiz(content, learning_speed)
        
    try:
        return handler.generate_quiz(content, learning_speed)
    except Exception as e:
        print(f"Error generating quiz: {e}")
        return _mock_quiz(content, learning_speed)

def generate_flashcards(content: str, learning_speed: str = "moderate") -> Dict[str, Any]:
    """
    Generate flashcards using the BART model
    
    Args:
        content: The content to create flashcards from
        learning_speed: The user's learning speed ("slow", "moderate", "fast")
        
    Returns:
        Dictionary containing the flashcards and metadata
    """
    handler = get_bart_handler()
    
    # Use mock function if handler is not available
    if handler is None:
        return _mock_flashcards(content, learning_speed)
        
    try:
        return handler.generate_flashcards(content, learning_speed)
    except Exception as e:
        print(f"Error generating flashcards: {e}")
        return _mock_flashcards(content, learning_speed)

def classify_user(responses: Dict[int, str]) -> str:
    """
    Classify user based on test responses
    
    Args:
        responses: Dictionary mapping question IDs to response values
        
    Returns:
        Classification result: 'slow', 'moderate', or 'fast'
    """
    user_classifier = get_user_classifier()
    
    # Use rule-based classification if classifier is not available
    if user_classifier is None:
        return _rule_based_classification(responses)
        
    try:
        return user_classifier.classify(responses)
    except Exception as e:
        print(f"Error classifying user: {e}")
        return _rule_based_classification(responses)

# Mock functions for when models are not available
def _mock_summary(content: str, learning_speed: str) -> Dict[str, Any]:
    """Mock summary generation"""
    # Adjust the summary based on learning speed
    if learning_speed == "slow":
        detail_level = "detailed"
        ratio = "40%"
    elif learning_speed == "moderate":
        detail_level = "balanced"
        ratio = "30%"
    else:  # fast
        detail_level = "concise"
        ratio = "20%"
        
    word_count = len(content.split())
    target_length = int(word_count * (0.4 if learning_speed == "slow" else 0.3 if learning_speed == "moderate" else 0.2))
    
    return {
        "summary": f"This is a {detail_level} summary of the content, which would be about {target_length} words ({ratio} of the original).",
        "detail_level": detail_level,
        "learning_speed": learning_speed
    }

def _mock_quiz(content: str, learning_speed: str) -> Dict[str, Any]:
    """Mock quiz generation"""
    question_count = 10 if learning_speed == "slow" else 15 if learning_speed == "moderate" else 20
    complexity = "Basic" if learning_speed == "slow" else "Intermediate" if learning_speed == "moderate" else "Advanced"
    
    questions = []
    for i in range(1, question_count + 1):
        questions.append({
            "id": f"q{i}",
            "text": f"{complexity} Question {i} about the content",
            "options": [
                f"Option A for question {i}",
                f"Option B for question {i}",
                f"Option C for question {i}",
                f"Option D for question {i}"
            ],
            "correct_option": (i % 4)  # Simple pattern for correct answer
        })
    
    return {
        "title": "Generated Quiz",
        "description": f"A {learning_speed} pace quiz generated from the content",
        "questions": questions
    }

def _mock_flashcards(content: str, learning_speed: str) -> Dict[str, Any]:
    """Mock flashcard generation"""
    if learning_speed == "slow":
        card_count = 15
        detail_level = "detailed"
    elif learning_speed == "moderate":
        card_count = 10
        detail_level = "balanced"
    else:  # fast
        card_count = 7
        detail_level = "concise"
    
    flashcards = []
    for i in range(1, card_count + 1):
        flashcards.append({
            "id": f"card-{i}",
            "front": f"{detail_level.capitalize()} Concept {i}",
            "back": f"{'Detailed' if detail_level == 'detailed' else 'Clear' if detail_level == 'balanced' else 'Concise'} explanation of concept {i}.",
            "difficulty": "basic" if learning_speed == "slow" else "intermediate" if learning_speed == "moderate" else "advanced"
        })
    
    return {
        "flashcards": flashcards,
        "detail_level": detail_level,
        "learning_speed": learning_speed
    }

def _rule_based_classification(responses: Dict[int, str]) -> str:
    """Simple rule-based classification"""
    # Count occurrences of each learning speed
    counts = {"slow": 0, "moderate": 0, "fast": 0}
    
    for response in responses.values():
        if response in counts:
            counts[response] += 1
            
    # Find the most common learning speed
    max_count = 0
    classification = "moderate"  # Default
    
    for speed, count in counts.items():
        if count > max_count:
            max_count = count
            classification = speed
            
    return classification 