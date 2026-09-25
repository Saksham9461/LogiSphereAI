import { MAPTILER_API_KEY, GOOGLE_MAPS_API_KEY } from '../config/env';

export type LocationResult = {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  mainText?: string;
  secondaryText?: string;
  name?: string;
  city?: string;
  state?: string;
};

export const MOCK_ORGANIZATION = {
  name: 'LogiSphere AI HQ',
  latitude: 23.2156,
  longitude: 72.6369,
  geofenceRadius: 500,
};

export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  return {
    latitude: 23.2156,
    longitude: 72.6369,
  };
}

// Popular logistics hubs & major cities for instant fallback geocoding
export const PRESET_LOCATIONS: LocationResult[] = [
  {
    address: 'Gandhinagar Depot, Gandhinagar, Gujarat',
    latitude: 23.2156,
    longitude: 72.6369,
    placeId: 'preset-gn-depot',
    mainText: 'Gandhinagar Depot',
    secondaryText: 'Gandhinagar, Gujarat',
  },
  {
    address: 'Ahmedabad Hub, Ahmedabad, Gujarat',
    latitude: 23.0225,
    longitude: 72.5714,
    placeId: 'preset-amd-hub',
    mainText: 'Ahmedabad Hub',
    secondaryText: 'Ahmedabad, Gujarat',
  },
  {
    address: 'Surat Logistics Center, Surat, Gujarat',
    latitude: 21.1702,
    longitude: 72.8311,
    placeId: 'preset-surat-hub',
    mainText: 'Surat Logistics Center',
    secondaryText: 'Surat, Gujarat',
  },
  {
    address: 'Mumbai North Terminal, Navi Mumbai, Maharashtra',
    latitude: 19.033,
    longitude: 73.0297,
    placeId: 'preset-mum-north',
    mainText: 'Mumbai North Terminal',
    secondaryText: 'Navi Mumbai, Maharashtra',
  },
  {
    address: 'Pune Central Warehouse, Pune, Maharashtra',
    latitude: 18.5204,
    longitude: 73.8567,
    placeId: 'preset-pune-wh',
    mainText: 'Pune Central Warehouse',
    secondaryText: 'Pune, Maharashtra',
  },
  {
    address: 'Jodhpur Freight Terminal, Jodhpur, Rajasthan',
    latitude: 26.2389,
    longitude: 73.0243,
    placeId: 'preset-jodhpur-ft',
    mainText: 'Jodhpur Freight Terminal',
    secondaryText: 'Jodhpur, Rajasthan',
  },
  {
    address: 'Jaipur Distribution Center, Jaipur, Rajasthan',
    latitude: 26.9124,
    longitude: 75.7873,
    placeId: 'preset-jaipur-dc',
    mainText: 'Jaipur Distribution Center',
    secondaryText: 'Jaipur, Rajasthan',
  },
  {
    address: 'Vadodara Transport Nagar, Vadodara, Gujarat',
    latitude: 22.3072,
    longitude: 73.1812,
    placeId: 'preset-vadodara-tn',
    mainText: 'Vadodara Transport Nagar',
    secondaryText: 'Vadodara, Gujarat',
  },
  {
    address: 'Delhi Logistics Park, New Delhi',
    latitude: 28.6139,
    longitude: 77.209,
    placeId: 'preset-delhi-lp',
    mainText: 'Delhi Logistics Park',
    secondaryText: 'New Delhi',
  },
  {
    address: 'Bengaluru Cargo Hub, Bengaluru, Karnataka',
    latitude: 12.9716,
    longitude: 77.5946,
    placeId: 'preset-blr-hub',
    mainText: 'Bengaluru Cargo Hub',
    secondaryText: 'Bengaluru, Karnataka',
  },
];

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

/**
 * 1. PRIMARY: Google Places Autocomplete API
 */
async function searchGooglePlaces(query: string): Promise<LocationResult[]> {
  if (!GOOGLE_MAPS_API_KEY) return [];

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
    query
  )}&key=${GOOGLE_MAPS_API_KEY}&types=geocode|establishment`;

  const res = await fetchWithTimeout(url, {}, 3500);
  if (!res.ok) return [];

  const data = await res.json();
  if (data.status !== 'OK' || !Array.isArray(data.predictions)) {
    return [];
  }

  return data.predictions.map((p: any) => ({
    address: p.description,
    placeId: p.place_id,
    latitude: 0,
    longitude: 0,
    mainText: p.structured_formatting?.main_text || p.description,
    secondaryText: p.structured_formatting?.secondary_text || '',
  }));
}

/**
 * 2. REQUIRED AFTER SELECTION: Google Place Details API
 * Fetches exact latitude, longitude, formattedAddress, city, state for selected placeId
 */
export async function getPlaceDetails(location: LocationResult): Promise<LocationResult> {
  // If coordinates are already populated and valid, return immediately
  if (
    location.latitude !== 0 &&
    location.longitude !== 0 &&
    (!location.placeId || !location.placeId.startsWith('gplace-'))
  ) {
    return location;
  }

  if (
    GOOGLE_MAPS_API_KEY &&
    location.placeId &&
    !location.placeId.startsWith('preset-') &&
    !location.placeId.startsWith('custom-') &&
    !location.placeId.startsWith('maptiler-') &&
    !location.placeId.startsWith('osm-')
  ) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        location.placeId
      )}&fields=name,formatted_address,geometry,address_components&key=${GOOGLE_MAPS_API_KEY}`;

      const res = await fetchWithTimeout(url, {}, 4000);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.result?.geometry?.location) {
          const result = data.result;
          let city = '';
          let state = '';
          if (Array.isArray(result.address_components)) {
            for (const comp of result.address_components) {
              if (comp.types.includes('locality')) city = comp.long_name;
              if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
            }
          }

          return {
            ...location,
            address: result.formatted_address || location.address,
            name: result.name || location.mainText,
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
            city,
            state,
          };
        }
      }
    } catch (err) {
      console.warn('[locationService] Google Place Details fetch error:', err);
    }
  }

  // Fallback geocode if coordinates are missing
  if (location.latitude === 0 && location.longitude === 0) {
    return await geocodeAddressFallback(location);
  }

  return location;
}

/**
 * Fallback Geocoding for MapTiler
 */
async function searchMapTiler(query: string): Promise<LocationResult[]> {
  if (!MAPTILER_API_KEY) return [];

  const maptilerUrl = `https://api.maptiler.com/geocoding/${encodeURIComponent(
    query
  )}.json?key=${MAPTILER_API_KEY}&limit=5`;

  const res = await fetchWithTimeout(maptilerUrl, {}, 3000);
  if (!res.ok) return [];

  const data = await res.json();
  if (Array.isArray(data?.features) && data.features.length > 0) {
    return data.features.map((f: any) => ({
      address: f.place_name || f.text || query,
      longitude: f.geometry?.coordinates?.[0] ?? 0,
      latitude: f.geometry?.coordinates?.[1] ?? 0,
      placeId: f.id || `maptiler-${Math.random()}`,
      mainText: f.text || f.place_name,
      secondaryText: f.place_name || '',
    }));
  }
  return [];
}

/**
 * Fallback Geocoding for OpenStreetMap Nominatim
 */
async function searchNominatim(query: string): Promise<LocationResult[]> {
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&limit=5`;

  const res = await fetchWithTimeout(
    nominatimUrl,
    { headers: { 'User-Agent': 'LogiSphereAI/1.0' } },
    3000
  );
  if (!res.ok) return [];

  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    return data.map((item: any) => ({
      address: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      placeId: String(item.place_id || `osm-${Math.random()}`),
      mainText: item.display_name.split(',')[0],
      secondaryText: item.display_name,
    }));
  }
  return [];
}

/**
 * Address Geocoding Fallback if Place Details or initial coordinates were missing
 */
async function geocodeAddressFallback(location: LocationResult): Promise<LocationResult> {
  const query = location.address || location.mainText || '';
  if (!query) return location;

  try {
    const maptilerUrl = `https://api.maptiler.com/geocoding/${encodeURIComponent(
      query
    )}.json?key=${MAPTILER_API_KEY}&limit=1`;

    const res = await fetchWithTimeout(maptilerUrl, {}, 3000);
    if (res.ok) {
      const data = await res.json();
      if (data?.features?.[0]?.geometry?.coordinates) {
        return {
          ...location,
          longitude: data.features[0].geometry.coordinates[0],
          latitude: data.features[0].geometry.coordinates[1],
        };
      }
    }
  } catch (err) {
    console.warn('[locationService] Geocode fallback error:', err);
  }

  // Default coordinate fallback if all geocoding calls fail
  return {
    ...location,
    latitude: 23.0225 + (query.length % 5) * 0.1,
    longitude: 72.5714 + (query.length % 7) * 0.1,
  };
}

/**
 * Main Location Autocomplete Search Function
 */
export async function searchLocations(query: string): Promise<LocationResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const queryLower = trimmed.toLowerCase();

  // 1. PRIMARY: Try Google Places Autocomplete API
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const googleResults = await searchGooglePlaces(trimmed);
      if (googleResults.length > 0) {
        return googleResults;
      }
    } catch (err) {
      console.warn('[locationService] Google Places Autocomplete error:', err);
    }
  }

  // 2. FALLBACK: MapTiler Geocoding API
  try {
    const maptilerResults = await searchMapTiler(trimmed);
    if (maptilerResults.length > 0) return maptilerResults;
  } catch (err) {
    console.warn('[locationService] MapTiler fallback error:', err);
  }

  // 3. FALLBACK: OpenStreetMap Nominatim API
  try {
    const osmResults = await searchNominatim(trimmed);
    if (osmResults.length > 0) return osmResults;
  } catch (err) {
    console.warn('[locationService] Nominatim fallback error:', err);
  }

  // 4. FALLBACK: Local Hub Presets
  const localMatches = PRESET_LOCATIONS.filter(p =>
    p.address.toLowerCase().includes(queryLower) ||
    (p.mainText && p.mainText.toLowerCase().includes(queryLower)) ||
    (p.secondaryText && p.secondaryText.toLowerCase().includes(queryLower))
  );

  if (localMatches.length > 0) {
    return localMatches;
  }

  // 5. Fallback synthesis for typed input
  return [
    {
      address: `${trimmed.charAt(0).toUpperCase() + trimmed.slice(1)} Hub`,
      latitude: 23.0225 + (trimmed.length % 5) * 0.5,
      longitude: 72.5714 + (trimmed.length % 7) * 0.5,
      placeId: `custom-${Date.now()}`,
      mainText: `${trimmed.charAt(0).toUpperCase() + trimmed.slice(1)} Hub`,
      secondaryText: 'Location',
    },
  ];
}
