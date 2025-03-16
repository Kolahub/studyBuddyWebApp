-- Create quizzes table for storing generated quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slide_id UUID NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questions JSONB NOT NULL,
  difficulty TEXT NOT NULL,
  score INTEGER,
  submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_slide_id ON quizzes(slide_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at);

-- Enable Row Level Security on quizzes table
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

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

-- Create quiz_submissions table to track user submissions
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score INTEGER NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(quiz_id, user_id)
);

-- Enable Row Level Security on quiz_submissions
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER update_quizzes_updated_at
BEFORE UPDATE ON quizzes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 