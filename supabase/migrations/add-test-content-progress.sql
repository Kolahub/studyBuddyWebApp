-- Add test data to content_progress table
-- This script will add progress entries for the current user's slides

-- Insert test data only if it doesn't already exist

-- First, get a list of slides
DO $$
DECLARE
    slide_rec RECORD;
    user_id_var UUID;
    content_progress_count INTEGER;
BEGIN
    -- Get the first user's ID (for testing purposes)
    SELECT id INTO user_id_var FROM auth.users LIMIT 1;
    
    IF user_id_var IS NOT NULL THEN
        -- Check if we already have content progress records
        SELECT COUNT(*) INTO content_progress_count FROM public.content_progress WHERE user_id = user_id_var;
        
        -- Only insert test data if we don't have any records yet
        IF content_progress_count = 0 THEN
            -- Loop through all slides and create progress entries
            FOR slide_rec IN SELECT id FROM public.slides LOOP
                -- 75% chance of being completed, 25% chance of being in progress
                IF random() < 0.75 THEN
                    INSERT INTO public.content_progress (
                        user_id, 
                        slide_id, 
                        completed, 
                        last_position,
                        created_at,
                        updated_at
                    ) VALUES (
                        user_id_var,
                        slide_rec.id,
                        TRUE,
                        100,
                        NOW() - (random() * INTERVAL '10 days'),
                        NOW() - (random() * INTERVAL '5 days')
                    );
                ELSE
                    INSERT INTO public.content_progress (
                        user_id, 
                        slide_id, 
                        completed, 
                        last_position,
                        created_at,
                        updated_at
                    ) VALUES (
                        user_id_var,
                        slide_rec.id,
                        FALSE,
                        FLOOR(random() * 90 + 10)::INTEGER,
                        NOW() - (random() * INTERVAL '10 days'),
                        NOW() - (random() * INTERVAL '5 days')
                    );
                END IF;
            END LOOP;
            
            RAISE NOTICE 'Added test content progress data for user %', user_id_var;
        ELSE
            RAISE NOTICE 'Content progress data already exists for user %', user_id_var;
        END IF;
    ELSE
        RAISE NOTICE 'No users found in the system';
    END IF;
END;
$$; 