-- Add text_content column to slides table
ALTER TABLE slides ADD COLUMN IF NOT EXISTS text_content TEXT;

-- Create a function to extract text content from PDF content
CREATE OR REPLACE FUNCTION extract_text_content()
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
DROP TRIGGER IF EXISTS trigger_extract_text_content ON slides;
CREATE TRIGGER trigger_extract_text_content
BEFORE INSERT OR UPDATE ON slides
FOR EACH ROW
EXECUTE FUNCTION extract_text_content();

-- Update existing slides to populate text_content
UPDATE slides 
SET text_content = content 
WHERE text_content IS NULL AND content IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN slides.text_content IS 'Extracted text content from slide content for better processing'; 