/*
  # Add account_type column to api_keys table

  1. Changes
    - Add `account_type` column to the `api_keys` table to support both main accounts and sub-accounts
    - Set default value to 'main' for backward compatibility
    
  2. Purpose
    - Allow users to specify whether their Bybit API keys are for a main account or a sub-account
    - Enable proper API endpoint selection when fetching PnL data
*/

-- Add account_type column to api_keys table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_keys' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN account_type text DEFAULT 'main';
  END IF;
END $$;