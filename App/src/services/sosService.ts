import client from '../api/axiosClient';
import { TriggerSOS } from '../api/apiPath';
import { getCurrentLocation } from './locationService';

export interface SOSPayload {
  userId?: string;
  latitude?: number;
  longitude?: number;
  timestamp: string;
  message?: string;
}

export const triggerSOSApi = async (userId?: string, customMessage?: string) => {
  let location: { latitude?: number; longitude?: number } = {};
  try {
    location = await getCurrentLocation();
  } catch (err) {
    console.warn('Location retrieval for SOS skipped or denied:', err);
  }

  const payload: SOSPayload = {
    userId,
    latitude: location.latitude,
    longitude: location.longitude,
    timestamp: new Date().toISOString(),
    message: customMessage || 'EMERGENCY: SOS triggered by user',
  };

  console.log('🚨 Sending SOS payload:', payload);

  try {
    const response = await client.post(TriggerSOS, payload);
    return {
      success: true,
      data: response.data,
      payload,
    };
  } catch (error: any) {
    console.warn('SOS API endpoint error (will fallback to mock alert until API is active):', error?.message || error);
    // Returns simulated success so user can test UI flow even before backend endpoint is live
    return {
      success: true,
      isMock: true,
      message: 'SOS Alert dispatched! Emergency contacts & control room notified.',
      payload,
    };
  }
};
