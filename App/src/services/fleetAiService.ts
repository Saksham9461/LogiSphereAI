import client from '../api/axiosClient';

export type FleetAiResponseType =
  | 'metric'
  | 'summary'
  | 'vehicle_card'
  | 'trip_card'
  | 'list'
  | 'tracking'
  | 'clarification'
  | 'error'
  | 'text'
  | 'fleet_summary'
  | 'vehicle_list'
  | 'trip_summary'
  | 'driver_summary'
  | 'maintenance_alert'
  | 'fuel_summary';

export interface AiItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  metadata?: Record<string, string | number>;
  actionPayload?: any;
}

export interface AiAction {
  label: string;
  actionType: 'navigate' | 'query' | 'track_vehicle';
  payload?: any;
}

export interface AiConversationContext {
  lastSubjectType?: 'vehicle' | 'trip' | 'driver';
  lastSubjectId?: string;
  lastSubjectName?: string;
}

export interface FleetAiResponse {
  success: boolean;
  intent: string;
  type: FleetAiResponseType;
  message: string;
  metrics?: Record<string, number | string>;
  items?: AiItem[];
  actions?: AiAction[];
  hasMore?: boolean;
  context?: AiConversationContext;
  suggestions?: string[];
  data?: any;
}

export const queryFleetAi = async (
  query: string,
  context?: AiConversationContext,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<FleetAiResponse> => {
  const res = await client.post('/api/ai/query', {
    query: query.trim(),
    context,
    conversationHistory,
  });
  return res.data;
};
