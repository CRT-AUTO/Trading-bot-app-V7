/*
  # Add manual_trade_inputs table for persisting calculator inputs

  1. New Tables
    - `manual_trade_inputs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `symbol` (text)
      - `entry_price` (numeric)
      - `stop_loss` (numeric)
      - `take_profit` (numeric)
      - `risk_amount` (numeric)
      - `available_capital` (numeric)
      - `taker_fee` (numeric)
      - `maker_fee` (numeric)
      - `direction` (text)
      - `decimal_places` (integer)
      - `entry_taker` (boolean)
      - `entry_maker` (boolean)
      - `exit_taker` (boolean)
      - `exit_maker` (boolean)
      - `system_id` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
  2. Security
    - Enable RLS on the table
    - Add policies for users to manage their own inputs
    
  3. Purpose
    - Store user's manual trade calculator inputs
    - Allow persistence between sessions
    - Improve user experience by remembering previous inputs
*/

-- Create manual_trade_inputs table
CREATE TABLE IF NOT EXISTS manual_trade_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  symbol text NOT NULL,
  entry_price numeric,
  stop_loss numeric,
  take_profit numeric,
  risk_amount numeric,
  available_capital numeric,
  taker_fee numeric,
  maker_fee numeric,
  direction text,
  decimal_places integer,
  entry_taker boolean DEFAULT true,
  entry_maker boolean DEFAULT false,
  exit_taker boolean DEFAULT true,
  exit_maker boolean DEFAULT false,
  system_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Enable row level security
ALTER TABLE manual_trade_inputs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own manual trade inputs"
  ON manual_trade_inputs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own manual trade inputs"
  ON manual_trade_inputs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own manual trade inputs"
  ON manual_trade_inputs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own manual trade inputs"
  ON manual_trade_inputs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);