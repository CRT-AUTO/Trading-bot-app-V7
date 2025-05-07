/*
  # Add missing columns to trades table for Bybit PnL data

  1. New Columns
    - `avg_entry_price` (numeric): Average entry price from Bybit API
    - `avg_exit_price` (numeric): Average exit price from Bybit API
    - `exit_price` (numeric): Exit price for the trade
    - `updated_at` (timestamp): When the trade was last updated
    - `details` (jsonb): JSON data with additional trade details
    
  2. Purpose
    - These columns allow storing detailed PnL information from Bybit API
    - Supports improved analytics and trade history functionality
*/

-- Add columns to trades table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'avg_entry_price'
  ) THEN
    ALTER TABLE trades ADD COLUMN avg_entry_price numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'avg_exit_price'
  ) THEN
    ALTER TABLE trades ADD COLUMN avg_exit_price numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'exit_price'
  ) THEN
    ALTER TABLE trades ADD COLUMN exit_price numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE trades ADD COLUMN updated_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'details'
  ) THEN
    ALTER TABLE trades ADD COLUMN details jsonb;
  END IF;
END $$;

-- Modify logs table to add trade_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'logs' AND column_name = 'trade_id'
  ) THEN
    ALTER TABLE logs ADD COLUMN trade_id uuid REFERENCES trades(id) ON DELETE SET NULL;
  END IF;
END $$;