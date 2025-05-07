/*
  # Update API keys RLS policies

  1. Changes
     - Remove the uniqueness constraint on user_id
     - Update RLS policies to reflect multiple API keys per user
     - Add new policies for handling default API keys
     
  2. Purpose
     - Enable users to manage multiple API keys
     - Maintain proper security with row-level security
*/

-- Drop existing policies
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can read own API keys'
  ) THEN
    DROP POLICY "Users can read own API keys" ON api_keys;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can create own API keys'
  ) THEN
    DROP POLICY "Users can create own API keys" ON api_keys;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can update own API keys'
  ) THEN
    DROP POLICY "Users can update own API keys" ON api_keys;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can delete own API keys'
  ) THEN
    DROP POLICY "Users can delete own API keys" ON api_keys;
  END IF;
END $$;

-- Create new policies
CREATE POLICY "Users can read own API keys"
  ON api_keys
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys"
  ON api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON api_keys
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON api_keys
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);