/*
  # Add missing columns to manual_trades table

  1. Changes
    - Add any missing columns to the manual_trades table that may not have been included in the initial migration
    - Ensure all columns match the specified requirements
    - This migration is designed to be idempotent (safe to run multiple times)
    
  2. Purpose
    - Complete the manual_trades table structure
    - Support all the data fields needed for the manual trading feature
    - Ensure compatibility with the trading calculator UI
*/

-- Add any missing columns to the manual_trades table
DO $$ 
BEGIN
  -- The following columns may not have been added in the initial migration
  -- Using IF NOT EXISTS to make this migration idempotent
  
  -- Check if the table exists first (in case this migration runs before the table creation)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manual_trades') THEN
    -- Only attempt to add columns if the table exists
    
    -- Check and add qty column (though it's redundant with quantity, adding for compatibility)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'manual_trades' AND column_name = 'qty'
    ) THEN
      ALTER TABLE manual_trades ADD COLUMN qty numeric;
    END IF;
    
    -- Update any default values or constraints that may need to be adjusted
    -- Set proper defaults for status if not already set
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'manual_trades' AND column_name = 'status' AND column_default IS NULL
    ) THEN
      ALTER TABLE manual_trades ALTER COLUMN status SET DEFAULT 'open';
    END IF;
    
    -- Make sure exchange has the correct default
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'manual_trades' AND column_name = 'exchange' AND column_default IS NULL
    ) THEN
      ALTER TABLE manual_trades ALTER COLUMN exchange SET DEFAULT 'BYBIT';
    END IF;
    
    -- Make sure order_type has the correct default
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'manual_trades' AND column_name = 'order_type' AND column_default IS NULL
    ) THEN
      ALTER TABLE manual_trades ALTER COLUMN order_type SET DEFAULT 'Market';
    END IF;
    
    -- Make sure first_trade has the correct default
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'manual_trades' AND column_name = 'first_trade' AND column_default IS NULL
    ) THEN
      ALTER TABLE manual_trades ALTER COLUMN first_trade SET DEFAULT false;
    END IF;
  END IF;
END $$;