-- Add learning speed fields to profiles table if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS learning_speed TEXT DEFAULT 'moderate';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_classified BOOLEAN DEFAULT FALSE;

-- Add insert policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND operation = 'INSERT'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- Create cached quizzes table
CREATE TABLE IF NOT EXISTS cached_quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slide_id UUID NOT NULL,
  learning_speed TEXT NOT NULL,
  quiz_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(slide_id, learning_speed)
);

-- Create cached summaries table
CREATE TABLE IF NOT EXISTS cached_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slide_id UUID NOT NULL,
  learning_speed TEXT NOT NULL,
  summary_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(slide_id, learning_speed)
);

-- Create cached flashcards table
CREATE TABLE IF NOT EXISTS cached_flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slide_id UUID NOT NULL,
  learning_speed TEXT NOT NULL,
  flashcards_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(slide_id, learning_speed)
);

-- RLS Policies for cached tables
ALTER TABLE cached_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_flashcards ENABLE ROW LEVEL SECURITY;

-- Create policies to allow access to cached data
CREATE POLICY "Anyone can read cached quizzes" ON cached_quizzes FOR SELECT USING (true);
CREATE POLICY "Anyone can read cached summaries" ON cached_summaries FOR SELECT USING (true);
CREATE POLICY "Anyone can read cached flashcards" ON cached_flashcards FOR SELECT USING (true);

-- Create policies for writing cached data - only authenticated users
CREATE POLICY "Authenticated users can insert/update cached quizzes" 
  ON cached_quizzes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert/update cached summaries" 
  ON cached_summaries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert/update cached flashcards" 
  ON cached_flashcards FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create policies for updating cached data
CREATE POLICY "Authenticated users can update cached quizzes" 
  ON cached_quizzes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update cached summaries" 
  ON cached_summaries FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update cached flashcards" 
  ON cached_flashcards FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cached_quizzes_slide_learning ON cached_quizzes(slide_id, learning_speed);
CREATE INDEX IF NOT EXISTS idx_cached_summaries_slide_learning ON cached_summaries(slide_id, learning_speed);
CREATE INDEX IF NOT EXISTS idx_cached_flashcards_slide_learning ON cached_flashcards(slide_id, learning_speed); 