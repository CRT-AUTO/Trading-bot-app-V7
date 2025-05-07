/*
  # Add calculator_inputs table for persisting calculator state

  1. New Tables
    - `calculator_inputs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `crypto_symbol` (text) - The selected cryptocurrency
      - `entry_price` (text) - Entry price input
      - `stop_loss` (text) - Stop loss price input
      - `take_profit_price` (text) - Take profit price input
      - `risk_amount` (text) - Risk amount in USDT
      - `available_capital` (text) - Available capital in USDT
      - `taker_fee` (text) - Taker fee percentage
      - `maker_fee` (text) - Maker fee percentage
      - `direction` (text) - Trade direction (long/short)
      - `decimal_places` (integer) - Decimal places for display
      - `entry_taker` (boolean) - Entry fee type is taker
      - `entry_maker` (boolean) - Entry fee type is maker
      - `exit_taker` (boolean) - Exit fee type is taker
      - `exit_maker` (boolean) - Exit fee type is maker
      - `test_mode` (boolean) - Test mode for trade execution
      - `system_name` (text) - Selected trading system
      - `entry_pic_url` (text) - URL for entry chart image
      - `notes` (text) - Trade notes
      - `api_key_id` (uuid, foreign key to api_keys) - Selected API key
      - `created_at` (timestamptz) - When record was created
      - `updated_at` (timestamptz) - When record was last updated
      
  2. Security
    - Enable RLS on the table
    - Add policies for users to manage only their own inputs
    
  3. Purpose
    - Store calculator input values persistently in the database
    - Allow users to return to their previous calculator settings
    - Support multiple devices/browsers with synchronized settings
    - Provide more robust persistence than localStorage
*/

-- Create calculator_inputs table
CREATE TABLE IF NOT EXISTS calculator_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  crypto_symbol text,
  entry_price text,
  stop_loss text,
  take_profit_price text,
  risk_amount text,
  available_capital text,
  taker_fee text,
  maker_fee text,
  direction text,
  decimal_places integer,
  entry_taker boolean DEFAULT true,
  entry_maker boolean DEFAULT false,
  exit_taker boolean DEFAULT true,
  exit_maker boolean DEFAULT false,
  test_mode boolean DEFAULT false,
  system_name text,
  entry_pic_url text,
  notes text,
  api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Enable row level security
ALTER TABLE calculator_inputs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own calculator inputs"
  ON calculator_inputs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calculator inputs"
  ON calculator_inputs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calculator inputs"
  ON calculator_inputs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calculator inputs"
  ON calculator_inputs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);