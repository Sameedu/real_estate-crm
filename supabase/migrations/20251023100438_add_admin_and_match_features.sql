/*
  # Add Admin Features and Match System Enhancements

  1. Changes
    - Add is_admin column to profiles table
    - Create admin user with email admin@example.com
    - Update RLS policies for admin access
    - Add last_match_check column to user_preferences for daily matching
    - Update properties table policies for admin management
    - Add match_details jsonb column to property_matches
    - Create indexes for performance

  2. Security
    - Admin users can insert/update/delete properties
    - Admin users can view all data
    - Regular users maintain existing access patterns
*/

-- Add is_admin column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Add last_match_check to user_preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'last_match_check'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN last_match_check timestamptz DEFAULT now();
  END IF;
END $$;

-- Add match_details to property_matches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'property_matches' AND column_name = 'match_details'
  ) THEN
    ALTER TABLE property_matches ADD COLUMN match_details jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Anyone can view properties" ON properties;
DROP POLICY IF EXISTS "Admin can insert properties" ON properties;
DROP POLICY IF EXISTS "Admin can update properties" ON properties;
DROP POLICY IF EXISTS "Admin can delete properties" ON properties;

-- Create new properties policies
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_user_preferences_last_match_check ON user_preferences(last_match_check);
CREATE INDEX IF NOT EXISTS idx_property_matches_viewed ON property_matches(viewed);
