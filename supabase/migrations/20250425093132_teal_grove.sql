/*
  # Add position sizing settings to bots table

  1. New Columns
    - `position_sizing_enabled` (boolean): Toggle to enable or disable position sizing
    - `risk_per_trade` (numeric): The maximum amount to risk per trade in USDT
    - `market_fee_percentage` (numeric): Fee percentage for market orders
    - `limit_fee_percentage` (numeric): Fee percentage for limit orders

  2. Purpose
    - Allow bots to automatically calculate position size based on a fixed risk amount
    - Ensure consistent risk management regardless of market volatility
    - Account for trading fees in risk calculations
*/

-- Add position sizing columns to bots table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bots' AND column_name = 'position_sizing_enabled'
  ) THEN
    ALTER TABLE bots ADD COLUMN position_sizing_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bots' AND column_name = 'risk_per_trade'
  ) THEN
    ALTER TABLE bots ADD COLUMN risk_per_trade numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bots' AND column_name = 'market_fee_percentage'
  ) THEN
    ALTER TABLE bots ADD COLUMN market_fee_percentage numeric DEFAULT 0.075;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bots' AND column_name = 'limit_fee_percentage'
  ) THEN
    ALTER TABLE bots ADD COLUMN limit_fee_percentage numeric DEFAULT 0.025;
  END IF;
END $$;