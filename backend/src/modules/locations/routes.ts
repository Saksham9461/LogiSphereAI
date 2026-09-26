import { Router, Request, Response } from 'express';
import { env } from '../../config/env';
import { ok, fail } from '../../utils/http';

export const locationRouter = Router();

interface AutocompletePayload {
  query?: string;
  sessionToken?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Autocomplete Endpoint: POST or GET /api/locations/autocomplete (also mounted on /api/v1/locations/autocomplete)
 */
async function handleAutocomplete(req: Request, res: Response) {
  try {
    const query = String(req.body?.query || req.query?.query || '').trim();
    const sessionToken = String(req.body?.sessionToken || req.query?.sessionToken || '').trim();
    const latRaw = req.body?.latitude ?? req.query?.latitude;
    const lngRaw = req.body?.longitude ?? req.query?.longitude;

    if (!query || query.length < 2) {
      return ok(res, []);
    }

    // Check if Google Places API key is available
    if (env.GOOGLE_MAPS_API_KEY) {
      try {
        const body: any = {
          input: query,
          regionCode: 'IN',
          languageCode: 'en',
        };

        if (sessionToken) {
          body.sessionToken = sessionToken;
        }

        if (latRaw !== undefined && lngRaw !== undefined && !isNaN(Number(latRaw)) && !isNaN(Number(lngRaw))) {
          body.locationBias = {
            circle: {
              center: {
                latitude: Number(latRaw),
                longitude: Number(lngRaw),
              },
              radius: 50000.0,
            },
          };
        }

        const googleRes = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY,
          },
          body: JSON.stringify(body),
        });

        if (googleRes.ok) {
          const gData = await googleRes.json();
          if (Array.isArray(gData.suggestions) && gData.suggestions.length > 0) {
            const predictions = gData.suggestions
              .filter((s: any) => s.placePrediction)
              .map((s: any) => {
                const p = s.placePrediction;
                const rawId = p.placeId || (p.place ? p.place.replace(/^places\//, '') : '');
                const title = p.structuredFormat?.mainText?.text || p.text?.text || query;
                const secondary = p.structuredFormat?.secondaryText?.text || '';
                const fullAddress = p.text?.text || `${title}${secondary ? `, ${secondary}` : ''}`;

                return {
                  placeId: rawId,
                  title,
                  address: fullAddress,
                  secondaryText: secondary,
                  latitude: null,
                  longitude: null,
                };
              });

            if (predictions.length > 0) {
              return ok(res, predictions);
            }
          }
        } else {
          console.warn('[locationRoutes] Google Places API (New) returned status:', googleRes.status);
        }
      } catch (err: any) {
        console.error('[locationRoutes] Google Places Autocomplete request failed:', err?.message || err);
      }
    }

    // Return empty array if Google Places produced no predictions, so client fallback can engage safely
    return ok(res, []);
  } catch (error: any) {
    console.error('[locationRoutes] Autocomplete handler error:', error?.message || error);
    return fail(res, 500, 'Location search temporarily unavailable');
  }
}

/**
 * Place Details Endpoint: GET /api/locations/details/:placeId
 */
async function handlePlaceDetails(req: Request, res: Response) {
  try {
    const rawPlaceId = req.params.placeId || String(req.query.placeId || '');
    const sessionToken = String(req.query.sessionToken || '').trim();

    if (!rawPlaceId) {
      return fail(res, 400, 'placeId is required');
    }

    const cleanPlaceId = rawPlaceId.replace(/^places\//, '');

    if (env.GOOGLE_MAPS_API_KEY) {
      try {
        let url = `https://places.googleapis.com/v1/places/${encodeURIComponent(cleanPlaceId)}`;
        if (sessionToken) {
          url += `?sessionToken=${encodeURIComponent(sessionToken)}`;
        }

        const googleRes = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,addressComponents,googleMapsUri',
          },
        });

        if (googleRes.ok) {
          const gData = await googleRes.json();
          const normalized = {
            placeId: gData.id || cleanPlaceId,
            name: gData.displayName?.text || '',
            formattedAddress: gData.formattedAddress || '',
            latitude: gData.location?.latitude ?? 0,
            longitude: gData.location?.longitude ?? 0,
            addressComponents: gData.addressComponents || {},
            googleMapsUri: gData.googleMapsUri || '',
          };
          return ok(res, normalized);
        } else {
          console.warn('[locationRoutes] Google Place Details API (New) returned status:', googleRes.status);
        }
      } catch (err: any) {
        console.error('[locationRoutes] Google Place Details request failed:', err?.message || err);
      }
    }

    return fail(res, 404, 'Place details unavailable');
  } catch (error: any) {
    console.error('[locationRoutes] Place details handler error:', error?.message || error);
    return fail(res, 500, 'Location details temporarily unavailable');
  }
}

// Register routes
locationRouter.post('/autocomplete', handleAutocomplete);
locationRouter.get('/autocomplete', handleAutocomplete);
locationRouter.get('/details/:placeId', handlePlaceDetails);
locationRouter.get('/details', handlePlaceDetails);
