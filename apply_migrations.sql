-- Combined migrations for EstateHub

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

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
  last_match_check timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

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

DROP POLICY IF EXISTS "Anyone can view properties" ON properties;
DROP POLICY IF EXISTS "Admin can insert properties" ON properties;
DROP POLICY IF EXISTS "Admin can update properties" ON properties;
DROP POLICY IF EXISTS "Admin can delete properties" ON properties;

CREATE POLICY "Anyone can view properties"
  ON properties FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can insert properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admin can update properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admin can delete properties"
  ON properties FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  query text,
  filters jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own search history" ON search_history;
DROP POLICY IF EXISTS "Users can insert own search history" ON search_history;

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
  match_details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  viewed boolean DEFAULT false
);

ALTER TABLE property_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own matches" ON property_matches;
DROP POLICY IF EXISTS "Users can update own matches" ON property_matches;

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

DROP POLICY IF EXISTS "Users can view own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON chat_messages;

CREATE POLICY "Users can view own messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create function to calculate match score
CREATE OR REPLACE FUNCTION calculate_match_score(
  user_prefs user_preferences,
  prop properties
) RETURNS numeric AS $$
DECLARE
  score numeric := 0;
BEGIN
  -- City match (30 points)
  IF user_prefs.city = prop.city THEN
    score := score + 30;
  END IF;

  -- Property type match (25 points)
  IF user_prefs.property_type = prop.type THEN
    score := score + 25;
  END IF;

  -- Price match (25 points)
  IF user_prefs.max_price IS NOT NULL AND prop.price <= user_prefs.max_price THEN
    score := score + 25;
  END IF;

  -- Bedrooms match (20 points)
  IF user_prefs.bedrooms IS NOT NULL AND prop.rooms >= user_prefs.bedrooms THEN
    score := score + 20;
  END IF;

  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Create function to find matches for a user
CREATE OR REPLACE FUNCTION find_matches_for_user(user_id_param uuid)
RETURNS TABLE (
  property_id uuid,
  match_score numeric,
  match_details jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as property_id,
    calculate_match_score(up, p) as match_score,
    jsonb_build_object(
      'city_match', up.city = p.city,
      'type_match', up.property_type = p.type,
      'price_match', up.max_price IS NOT NULL AND p.price <= up.max_price,
      'bedrooms_match', up.bedrooms IS NOT NULL AND p.rooms >= up.bedrooms
    ) as match_details
  FROM properties p
  CROSS JOIN user_preferences up
  WHERE up.user_id = user_id_param
  AND calculate_match_score(up, p) >= 50
  AND NOT EXISTS (
    SELECT 1 FROM property_matches pm
    WHERE pm.user_id = user_id_param
    AND pm.property_id = p.id
  )
  ORDER BY calculate_match_score(up, p) DESC;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_property_matches_user ON property_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_user_preferences_last_match_check ON user_preferences(last_match_check);
CREATE INDEX IF NOT EXISTS idx_property_matches_viewed ON property_matches(viewed);

-- Insert sample properties
INSERT INTO properties (title, price, type, location, city, size, rooms, image, description) VALUES
  -- Bangalore
  ('2BHK Apartment in Indiranagar', 6500000, 'apartment', 'Indiranagar', 'Bangalore', '1200 sq.ft', 2, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop', 'Modern apartment in prime location'),
  ('Luxury Villa in Whitefield', 25000000, 'villa', 'Whitefield', 'Bangalore', '3200 sq.ft', 4, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop', 'Premium villa with private garden'),
  ('3BHK Apartment in Koramangala', 8500000, 'apartment', 'Koramangala', 'Bangalore', '1500 sq.ft', 3, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop', 'Contemporary design with great views'),
  ('Plot in Electronic City', 4500000, 'plot', 'Electronic City', 'Bangalore', '2400 sq.ft', 0, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=400&fit=crop', 'DTCP approved residential plot'),
  -- Mumbai
  ('2BHK Sea-facing Apartment in Bandra', 18500000, 'apartment', 'Bandra West', 'Mumbai', '950 sq.ft', 2, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&h=400&fit=crop', 'Beautiful sea-facing apartment'),
  ('Luxury 3BHK in Powai', 14500000, 'apartment', 'Powai', 'Mumbai', '1350 sq.ft', 3, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop', 'Modern apartment overlooking Powai Lake'),
  ('Penthouse in Bandra', 25000000, 'apartment', 'Bandra', 'Mumbai', '2500 sq.ft', 3, 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=600&h=400&fit=crop', 'Luxury penthouse with sea view'),
  -- Delhi
  ('3BHK Builder Floor in Greater Kailash', 22000000, 'apartment', 'Greater Kailash', 'Delhi', '1800 sq.ft', 3, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=400&fit=crop', 'Premium builder floor in posh GK area'),
  ('1BHK Apartment in Dwarka', 5500000, 'apartment', 'Dwarka', 'Delhi', '800 sq.ft', 1, 'https://images.unsplash.com/photo-1502672260066-6bc05c107857?w=600&h=400&fit=crop', 'Compact and affordable apartment'),
  -- Hyderabad
  ('Modern 2BHK in HITEC City', 5500000, 'apartment', 'HITEC City', 'Hyderabad', '1150 sq.ft', 2, 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&h=400&fit=crop', 'Contemporary apartment near IT corridor'),
  ('Luxury Villa in Gachibowli', 14500000, 'villa', 'Gachibowli', 'Hyderabad', '3500 sq.ft', 4, 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&h=400&fit=crop', 'Spacious villa with premium amenities'),
  -- Pune
  ('2BHK Apartment in Hinjewadi', 5800000, 'apartment', 'Hinjewadi', 'Pune', '1050 sq.ft', 2, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop', 'Well-designed apartment close to IT parks'),
  ('3BHK in Kalyani Nagar', 8500000, 'apartment', 'Kalyani Nagar', 'Pune', '1500 sq.ft', 3, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop', 'Contemporary design with great views'),
  -- Chennai
  ('2BHK Apartment in Adyar', 7500000, 'apartment', 'Adyar', 'Chennai', '1200 sq.ft', 2, 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=600&h=400&fit=crop', 'Comfortable apartment in prime Adyar location'),
  ('Villa in ECR', 11500000, 'villa', 'ECR', 'Chennai', '3200 sq.ft', 4, 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop', 'Beachside villa with modern interiors'),
  -- Goa
  ('Luxury Villa in Assagao', 12000000, 'villa', 'Assagao', 'Goa', '2800 sq.ft', 4, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&h=400&fit=crop', 'Beautiful villa near the beach'),
  ('Beachfront Villa in Candolim', 35000000, 'villa', 'Candolim', 'Goa', '2200 sq.ft', 3, 'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=600&h=400&fit=crop', 'Spectacular beachfront villa')
ON CONFLICT DO NOTHING;
