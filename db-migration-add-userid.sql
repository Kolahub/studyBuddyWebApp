-- Migration script to add user_id column to the slides table

-- First, check if the user_id column exists, if not, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'slides' AND column_name = 'user_id'
  ) THEN
    -- Add the user_id column
    ALTER TABLE slides ADD COLUMN user_id UUID REFERENCES auth.users(id);
    
    -- Update existing slide records to assign them to their creators if possible
    -- This is a fallback solution when the records don't have a user_id
    
    -- Log the migration
    RAISE NOTICE 'Added user_id column to slides table';
  ELSE
    RAISE NOTICE 'user_id column already exists in slides table';
  END IF;
END
$$;

-- Optionally create an RLS policy to ensure users can only access their own slides
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can only view their own slides" ON slides;
  DROP POLICY IF EXISTS "Users can only insert their own slides" ON slides;
  DROP POLICY IF EXISTS "Users can only update their own slides" ON slides;
  DROP POLICY IF EXISTS "Users can only delete their own slides" ON slides;
  
  -- Create new policies
  CREATE POLICY "Users can only view their own slides" 
    ON slides FOR SELECT 
    USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can only insert their own slides" 
    ON slides FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  
  CREATE POLICY "Users can only update their own slides" 
    ON slides FOR UPDATE 
    USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can only delete their own slides" 
    ON slides FOR DELETE 
    USING (auth.uid() = user_id);
  
  RAISE NOTICE 'Created RLS policies for slides table';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating RLS policies: %', SQLERRM;
END
$$;

-- Instructions on how to run this script:
-- 1. Connect to your Supabase database using psql or the SQL editor in the Supabase dashboard
-- 2. Run this script
-- 3. After running, existing records won't have a user_id assigned
-- 4. You may want to assign them manually or leave them as NULL 