import torch
from transformers import BartForConditionalGeneration, BartTokenizer, AdamW
import json
import os
import numpy as np
from typing import List, Dict, Any, Tuple, Optional

# Set device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Model paths
MODEL_BASE = "facebook/bart-large-cnn"  # Pre-trained model for summarization
FINETUNED_MODEL_PATH = "models/bart/finetuned_model"
QUIZ_GENERATION_MODEL_PATH = "models/bart/quiz_generation_model"

# Define learning speed parameters
LEARNING_SPEED_PARAMS = {
    "slow": {
        "summary_ratio": 0.2,  # 20% of original content
        "detail_level": "detailed",
        "min_length": 50,
        "max_length": 150,
        "question_count": 10
    },
    "moderate": {
        "summary_ratio": 0.3,  # 30% off original content
        "detail_level": "balanced",
        "min_length": 100,
        "max_length": 200,
        "question_count": 15
    },
    "fast": {
        "summary_ratio": 0.4,  # 40% of original content
        "detail_level": "concise",
        "min_length": 150,
        "max_length": 300,
        "question_count": 20
    }
}

class BartModelHandler:
    def __init__(self, model_path: str = None):
        """Initialize BART model with pre-trained weights or fine-tuned model"""
        self.tokenizer = BartTokenizer.from_pretrained(MODEL_BASE)
        
        # Load model from path if provided, otherwise use base model
        if model_path and os.path.exists(model_path):
            self.model = BartForConditionalGeneration.from_pretrained(model_path)
            print(f"Loaded fine-tuned model from {model_path}")
        else:
            self.model = BartForConditionalGeneration.from_pretrained(MODEL_BASE)
            print(f"Loaded base model {MODEL_BASE}")
            
        self.model.to(device)
        self.model.eval()  # Set to evaluation mode
        
    def generate_summary(self, content: str, learning_speed: str = "moderate") -> Dict[str, Any]:
        """Generate summary based on content and learning speed"""
        params = LEARNING_SPEED_PARAMS.get(learning_speed, LEARNING_SPEED_PARAMS["moderate"])
        
        # Tokenize input
        inputs = self.tokenizer.encode(
            "summarize: " + content, 
            return_tensors="pt", 
            max_length=1024, 
            truncation=True
        ).to(device)
        
        # Calculate target length based on content and learning speed
        content_words = len(content.split())
        target_length = int(content_words * params["summary_ratio"])
        min_length = min(params["min_length"], max(30, target_length // 2))
        max_length = min(params["max_length"], max(100, target_length * 2))
        
        # Generate summary
        summary_ids = self.model.generate(
            inputs,
            min_length=min_length,
            max_length=max_length,
            num_beams=4,
            length_penalty=2.0,
            early_stopping=True,
            no_repeat_ngram_size=3
        )
        
        summary = self.tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        
        return {
            "summary": summary,
            "detail_level": params["detail_level"],
            "learning_speed": learning_speed
        }
    
    def generate_quiz(self, content: str, learning_speed: str = "moderate") -> Dict[str, Any]:
        """Generate quiz based on content and learning speed"""
        params = LEARNING_SPEED_PARAMS.get(learning_speed, LEARNING_SPEED_PARAMS["moderate"])
        question_count = params["question_count"]
        
        # For a real implementation, we would use a specialized model for quiz generation
        # Here we'll use a simplified approach with the base model
        
        # Tokenize input with a special prefix for quiz generation
        inputs = self.tokenizer.encode(
            "generate quiz questions for: " + content, 
            return_tensors="pt", 
            max_length=1024, 
            truncation=True
        ).to(device)
        
        # Generate response
        output_ids = self.model.generate(
            inputs,
            max_length=512,
            num_beams=4,
            length_penalty=2.0,
            early_stopping=True,
            no_repeat_ngram_size=3
        )
        
        raw_output = self.tokenizer.decode(output_ids[0], skip_special_tokens=True)
        
        # In a real implementation, we would parse this into structured quiz questions
        # Here we'll return a mock structure based on the learning speed
        questions = []
        for i in range(1, question_count + 1):
            complexity = "Basic" if learning_speed == "slow" else "Intermediate" if learning_speed == "moderate" else "Advanced"
            questions.append({
                "id": f"q{i}",
                "text": f"{complexity} Question {i} based on the content",
                "options": [
                    f"Option A for question {i}",
                    f"Option B for question {i}",
                    f"Option C for question {i}", 
                    f"Option D for question {i}"
                ],
                "correct_option": np.random.randint(0, 4)
            })
        
        return {
            "title": "Generated Quiz",
            "description": f"A {learning_speed} pace quiz generated from the content",
            "questions": questions
        }
    
    def generate_flashcards(self, content: str, learning_speed: str = "moderate") -> Dict[str, Any]:
        """Generate flashcards based on content and learning speed"""
        # Adjust flashcards based on learning speed
        if learning_speed == "slow":
            card_count = 15
            detail_level = "detailed"
        elif learning_speed == "moderate":
            card_count = 10
            detail_level = "balanced"
        else:  # fast
            card_count = 7
            detail_level = "concise"
        
        # Tokenize input with a special prefix for flashcard generation
        inputs = self.tokenizer.encode(
            "extract key concepts and definitions from: " + content, 
            return_tensors="pt", 
            max_length=1024, 
            truncation=True
        ).to(device)
        
        # Generate response
        output_ids = self.model.generate(
            inputs,
            max_length=512,
            num_beams=4,
            length_penalty=2.0,
            early_stopping=True,
            no_repeat_ngram_size=3
        )
        
        raw_output = self.tokenizer.decode(output_ids[0], skip_special_tokens=True)
        
        # In a real implementation, we would parse this into structured flashcards
        # Here we'll return a mock structure based on the learning speed
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
    
    def fine_tune(self, train_data: List[Dict[str, str]], epochs: int = 3, batch_size: int = 4, learning_rate: float = 3e-5):
        """Fine-tune the BART model on custom data"""
        # Set model to training mode
        self.model.train()
        
        # Prepare optimizer
        optimizer = AdamW(self.model.parameters(), lr=learning_rate)
        
        # Training loop
        for epoch in range(epochs):
            total_loss = 0
            
            # Process in batches
            for i in range(0, len(train_data), batch_size):
                batch = train_data[i:i+batch_size]
                
                # Process each item in batch
                for item in batch:
                    # Tokenize input and target
                    inputs = self.tokenizer.encode(
                        item["source_text"], 
                        return_tensors="pt", 
                        max_length=1024, 
                        truncation=True
                    ).to(device)
                    
                    targets = self.tokenizer.encode(
                        item["target_text"], 
                        return_tensors="pt", 
                        max_length=512, 
                        truncation=True
                    ).to(device)
                    
                    # Forward pass
                    outputs = self.model(input_ids=inputs, labels=targets)
                    loss = outputs.loss
                    
                    # Backward pass
                    loss.backward()
                    total_loss += loss.item()
                
                # Update parameters
                optimizer.step()
                optimizer.zero_grad()
                
            # Print epoch results
            print(f"Epoch {epoch+1}/{epochs}, Loss: {total_loss/len(train_data)}")
        
        # Save fine-tuned model
        self.model.save_pretrained(FINETUNED_MODEL_PATH)
        self.tokenizer.save_pretrained(FINETUNED_MODEL_PATH)
        print(f"Model saved to {FINETUNED_MODEL_PATH}")
        
        # Return to evaluation mode
        self.model.eval()

# Example training data structure
# train_data = [
#     {
#         "source_text": "Original lecture content...",
#         "target_text": "Summarized content..."
#     },
#     ...
# ]

# Usage examples
if __name__ == "__main__":
    # Initialize model
    bart_handler = BartModelHandler()
    
    # Example content
    sample_content = """
    Object-Oriented Programming (OOP) is a programming paradigm based on the concept of "objects", 
    which can contain data and code: data in the form of fields (often known as attributes or properties), 
    and code, in the form of procedures (often known as methods). A feature of objects is that an object's 
    own procedures can access and often modify the data fields of itself. In OOP, computer programs are 
    designed by making them out of objects that interact with one another. OOP languages are diverse, 
    but the most popular ones are class-based, meaning that objects are instances of classes, which also 
    determine their types.
    """
    
    # Generate summary
    summary = bart_handler.generate_summary(sample_content, "moderate")
    print("SUMMARY:")
    print(summary["summary"])
    print("\n")
    
    # Generate quiz
    quiz = bart_handler.generate_quiz(sample_content, "fast")
    print("QUIZ:")
    print(json.dumps(quiz, indent=2))
    print("\n")
    
    # Generate flashcards
    flashcards = bart_handler.generate_flashcards(sample_content, "slow")
    print("FLASHCARDS:")
    print(json.dumps(flashcards, indent=2)) 