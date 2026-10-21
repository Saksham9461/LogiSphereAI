import { calculateHaversineDistance } from '../utils/distanceUtils';
import { MOCK_ORGANIZATION } from './locationService';

export interface GeofenceTarget {
  latitude: number;
  longitude: number;
  geofenceRadius?: number;
  name?: string;
}

export const checkGeofence = (
  userLat: number,
  userLon: number,
  targetOrg?: GeofenceTarget
) => {
  const target = targetOrg || MOCK_ORGANIZATION;
  const radius = target.geofenceRadius || 200;
  const distance = calculateHaversineDistance(
    userLat,
    userLon,
    target.latitude,
    target.longitude
  );

  return {
    isInside: distance <= radius,
    distance: Math.round(distance), // in meters
    requiredRadius: radius,
    organizationName: target.name || 'Organization Facility',
  };
};
