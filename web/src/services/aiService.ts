// ==============================================================================
// LogiSphere AI — Fleet AI Operations Assistant Service
// Strictly connects to POST /api/ai/query on the existing backend.
// ==============================================================================

import { apiClient } from './apiClient';
import type { FleetAiResponse } from '../types';

export interface AiQueryParams {
  query: string;
  context?: {
    lastSubjectType?: 'vehicle' | 'trip' | 'driver';
    lastSubjectId?: string;
    lastSubjectName?: string;
  };
}

export const aiService = {
  /**
   * Execute an operational fleet query using the AI assistant
   * Backed by POST /api/ai/query with role-aware and tenancy-aware resolution
   */
  async queryFleetAi(query: string, context?: AiQueryParams['context']): Promise<FleetAiResponse> {
    const res = await apiClient.post<FleetAiResponse>('/api/ai/query', {
      query,
      context,
    });
    return res.data;
  },
};
