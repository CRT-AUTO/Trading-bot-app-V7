/*
  # Add API key ID column to manual_trades table

  1. New Columns
     - `api_key_id` (uuid, foreign key): The API key used to execute the trade
     - `qty` (numeric): Additional quantity field for compatibility with Bybit's response format
     
  2. Purpose
     - Track which API key was used for each manual trade
     - Support Bybit integration when executing manual trades
*/

-- Add api_key_id column to manual_trades table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'manual_trades' AND column_name = 'api_key_id'
  ) THEN
    ALTER TABLE manual_trades ADD COLUMN api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL;
  END IF;

  -- The qty column should already exist from the previous migration, but let's make sure
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'manual_trades' AND column_name = 'qty'
  ) THEN
    ALTER TABLE manual_trades ADD COLUMN qty numeric;
  END IF;
END $$;