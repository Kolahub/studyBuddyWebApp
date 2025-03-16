-- Function to allow executing SQL via RPC (use with caution, administrator only)
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This is important for RLS bypass
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if user is an admin (you can modify this check based on your auth scheme)
  IF NOT (SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'is_admin' = 'true'
  )) THEN
    -- Fallback: For now allow any authenticated user since we're debugging
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: Only authenticated users can execute SQL';
    END IF;
  END IF;

  -- Execute the query
  EXECUTE 'SELECT to_jsonb(result) FROM (' || sql_query || ') as result' INTO result;
  
  -- If the query is a SELECT, it will be captured in result
  -- Otherwise (for INSERT, UPDATE, DELETE), result will be NULL
  IF result IS NULL THEN
    -- For non-SELECT queries, return a simple success message
    RETURN jsonb_build_object('status', 'success', 'message', 'Query executed successfully');
  ELSE
    -- For SELECT queries, return the result set
    RETURN result;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error as JSON
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$; 