import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  city?: string;
  max_price?: number;
  property_type?: string;
  size_range?: string;
  bedrooms?: number;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  title: string;
  price: number;
  type: string;
  location: string;
  city: string;
  size: string;
  rooms: number;
  image?: string;
  description?: string;
  created_at: string;
}

export interface PropertyMatch {
  id: string;
  user_id: string;
  property_id: string;
  match_score: number;
  created_at: string;
  viewed: boolean;
  property?: Property;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  reply?: string;
  timestamp: string;
  is_user: boolean;
}

export interface SearchHistory {
  id: string;
  user_id: string;
  query?: string;
  filters: Record<string, any>;
  timestamp: string;
}
