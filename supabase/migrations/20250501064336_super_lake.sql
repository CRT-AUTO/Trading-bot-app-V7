/*
  # Add API key reference to bots table

  1. Changes
     - Add api_key_id column to bots table as nullable foreign key referencing api_keys table
     
  2. Purpose
     - Allow bots to be associated with specific API keys
     - Support multiple accounts/API keys per user
     - Maintain backwards compatibility with existing bots
*/

-- Add api_key_id column to bots table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bots' AND column_name = 'api_key_id'
  ) THEN
    ALTER TABLE bots ADD COLUMN api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL;
  END IF;
END $$;