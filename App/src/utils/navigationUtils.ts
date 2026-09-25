import { Linking, Platform, Alert } from 'react-native';

/**
 * Opens Google Maps Navigation to coordinates (or address fallback).
 * Uses native deep-linking when available with fallback to browser maps.
 */
export async function openGoogleMapsNavigation(
  location: string,
  coords?: { latitude?: number; longitude?: number }
): Promise<boolean> {
  const hasCoords =
    coords &&
    typeof coords.latitude === 'number' &&
    typeof coords.longitude === 'number' &&
    !isNaN(coords.latitude) &&
    !isNaN(coords.longitude);

  const destinationTarget = hasCoords
    ? `${coords.latitude},${coords.longitude}`
    : location && location.trim()
    ? location.trim()
    : '';

  if (!destinationTarget) {
    Alert.alert('Navigation Error', 'Navigation coordinates or address are unavailable for this trip.');
    return false;
  }

  const encodedTarget = encodeURIComponent(destinationTarget);

  // Native deep links
  const googleMapsAppUrl = Platform.OS === 'android'
    ? `google.navigation:q=${encodedTarget}`
    : `maps://app?daddr=${encodedTarget}`;

  // Fallback Web URL
  const webMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedTarget}`;

  try {
    const supported = await Linking.canOpenURL(googleMapsAppUrl);
    if (supported) {
      await Linking.openURL(googleMapsAppUrl);
      return true;
    } else {
      await Linking.openURL(webMapsUrl);
      return true;
    }
  } catch (error) {
    try {
      await Linking.openURL(webMapsUrl);
      return true;
    } catch (fallbackError: any) {
      Alert.alert(
        'Navigation Failed',
        'Could not open Google Maps navigation. Please check if Google Maps or a browser is installed.'
      );
      return false;
    }
  }
}
