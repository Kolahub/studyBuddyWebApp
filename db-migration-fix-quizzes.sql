-- This script adds missing columns to the quizzes table
-- Run this in your Supabase SQL editor

-- First, let's make sure all required columns exist and have proper null/default settings
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS description TEXT DEFAULT 'Generated quiz';
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS slide_id UUID;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS course_id TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS questions JSONB;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'moderate';
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS submitted BOOLEAN DEFAULT FALSE;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 20;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 0;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Remove NOT NULL constraints temporarily to make inserts easier
ALTER TABLE quizzes ALTER COLUMN title DROP NOT NULL;
ALTER TABLE quizzes ALTER COLUMN slide_id DROP NOT NULL;
ALTER TABLE quizzes ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE quizzes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE quizzes ALTER COLUMN questions DROP NOT NULL;
ALTER TABLE quizzes ALTER COLUMN time_limit DROP NOT NULL;

-- Enable RLS on quizzes table if not already enabled
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first to avoid errors
DROP POLICY IF EXISTS "Users can view their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can insert their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can update their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can delete their own quizzes" ON quizzes;

-- Create RLS policies for quizzes
CREATE POLICY "Users can view their own quizzes"
  ON quizzes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quizzes"
  ON quizzes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quizzes"
  ON quizzes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quizzes"
  ON quizzes FOR DELETE
  USING (auth.uid() = user_id);

-- Now check if the quiz_submissions table exists and create if needed
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '{}'::jsonb,
  score INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(quiz_id, user_id)
);

-- Enable RLS on quiz_submissions
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first to avoid errors
DROP POLICY IF EXISTS "Users can view their own quiz submissions" ON quiz_submissions;
DROP POLICY IF EXISTS "Users can insert their own quiz submissions" ON quiz_submissions;

-- Create RLS policies for quiz_submissions
CREATE POLICY "Users can view their own quiz submissions"
  ON quiz_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz submissions"
  ON quiz_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add triggers to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_quizzes_updated_at ON quizzes;
CREATE TRIGGER update_quizzes_updated_at
BEFORE UPDATE ON quizzes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 