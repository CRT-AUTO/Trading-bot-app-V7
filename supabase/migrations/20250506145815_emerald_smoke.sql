/*
  # Create trading_systems table

  1. New Tables
    - `trading_systems`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key references users)
      - `name` (text, system name)
      - `description` (text, optional description)
      - `created_at` (timestamptz, when the system was created)
      
  2. Security
    - Enable RLS on trading_systems table
    - Add policies for users to manage their own trading systems
*/

-- Create trading_systems table
CREATE TABLE IF NOT EXISTS trading_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable row level security
ALTER TABLE trading_systems ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own trading systems"
  ON trading_systems
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trading systems"
  ON trading_systems
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trading systems"
  ON trading_systems
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trading systems"
  ON trading_systems
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);