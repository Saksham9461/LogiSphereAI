import { calculateHaversineDistance } from '../utils/distanceUtils';
import { MOCK_ORGANIZATION } from './locationService';

export const checkGeofence = (userLat: number, userLon: number) => {
  const distance = calculateHaversineDistance(
    userLat,
    userLon,
    MOCK_ORGANIZATION.latitude,
    MOCK_ORGANIZATION.longitude
  );

  return {
    isInside: distance <= MOCK_ORGANIZATION.geofenceRadius,
    distance: Math.round(distance), // in meters
    requiredRadius: MOCK_ORGANIZATION.geofenceRadius,
    organizationName: MOCK_ORGANIZATION.name
  };
};
