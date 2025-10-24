import { supabase } from './supabase';

const MATCH_WEBHOOK_URL = import.meta.env.VITE_N8N_MATCH_WEBHOOK_URL || 'http://localhost:5678/webhook/match';

export interface MatchResult {
  property_id: string;
  match_score: number;
  match_details: {
    city_match: boolean;
    type_match: boolean;
    price_match: boolean;
    bedrooms_match: boolean;
  };
}

export interface MatchNotification {
  user_id: string;
  user_email: string;
  user_name: string;
  matches: Array<{
    property_id: string;
    property_title: string;
    property_price: number;
    property_location: string;
    property_city: string;
    property_type: string;
    property_image: string;
    match_score: number;
    match_details: {
      city_match: boolean;
      type_match: boolean;
      price_match: boolean;
      bedrooms_match: boolean;
    };
  }>;
  timestamp: string;
}

export const findMatchesForUser = async (userId: string): Promise<MatchResult[]> => {
  const { data, error } = await supabase.rpc('find_matches_for_user', {
    user_id_param: userId,
  });

  if (error) {
    console.error('Error finding matches:', error);
    return [];
  }

  return data || [];
};

export const createMatchesForUser = async (userId: string): Promise<number> => {
  const matches = await findMatchesForUser(userId);

  if (matches.length === 0) {
    return 0;
  }

  const matchRecords = matches.map((match) => ({
    user_id: userId,
    property_id: match.property_id,
    match_score: match.match_score,
    match_details: match.match_details,
    viewed: false,
  }));

  const { error } = await supabase.from('property_matches').insert(matchRecords);

  if (error) {
    console.error('Error creating matches:', error);
    return 0;
  }

  await supabase
    .from('user_preferences')
    .update({ last_match_check: new Date().toISOString() })
    .eq('user_id', userId);

  await sendMatchNotification(userId, matchRecords);

  return matches.length;
};

export const sendMatchNotification = async (
  userId: string,
  matchRecords: Array<{
    user_id: string;
    property_id: string;
    match_score: number;
    match_details: any;
  }>
): Promise<void> => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', userId)
      .single();

    if (!profile) return;

    const propertyIds = matchRecords.map((m) => m.property_id);
    const { data: properties } = await supabase
      .from('properties')
      .select('*')
      .in('id', propertyIds);

    if (!properties) return;

    const matchesWithDetails = matchRecords.map((match) => {
      const property = properties.find((p) => p.id === match.property_id);
      if (!property) return null;

      return {
        property_id: property.id,
        property_title: property.title,
        property_price: property.price,
        property_location: property.location,
        property_city: property.city,
        property_type: property.type,
        property_image: property.image || '',
        match_score: match.match_score,
        match_details: match.match_details,
      };
    }).filter(Boolean);

    const notification: MatchNotification = {
      user_id: userId,
      user_email: profile.email,
      user_name: profile.name,
      matches: matchesWithDetails as any,
      timestamp: new Date().toISOString(),
    };

    await fetch(MATCH_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    });
  } catch (error) {
    console.error('Error sending match notification:', error);
  }
};

export const checkDailyMatches = async (): Promise<void> => {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const { data: usersToCheck } = await supabase
    .from('user_preferences')
    .select('user_id, last_match_check')
    .lt('last_match_check', oneDayAgo.toISOString());

  if (!usersToCheck || usersToCheck.length === 0) {
    return;
  }

  for (const user of usersToCheck) {
    await createMatchesForUser(user.user_id);
  }
};

export const checkUserForMatches = async (userId: string): Promise<number> => {
  const matches = await findMatchesForUser(userId);

  if (matches.length === 0) {
    return 0;
  }

  return await createMatchesForUser(userId);
};
