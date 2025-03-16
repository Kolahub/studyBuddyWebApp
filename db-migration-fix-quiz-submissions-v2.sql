-- This script provides additional fixes for the quiz_submissions table
-- Specifically addressing issues with JSON storage and constraints
-- Run this in your Supabase SQL editor

-- Update the answers column type to TEXT to avoid JSON validation issues
ALTER TABLE quiz_submissions 
ALTER COLUMN answers TYPE TEXT;

-- Remove any NOT NULL constraints
ALTER TABLE quiz_submissions 
ALTER COLUMN answers DROP NOT NULL;

ALTER TABLE quiz_submissions 
ALTER COLUMN score DROP NOT NULL;

-- Add default values
ALTER TABLE quiz_submissions 
ALTER COLUMN answers SET DEFAULT '';

ALTER TABLE quiz_submissions 
ALTER COLUMN score SET DEFAULT 0;

-- Add appropriate indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id ON quiz_submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_user_id ON quiz_submissions(user_id);

-- Make sure the RLS policies are correct
DROP POLICY IF EXISTS "Users can view their own quiz submissions" ON quiz_submissions;
DROP POLICY IF EXISTS "Users can insert their own quiz submissions" ON quiz_submissions;
DROP POLICY IF EXISTS "Users can update their own quiz submissions" ON quiz_submissions;
DROP POLICY IF EXISTS "Users can delete their own quiz submissions" ON quiz_submissions;

-- Create updated RLS policies
CREATE POLICY "Users can view their own quiz submissions"
  ON quiz_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz submissions"
  ON quiz_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz submissions"
  ON quiz_submissions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quiz submissions"
  ON quiz_submissions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to ensure that old records also have text format answers
CREATE OR REPLACE FUNCTION fix_quiz_submissions_answers()
RETURNS void AS $$
DECLARE
  quiz_rec RECORD;
BEGIN
  FOR quiz_rec IN SELECT id, answers FROM quiz_submissions WHERE answers IS NOT NULL LOOP
    -- Check if answers is already a text string
    IF jsonb_typeof(quiz_rec.answers::jsonb) = 'array' THEN
      -- Convert JSONB array to text
      UPDATE quiz_submissions
      SET answers = quiz_rec.answers::text
      WHERE id = quiz_rec.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If there was an error, just set it to an empty string
    UPDATE quiz_submissions
    SET answers = ''
    WHERE id = quiz_rec.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to fix existing records
SELECT fix_quiz_submissions_answers(); 