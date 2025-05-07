/*
  # Add trade metrics column to trades table

  1. New Columns
    - `trade_metrics` (jsonb): JSON data containing calculated metrics for closed trades
    
  2. Purpose
    - Store additional analytics for each trade such as risk/reward ratios, slippage, and time metrics
    - Enable more detailed performance analysis and reporting
    - Support advanced trade analytics features in the UI
*/

-- Add trade_metrics column to trades table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'trade_metrics'
  ) THEN
    ALTER TABLE trades ADD COLUMN trade_metrics jsonb;
  END IF;
END $$;