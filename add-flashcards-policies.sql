-- Add Row Level Security policies for cached_flashcards table

-- 1. Allow users to select cached flashcards for slides they have access to
CREATE POLICY "Users can view cached flashcards for accessible slides"
ON cached_flashcards
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM slides s
    JOIN user_courses uc ON s.course_id = uc.course_id
    WHERE s.id = cached_flashcards.slide_id
    AND uc.user_id = auth.uid()
  )
);

-- 2. Allow users to insert cached flashcards for slides they have access to
CREATE POLICY "Users can insert cached flashcards for accessible slides"
ON cached_flashcards
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM slides s
    JOIN user_courses uc ON s.course_id = uc.course_id
    WHERE s.id = cached_flashcards.slide_id
    AND uc.user_id = auth.uid()
  )
);

-- 3. Allow users to update cached flashcards for slides they have access to
CREATE POLICY "Users can update cached flashcards for accessible slides"
ON cached_flashcards
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM slides s
    JOIN user_courses uc ON s.course_id = uc.course_id
    WHERE s.id = cached_flashcards.slide_id
    AND uc.user_id = auth.uid()
  )
);

-- 4. Allow users to delete cached flashcards for slides they have access to
CREATE POLICY "Users can delete cached flashcards for accessible slides"
ON cached_flashcards
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM slides s
    JOIN user_courses uc ON s.course_id = uc.course_id
    WHERE s.id = cached_flashcards.slide_id
    AND uc.user_id = auth.uid()
  )
);

-- 5. Allow system service role to manage all cached flashcards (for maintenance)
CREATE POLICY "Service role can manage all cached flashcards"
ON cached_flashcards
FOR ALL
USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'service_role'); 
