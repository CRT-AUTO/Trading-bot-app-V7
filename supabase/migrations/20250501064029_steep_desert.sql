/*
  # Add support for multiple API keys per user

  1. Changes
     - Remove unique constraint on user_id in api_keys table
     - Add name column to api_keys table for better identification
     - Add bot_id column to allow linking specific API keys to specific bots
     
  2. Purpose
     - Allow users to manage multiple API keys for different accounts
     - Enable assigning specific API keys to specific bots
     - Maintain backwards compatibility with existing functionality
*/

-- Check if unique constraint exists on user_id and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'api_keys_user_id_key' 
    AND conrelid = 'api_keys'::regclass
  ) THEN
    ALTER TABLE api_keys DROP CONSTRAINT api_keys_user_id_key;
  END IF;
END $$;

-- Add name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'name'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN name text DEFAULT 'Default';
  END IF;
END $$;

-- Add bot_id column as nullable foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'bot_id'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN bot_id uuid REFERENCES bots(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add is_default column (one API key should be the default per user)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN is_default boolean DEFAULT false;
  END IF;
END $$;

-- Set all existing API keys as default
UPDATE api_keys SET is_default = true, name = 'Default' WHERE name IS NULL;