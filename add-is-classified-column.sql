-- Add is_classified column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_classified BOOLEAN DEFAULT FALSE;

-- Update existing records to have is_classified set to false
UPDATE profiles
SET is_classified = FALSE
WHERE is_classified IS NULL; 