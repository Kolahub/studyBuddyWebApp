-- Add content and text_content columns to slides table
ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS text_content TEXT;

-- Create a function to extract text content from content
CREATE OR REPLACE FUNCTION extract_slide_text_content()
RETURNS TRIGGER AS $$
BEGIN
  -- If content is provided and text_content is empty, try to extract text
  IF NEW.content IS NOT NULL AND (NEW.text_content IS NULL OR NEW.text_content = '') THEN
    -- For now, just copy the content as is
    -- In a real implementation, you would use a PDF text extraction library
    NEW.text_content = NEW.content;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically extract text content
DROP TRIGGER IF EXISTS trigger_extract_slide_text_content ON slides;
CREATE TRIGGER trigger_extract_slide_text_content
BEFORE INSERT OR UPDATE ON slides
FOR EACH ROW
EXECUTE FUNCTION extract_slide_text_content();

-- Update existing slides with default content if they don't have any
UPDATE slides 
SET content = COALESCE(content, title || E'\n' || COALESCE(description, '')),
    text_content = COALESCE(text_content, title || E'\n' || COALESCE(description, ''))
WHERE content IS NULL OR text_content IS NULL;

-- Add comments explaining the columns
COMMENT ON COLUMN slides.content IS 'Original content of the slide (PDF text, etc.)';
COMMENT ON COLUMN slides.text_content IS 'Extracted text content from slide content for better processing'; 