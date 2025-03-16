import sys
import json
from typing import Dict, Any, Optional

# Import model bridge functionality
from model_bridge import (
    generate_summary,
    generate_quiz,
    generate_flashcards,
    classify_user
)

def handle_request(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle incoming request from Node.js and route to appropriate model function
    
    Args:
        request_data: Dictionary containing action and parameters
        
    Returns:
        Response data to be returned to Node.js
    """
    action = request_data.get("action", "")
    params = request_data.get("params", {})
    request_id = request_data.get("request_id", "unknown")
    
    response = {
        "success": False,
        "request_id": request_id,
        "error": None,
        "data": None
    }
    
    try:
        if action == "generate_summary":
            content = params.get("content", "")
            learning_speed = params.get("learning_speed", "moderate")
            
            summary_data = generate_summary(content, learning_speed)
            response["data"] = summary_data
            response["success"] = True
            
        elif action == "generate_quiz":
            content = params.get("content", "")
            learning_speed = params.get("learning_speed", "moderate")
            
            quiz_data = generate_quiz(content, learning_speed)
            response["data"] = quiz_data
            response["success"] = True
            
        elif action == "generate_flashcards":
            content = params.get("content", "")
            learning_speed = params.get("learning_speed", "moderate")
            
            flashcards_data = generate_flashcards(content, learning_speed)
            response["data"] = flashcards_data
            response["success"] = True
            
        elif action == "classify_user":
            responses = params.get("responses", {})
            
            classification = classify_user(responses)
            response["data"] = {"learning_speed": classification}
            response["success"] = True
            
        else:
            response["error"] = f"Unknown action: {action}"
            
    except Exception as e:
        response["error"] = str(e)
        
    return response

def main():
    """
    Main entry point for the bridge server
    
    Reads JSON request from stdin and writes JSON response to stdout
    """
    try:
        # Read request from stdin
        request_json = ""
        for line in sys.stdin:
            request_json += line
            
        if not request_json:
            print(json.dumps({"error": "No input received"}))
            return
            
        # Parse request
        request_data = json.loads(request_json)
        
        # Handle request
        response = handle_request(request_data)
        
        # Write response to stdout
        print(json.dumps(response))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Bridge server error: {str(e)}"
        }))

if __name__ == "__main__":
    main() 