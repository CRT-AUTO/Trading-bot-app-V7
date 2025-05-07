/*
  # Add risk_amount column to trades table

  1. New Columns
     - `risk_amount` (numeric): Store the actual risk amount for each trade
  
  2. Purpose
     - Store the risk amount used for each trade for accurate R multiple calculations
     - Enable better tracking of risk management
     - Improve accuracy of performance metrics and reporting
*/

-- Add risk_amount column to trades table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'risk_amount'
  ) THEN
    ALTER TABLE trades ADD COLUMN risk_amount numeric;
  END IF;
END $$;