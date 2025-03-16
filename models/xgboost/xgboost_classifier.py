import numpy as np
import pandas as pd
import xgboost as xgb
import json
import os
import pickle
from typing import Dict, List, Any, Union
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

# Model paths
MODEL_PATH = "models/xgboost/learning_speed_classifier.model"
FEATURE_ENCODER_PATH = "models/xgboost/feature_encoder.pkl"

class UserClassifier:
    def __init__(self, load_model: bool = True):
        """Initialize XGBoost classifier for user learning speed classification"""
        self.model = None
        self.feature_encoder = None
        
        if load_model and os.path.exists(MODEL_PATH):
            self.load_model()
        else:
            self.model = xgb.XGBClassifier(
                objective='multi:softmax',
                num_class=3,  # slow, moderate, fast
                learning_rate=0.1,
                max_depth=4,
                n_estimators=100,
                subsample=0.8,
                colsample_bytree=0.8
            )
            
    def load_model(self):
        """Load trained model and feature encoder"""
        try:
            self.model = xgb.XGBClassifier()
            self.model.load_model(MODEL_PATH)
            
            with open(FEATURE_ENCODER_PATH, 'rb') as f:
                self.feature_encoder = pickle.load(f)
                
            print(f"Model loaded from {MODEL_PATH}")
        except Exception as e:
            print(f"Error loading model: {e}")
            # Initialize a new model if loading fails
            self.model = xgb.XGBClassifier(
                objective='multi:softmax',
                num_class=3,  # slow, moderate, fast
                learning_rate=0.1,
                max_depth=4,
                n_estimators=100,
                subsample=0.8,
                colsample_bytree=0.8
            )
            
    def save_model(self):
        """Save trained model and feature encoder"""
        if self.model is not None:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
            
            # Save model
            self.model.save_model(MODEL_PATH)
            
            # Save feature encoder
            with open(FEATURE_ENCODER_PATH, 'wb') as f:
                pickle.dump(self.feature_encoder, f)
                
            print(f"Model saved to {MODEL_PATH}")
            
    def _preprocess_test_responses(self, responses: Dict[str, Any]) -> pd.DataFrame:
        """
        Preprocess test responses for model input
        
        Args:
            responses: Dictionary of user responses
            
        Returns:
            DataFrame with preprocessed features
        """
        # Extract features from responses
        features = {}
        
        # If we have a feature encoder, use it for consistent encoding
        if self.feature_encoder is not None:
            for question_id, response in responses.items():
                if question_id in self.feature_encoder:
                    encoding = self.feature_encoder[question_id]
                    if response in encoding:
                        features[f"q{question_id}_slow"] = 1 if encoding[response] == "slow" else 0
                        features[f"q{question_id}_moderate"] = 1 if encoding[response] == "moderate" else 0
                        features[f"q{question_id}_fast"] = 1 if encoding[response] == "fast" else 0
        else:
            # Simple one-hot encoding for each response
            for question_id, response in responses.items():
                # Encode response directly (assuming responses are 'slow', 'moderate', 'fast')
                features[f"q{question_id}_{response}"] = 1
                
                # Set others to 0
                for speed in ["slow", "moderate", "fast"]:
                    if speed != response:
                        features[f"q{question_id}_{speed}"] = 0
        
        # Convert to DataFrame
        return pd.DataFrame([features])
        
    def classify(self, responses: Dict[int, str]) -> str:
        """
        Classify user based on test responses
        
        Args:
            responses: Dictionary mapping question IDs to response values
            
        Returns:
            Classification result: 'slow', 'moderate', or 'fast'
        """
        # If model not available, use rule-based classification
        if self.model is None or self.feature_encoder is None:
            return self._rule_based_classification(responses)
            
        try:
            # Preprocess responses
            features = self._preprocess_test_responses(responses)
            
            # Make prediction
            prediction = self.model.predict(features)[0]
            
            # Map numeric prediction to class label
            speed_mapping = {0: "slow", 1: "moderate", 2: "fast"}
            return speed_mapping.get(prediction, "moderate")  # Default to moderate
            
        except Exception as e:
            print(f"Error during classification: {e}")
            # Fallback to rule-based classification
            return self._rule_based_classification(responses)
            
    def _rule_based_classification(self, responses: Dict[int, str]) -> str:
        """
        Simple rule-based classification when model is not available
        
        Args:
            responses: Dictionary mapping question IDs to response values
            
        Returns:
            Classification result: 'slow', 'moderate', or 'fast'
        """
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
        
    def train(self, training_data: List[Dict[str, Any]]):
        """
        Train the XGBoost classifier
        
        Args:
            training_data: List of dictionaries with 'responses' and 'classification' keys
        """
        # Prepare feature encoder
        self.feature_encoder = {}
        
        # Extract features and labels
        X_data = []
        y_data = []
        
        speed_mapping = {"slow": 0, "moderate": 1, "fast": 2}
        
        for data_point in training_data:
            responses = data_point["responses"]
            classification = data_point["classification"]
            
            # Encode features
            features = {}
            
            # Build feature encoder
            for question_id, response in responses.items():
                if question_id not in self.feature_encoder:
                    self.feature_encoder[question_id] = {}
                    
                self.feature_encoder[question_id][response] = response
                
                # One-hot encode each response
                features[f"q{question_id}_{response}"] = 1
                
                # Set others to 0
                for speed in ["slow", "moderate", "fast"]:
                    if speed != response:
                        features[f"q{question_id}_{speed}"] = 0
            
            X_data.append(features)
            y_data.append(speed_mapping.get(classification, 1))  # Default to moderate (1)
            
        # Convert to DataFrame
        X = pd.DataFrame(X_data)
        y = np.array(y_data)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train model
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        report = classification_report(y_test, y_pred, target_names=["slow", "moderate", "fast"])
        
        print(f"Model trained with accuracy: {accuracy:.4f}")
        print(report)
        
        # Save the model
        self.save_model()

# Sample training data structure
sample_training_data = [
    {
        "responses": {
            1: "slow",
            2: "slow",
            3: "moderate",
            4: "slow",
            5: "moderate"
        },
        "classification": "slow"
    },
    {
        "responses": {
            1: "moderate",
            2: "moderate",
            3: "moderate",
            4: "fast",
            5: "moderate"
        },
        "classification": "moderate"
    },
    {
        "responses": {
            1: "fast",
            2: "fast",
            3: "fast",
            4: "moderate",
            5: "fast"
        },
        "classification": "fast"
    }
]

# Usage example
if __name__ == "__main__":
    # Create classifier
    classifier = UserClassifier(load_model=False)
    
    # Generate more sample data for training
    extended_training_data = []
    
    # Add original samples
    extended_training_data.extend(sample_training_data)
    
    # Generate additional samples for each class
    for classification in ["slow", "moderate", "fast"]:
        for _ in range(30):  # Generate 30 samples per class
            # Create responses with bias toward the classification
            responses = {}
            for q_id in range(1, 6):
                # 70% chance of matching the classification, 30% chance of random
                if np.random.random() < 0.7:
                    responses[q_id] = classification
                else:
                    responses[q_id] = np.random.choice(["slow", "moderate", "fast"])
                    
            extended_training_data.append({
                "responses": responses,
                "classification": classification
            })
    
    # Train model
    print("Training XGBoost classifier...")
    classifier.train(extended_training_data)
    
    # Test with sample responses
    test_responses = {
        1: "slow",
        2: "slow",
        3: "moderate",
        4: "slow",
        5: "moderate"
    }
    
    classification = classifier.classify(test_responses)
    print(f"Classification result: {classification}")
    
    # Test with another sample
    test_responses2 = {
        1: "fast",
        2: "fast",
        3: "moderate",
        4: "fast",
        5: "moderate"
    }
    
    classification2 = classifier.classify(test_responses2)
    print(f"Classification result: {classification2}") 