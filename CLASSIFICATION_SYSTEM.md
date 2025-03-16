# User Classification System Documentation

This document outlines the implementation of the user classification system and adaptive content generation in the Study Buddy e-learning platform.

## Overview

The platform now includes a mandatory classification test for new users that determines their learning speed. Based on this classification, the system adapts content generation (quizzes, summaries, flashcards) to match the user's learning style.

## User Classification Flow

1. **New User Registration**:

   - When a user signs up, the system sets `is_classified = false` in the user's profile.
   - Default learning speed is set to "moderate".

2. **Classification Test**:

   - New users are automatically redirected to the classification test page (`/classification-test`).
   - The test consists of 5 questions to gauge the user's learning preferences and speed.
   - Users must complete the test before accessing other platform features.

3. **Classification Logic**:

   - Users are classified into one of three categories: "slow", "moderate", or "fast".
   - Classification is determined by analyzing the user's responses using either:
     - Simple frequency-based classification (current implementation)
     - XGBoost classification model (to be fully implemented)

4. **Profile Update**:
   - After completing the test, the user's profile is updated with their learning speed.
   - The `is_classified` field is set to `true`.

## Adaptive Content Generation

### Summaries

Summaries are adapted based on the user's learning speed:

- **Slow**: More detailed summaries (40% of original content)
- **Moderate**: Balanced summaries (30% of original content)
- **Fast**: Concise summaries focusing on key points (20% of original content)

### Quizzes

Quizzes are adapted in several ways:

- **Question Count**:

  - Slow: 10 questions
  - Moderate: 15 questions
  - Fast: 20 questions

- **Question Complexity**:
  - Slow: Basic questions with more detailed wording
  - Moderate: Intermediate difficulty
  - Fast: Advanced questions that challenge deeper understanding

### Flashcards

Flashcards are adapted based on the user's learning speed:

- **Number of Flashcards**:

  - Slow: 15 flashcards (breaking down content into smaller chunks)
  - Moderate: 10 flashcards
  - Fast: 7 flashcards (more concise coverage of material)

- **Detail Level**:
  - Slow: Detailed explanations on both front and back
  - Moderate: Balanced detail
  - Fast: Concise key points

## Content Caching

All generated content (quizzes, summaries, flashcards) is cached in Supabase based on:

1. The slide ID
2. The user's learning speed classification

This caching system:

- Reduces redundant processing of the same content
- Improves response time for frequently accessed content
- Maintains separate caches for each learning speed to ensure appropriate content delivery

## Manual Generation Option

Users always have the option to manually generate content regardless of their classification status:

- For unclassified users, content is generated using the default "moderate" setting
- Links to take the classification test are provided to encourage personalization

## Technical Implementation

### Database Schema

The classification system requires the following database structure:

- `profiles` table with `learning_speed` and `is_classified` fields
- `cached_quizzes` table with `slide_id` and `learning_speed` as unique keys
- `cached_summaries` table with similar structure
- `cached_flashcards` table with similar structure

### API Endpoints

The following API endpoints support the classification system:

- **POST /api/quizzes**: Generates quizzes adapted to the user's learning speed
- **POST /api/summary**: Generates summaries adapted to the user's learning speed
- **POST /api/flashcards**: Generates flashcards adapted to the user's learning speed
- **PUT /api/quizzes**: Processes classification test submissions

### Middleware

The system includes middleware that:

- Redirects unclassified users to the classification test page
- Allows authenticated users to access their profile data
- Ensures authentication for protected routes

## AI Model Integration

The system incorporates two primary AI models:

1. **BART Model** (for content generation):

   - Used for generating summaries, quizzes, and flashcards
   - Configured with different parameters based on learning speed

2. **XGBoost Model** (for user classification):
   - Analyzes user responses to classification test
   - Predicts the most suitable learning speed category

## Future Enhancements

Planned improvements for the classification system:

- More sophisticated classification algorithm with additional factors
- Periodic reassessment option for users to update their learning profile
- More fine-grained adaptations based on subject matter and user progress
- Adaptive difficulty progression based on quiz performance
