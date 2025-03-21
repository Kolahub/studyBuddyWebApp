-- This script fixes the quiz_submissions table structure and permissions
-- Run this in your Supabase SQL editor

-- First, check if the table exists and create it if needed with proper defaults
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '[]'::jsonb,
  score INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(quiz_id, user_id)
);

-- If the table already exists, modify columns to ensure they have proper defaults
ALTER TABLE quiz_submissions ALTER COLUMN answers SET DEFAULT '[]'::jsonb;
ALTER TABLE quiz_submissions ALTER COLUMN score SET DEFAULT 0;

-- Remove any NOT NULL constraints that might be causing issues
ALTER TABLE quiz_submissions ALTER COLUMN answers DROP NOT NULL;
ALTER TABLE quiz_submissions ALTER COLUMN score DROP NOT NULL;

-- Enable Row Level Security on quiz_submissions
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid errors
DROP POLICY IF EXISTS "Users can view their own quiz submissions" ON quiz_submissions;
DROP POLICY IF EXISTS "Users can insert their own quiz submissions" ON quiz_submissions;
DROP POLICY IF EXISTS "Users can update their own quiz submissions" ON quiz_submissions;

-- Create RLS policies for quiz_submissions with proper permissions
CREATE POLICY "Users can view their own quiz submissions"
  ON quiz_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz submissions"
  ON quiz_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz submissions"
  ON quiz_submissions FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id ON quiz_submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_user_id ON quiz_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_submitted_at ON quiz_submissions(submitted_at);

-- Add trigger for updating timestamps if needed
CREATE OR REPLACE FUNCTION update_submitted_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.submitted_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_quiz_submissions_timestamp ON quiz_submissions;
CREATE TRIGGER update_quiz_submissions_timestamp
BEFORE UPDATE ON quiz_submissions
FOR EACH ROW
EXECUTE FUNCTION update_submitted_at_column(); 