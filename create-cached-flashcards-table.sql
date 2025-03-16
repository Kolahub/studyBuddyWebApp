-- Create cached_flashcards table for storing generated flashcards
CREATE TABLE IF NOT EXISTS cached_flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slide_id UUID NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  learning_speed TEXT NOT NULL,
  flashcards_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(slide_id, learning_speed)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_cached_flashcards_slide_id ON cached_flashcards(slide_id);
CREATE INDEX IF NOT EXISTS idx_cached_flashcards_learning_speed ON cached_flashcards(learning_speed);
CREATE INDEX IF NOT EXISTS idx_cached_flashcards_created_at ON cached_flashcards(created_at);

-- Enable Row Level Security on cached_flashcards table
ALTER TABLE cached_flashcards ENABLE ROW LEVEL SECURITY;

-- Create cache expiration function
CREATE OR REPLACE FUNCTION expire_old_flashcards() RETURNS TRIGGER AS $$
BEGIN
  -- Delete flashcards older than 7 days
  DELETE FROM cached_flashcards 
  WHERE created_at < NOW() - INTERVAL '7 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run the cache expiration function
DROP TRIGGER IF EXISTS trigger_expire_flashcards ON cached_flashcards;
CREATE TRIGGER trigger_expire_flashcards
AFTER INSERT ON cached_flashcards
EXECUTE FUNCTION expire_old_flashcards();

-- Comment to explain the purpose of the table
COMMENT ON TABLE cached_flashcards IS 'Stores cached flashcards generated for slides based on learning speed'; 
