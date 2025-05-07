/*
  # Add manual trades table for storing manual trade data

  1. New Tables
    - `manual_trades`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `symbol` (text)
      - `side` (text - "Buy" or "Sell")
      - `entry_date` (timestamp)
      - `entry_price` (numeric)
      - `take_profit` (numeric)
      - `stop_loss` (numeric)
      - `quantity` (numeric)
      - `r_multiple` (numeric)
      - `system_id` (text) - Trading system/strategy name
      - `trade_exit` (text) - Reason for exit
      - `notes` (text) - Trade notes
      - `pic_entry` (text) - Entry chart URL
      - `pic_exit` (text) - Exit chart URL
      - `win_loss` (text) - Win/Loss/Break-Even
      - `finish_r` (numeric) - Final R value
      - `finish_usd` (numeric) - Final PnL in USD
      - `max_risk` (numeric) - Maximum risk in USD
      - `deviation` (numeric) - Deviation from planned entry
      - `slippage_percentage` (numeric) - Entry slippage
      - `leverage` (numeric) - Trade leverage
      - `avg_entry` (numeric) - Average entry price
      - `order_type` (text) - Market/Limit/etc.
      - `open_fee` (numeric) - Fee for opening position
      - `trade_open_ex_time` (timestamp) - Time of trade execution
      - `compound_size` (numeric) - Size including compounding
      - `liquidation_price` (numeric) - Theoretical liquidation price
      - `cost` (numeric) - Total cost of position
      - `value` (numeric) - Market value of position
      - `order_id` (text) - Exchange order ID
      - `order_link_id` (text) - Exchange order link ID
      - `total_trade_time` (text) - Formatted trade duration
      - `total_trade_time_seconds` (numeric) - Trade duration in seconds
      - `trade_close_exe_time` (timestamp) - Time of trade close execution
      - `close_price` (numeric) - Closing price
      - `close_fee` (numeric) - Fee for closing position
      - `close_order_type` (text) - Market/Limit/etc.
      - `close_order_id` (text) - Closing order ID
      - `close_order_link_id` (text) - Closing order link ID
      - `pnl` (numeric) - Profit and loss
      - `trade_calculator_fee` (numeric) - Calculated fee
      - `trade_fee` (numeric) - Actual exchange fee
      - `first_trade` (boolean) - Is this first trade of a sequence
      - `open_time` (timestamp) - Order opened timestamp
      - `close_time` (timestamp) - Order closed timestamp
      - `exchange` (text) - Exchange name
      - `status` (text) - Current status (open/closed)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
  2. Security
    - Enable RLS on manual_trades table
    - Add policies for users to access their own manual trades
*/

-- Create manual_trades table
CREATE TABLE IF NOT EXISTS manual_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL,
  entry_date timestamptz NOT NULL DEFAULT now(),
  entry_price numeric NOT NULL,
  take_profit numeric,
  stop_loss numeric,
  quantity numeric NOT NULL,
  r_multiple numeric,
  system_id text,
  trade_exit text,
  notes text,
  pic_entry text,
  pic_exit text,
  win_loss text,
  finish_r numeric,
  finish_usd numeric,
  max_risk numeric,
  deviation numeric,
  slippage_percentage numeric,
  leverage numeric,
  avg_entry numeric,
  order_type text DEFAULT 'Market',
  open_fee numeric,
  trade_open_ex_time timestamptz,
  compound_size numeric,
  liquidation_price numeric,
  cost numeric,
  value numeric,
  order_id text,
  order_link_id text,
  total_trade_time text,
  total_trade_time_seconds numeric,
  trade_close_exe_time timestamptz,
  close_price numeric,
  close_fee numeric,
  close_order_type text,
  close_order_id text,
  close_order_link_id text,
  pnl numeric,
  trade_calculator_fee numeric,
  trade_fee numeric,
  first_trade boolean DEFAULT false,
  open_time timestamptz,
  close_time timestamptz,
  exchange text DEFAULT 'BYBIT',
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Enable row level security on manual_trades
ALTER TABLE manual_trades ENABLE ROW LEVEL SECURITY;

-- Create policies for manual_trades
CREATE POLICY "Users can read own manual trades" 
  ON manual_trades 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own manual trades" 
  ON manual_trades 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own manual trades" 
  ON manual_trades 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own manual trades" 
  ON manual_trades 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);