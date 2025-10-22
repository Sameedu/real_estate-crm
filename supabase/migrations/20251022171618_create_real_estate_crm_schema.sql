/*
  # Real Estate CRM Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text)
      - `email` (text)
      - `phone` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `user_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `city` (text)
      - `max_price` (numeric)
      - `property_type` (text)
      - `size_range` (text)
      - `bedrooms` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `properties`
      - `id` (uuid, primary key)
      - `title` (text)
      - `price` (numeric)
      - `type` (text)
      - `location` (text)
      - `city` (text)
      - `size` (text)
      - `rooms` (integer)
      - `image` (text)
      - `description` (text)
      - `created_at` (timestamptz)
    
    - `search_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `query` (text)
      - `filters` (jsonb)
      - `timestamp` (timestamptz)
    
    - `property_matches`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `property_id` (uuid, references properties)
      - `match_score` (numeric)
      - `created_at` (timestamptz)
      - `viewed` (boolean)
    
    - `chat_messages`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `message` (text)
      - `reply` (text)
      - `timestamp` (timestamptz)
      - `is_user` (boolean)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Admin policies for dashboard access
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  city text,
  max_price numeric,
  property_type text,
  size_range text,
  bedrooms integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  price numeric NOT NULL,
  type text NOT NULL,
  location text NOT NULL,
  city text NOT NULL,
  size text NOT NULL,
  rooms integer NOT NULL DEFAULT 1,
  image text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view properties"
  ON properties FOR SELECT
  TO authenticated
  USING (true);

-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  query text,
  filters jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search history"
  ON search_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history"
  ON search_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create property_matches table
CREATE TABLE IF NOT EXISTS property_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  match_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  viewed boolean DEFAULT false
);

ALTER TABLE property_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own matches"
  ON property_matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own matches"
  ON property_matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  reply text,
  timestamp timestamptz DEFAULT now(),
  is_user boolean DEFAULT true
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Insert sample properties
INSERT INTO properties (title, price, type, location, city, size, rooms, image, description) VALUES
  ('2BHK Apartment in Bangalore', 6500000, 'apartment', 'Indiranagar', 'Bangalore', '1200 sq.ft', 2, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop', 'Modern apartment in prime location'),
  ('Luxury Villa in Hyderabad', 14500000, 'villa', 'Gachibowli', 'Hyderabad', '3500 sq.ft', 4, 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&h=400&fit=crop', 'Spacious villa with premium amenities'),
  ('3BHK Apartment in Pune', 8500000, 'apartment', 'Kalyani Nagar', 'Pune', '1500 sq.ft', 3, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop', 'Contemporary design with great views'),
  ('Luxury Villa in Goa', 12000000, 'villa', 'Assagao', 'Goa', '2800 sq.ft', 4, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&h=400&fit=crop', 'Beautiful villa near the beach'),
  ('Plot in Bangalore', 4500000, 'plot', 'Whitefield', 'Bangalore', '2400 sq.ft', 0, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=400&fit=crop', 'Premium plot in developing area'),
  ('Penthouse in Mumbai', 25000000, 'apartment', 'Bandra', 'Mumbai', '2500 sq.ft', 3, 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=600&h=400&fit=crop', 'Luxury penthouse with sea view'),
  ('Villa in Chennai', 11500000, 'villa', 'ECR', 'Chennai', '3200 sq.ft', 4, 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop', 'Beachside villa with modern interiors'),
  ('1BHK Apartment in Delhi', 5500000, 'apartment', 'Dwarka', 'Delhi', '800 sq.ft', 1, 'https://images.unsplash.com/photo-1502672260066-6bc05c107857?w=600&h=400&fit=crop', 'Compact and affordable apartment')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_property_matches_user ON property_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);