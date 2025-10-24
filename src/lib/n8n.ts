const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/chat';

export interface N8NSignupPayload {
  event: 'signup';
  user: {
    name: string;
    email: string;
    phone?: string;
  };
}

export interface N8NSurveyPayload {
  event: 'survey';
  user_id: string;
  preferences: {
    city?: string;
    price?: number;
    type?: string;
    size?: string;
    rooms?: number;
  };
}

export interface N8NSearchPayload {
  event: 'search';
  user_id: string;
  query?: string;
  filters: {
    city?: string;
    type?: string;
    price?: number;
    minPrice?: number;
    maxPrice?: number;
  };
  timestamp: string;
}

export interface N8NChatPayload {
  event: 'chat';
  user_id: string;
  message: string;
}

export type N8NPayload = N8NSignupPayload | N8NSurveyPayload | N8NSearchPayload | N8NChatPayload;

export const sendToN8N = async (payload: N8NPayload): Promise<any> => {
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('N8N webhook error:', response.statusText);
      throw new Error(`N8N webhook failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to send to N8N:', error);
    throw error;
  }
};

export const fetchMatches = async (userId: string): Promise<any> => {
  try {
    const response = await fetch(`${N8N_WEBHOOK_URL}?user_id=${userId}&type=matches`);

    if (!response.ok) {
      console.error('N8N matches fetch error:', response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch matches from N8N:', error);
    return null;
  }
};

export const fetchDashboardData = async (): Promise<any> => {
  try {
    const response = await fetch(`${N8N_WEBHOOK_URL}?type=dashboard`);

    if (!response.ok) {
      console.error('N8N dashboard fetch error:', response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch dashboard from N8N:', error);
    return null;
  }
};
