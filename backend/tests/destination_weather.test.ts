import request from 'supertest';
import { describe, expect, it, beforeAll, beforeEach, afterEach } from 'vitest';
import { app } from '../src/app';
import { signToken } from '../src/middleware/auth';
import { db } from '../src/config/database';
import { weatherCache } from '../src/modules/weather/weatherCache';
import { setWeatherHttpFetcher, resetWeatherHttpFetcher } from '../src/modules/weather/weatherService';

describe('LogiSphere AI — Destination Weather Integration, Caching & Fallback', () => {
  let managerUser: any;
  let driverUser1: any;
  let driverUser2: any;
  let managerToken: string;
  let driverToken1: string;
  let driverToken2: string;
  let testTrip: any;

  const mockOpenWeatherPayload = {
    coord: { lon: 72.57, lat: 23.02 },
    weather: [
      { id: 802, main: 'Clouds', description: 'scattered clouds', icon: '03d' },
    ],
    main: {
      temp: 31.4,
      feels_like: 33.1,
      temp_min: 30.0,
      temp_max: 32.5,
      pressure: 1011,
      humidity: 58,
    },
    visibility: 8000,
    wind: { speed: 4.5, deg: 230 },
    name: 'Ahmedabad',
  };

  beforeAll(async () => {
    process.env.OPENWEATHER_API_KEY = 'test_openweather_key_mock_123';
    const timestamp = Date.now();
    const orgId = `org-wth-${timestamp}`;

    await db.insert('organizations', {
      id: orgId,
      name: 'Weather Logistics Org',
      slug: `weather-org-${timestamp}`,
      status: 'approved',
    });

    managerUser = await db.insert('users', {
      id: `usr-mgr-wth-${timestamp}`,
      name: 'Weather Test Manager',
      email: `mgr_wth_${timestamp}@logisphere.ai`,
      passwordHash: 'dummy',
      role: 'ROLE_MANAGER',
      organization_id: orgId,
    });
    managerToken = signToken({ ...managerUser, organization_id: orgId });

    driverUser1 = await db.insert('users', {
      id: `usr-drv1-wth-${timestamp}`,
      name: 'Assigned Driver One',
      email: `drv1_wth_${timestamp}@logisphere.ai`,
      passwordHash: 'dummy',
      role: 'ROLE_DRIVER',
      organization_id: orgId,
      licenseNo: `DL-WTH-1-${timestamp}`,
      licenseExpiryDate: '2028-12-31',
    });
    driverToken1 = signToken({ ...driverUser1, organization_id: orgId });

    driverUser2 = await db.insert('users', {
      id: `usr-drv2-wth-${timestamp}`,
      name: 'Unassigned Driver Two',
      email: `drv2_wth_${timestamp}@logisphere.ai`,
      passwordHash: 'dummy',
      role: 'ROLE_DRIVER',
      organization_id: orgId,
      licenseNo: `DL-WTH-2-${timestamp}`,
      licenseExpiryDate: '2028-12-31',
    });
    driverToken2 = signToken({ ...driverUser2, organization_id: orgId });

    await db.insert('organization_memberships', {
      id: `mem-mgr-${timestamp}`,
      organization_id: orgId,
      user_id: managerUser.id,
      role: 'ROLE_MANAGER',
      status: 'active',
    });

    await db.insert('organization_memberships', {
      id: `mem-drv1-${timestamp}`,
      organization_id: orgId,
      user_id: driverUser1.id,
      role: 'ROLE_DRIVER',
      status: 'active',
    });

    await db.insert('organization_memberships', {
      id: `mem-drv2-${timestamp}`,
      organization_id: orgId,
      user_id: driverUser2.id,
      role: 'ROLE_DRIVER',
      status: 'active',
    });

    testTrip = await db.insert('trips', {
      tripID: `TRP-WTH-${timestamp}`,
      source: 'Gandhinagar Sector 11',
      sourceLatitude: 23.2156,
      sourceLongitude: 72.6369,
      destination: 'Ahmedabad Ashram Road',
      destinationLatitude: 23.0225,
      destinationLongitude: 72.5714,
      status: 'IN_TRANSIT',
      vehicleID: `veh-wth-${timestamp}`,
      driverID: driverUser1.id,
      organization_id: orgId,
    });
  });

  beforeEach(() => {
    weatherCache.clear();
    resetWeatherHttpFetcher();
  });

  afterEach(() => {
    resetWeatherHttpFetcher();
    weatherCache.clear();
  });

  it('1. GET /api/weather/destination without auth returns 401', async () => {
    const res = await request(app).get('/api/weather/destination?lat=23.02&lon=72.57');
    expect(res.status).toBe(401);
  });

  it('2. Missing or invalid coordinates are rejected with 400 Bad Request', async () => {
    // Missing lon
    const res1 = await request(app)
      .get('/api/weather/destination?lat=23.02')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res1.status).toBe(400);
    expect(res1.body.success).toBe(false);

    // Invalid lat (> 90)
    const res2 = await request(app)
      .get('/api/weather/destination?lat=95.0&lon=72.57')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res2.status).toBe(400);

    // Non-numeric lon
    const res3 = await request(app)
      .get('/api/weather/destination?lat=23.02&lon=invalid')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res3.status).toBe(400);
  });

  it('3. Valid coordinates return normalized weather data with deterministic advisory', async () => {
    let callCount = 0;
    setWeatherHttpFetcher(async () => {
      callCount++;
      return { status: 200, data: mockOpenWeatherPayload };
    });

    const res = await request(app)
      .get('/api/weather/destination?lat=23.02&lon=72.57')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;

    expect(data.locationName).toBe('Ahmedabad');
    expect(data.coordinates.latitude).toBe(23.02);
    expect(data.coordinates.longitude).toBe(72.57);
    expect(data.temperature.current).toBe(31.4);
    expect(data.temperature.feelsLike).toBe(33.1);
    expect(data.humidity).toBe(58);
    expect(data.windSpeedKmh).toBeGreaterThan(0);
    expect(data.visibilityKm).toBe(8); // 8000m -> 8km
    expect(data.condition.main).toBe('Clouds');
    expect(data.condition.iconCategory).toBe('clouds');
    expect(data.advisory).toBeDefined();
    expect(data.advisory.severity).toBe('NORMAL');
    expect(data.isCached).toBe(false);
    expect(data.isStale).toBe(false);
    expect(data.dataSource).toBe('openweather');
    expect(callCount).toBe(1);
  });

  it('4. Fresh cache avoids redundant upstream provider calls', async () => {
    let upstreamCalls = 0;
    setWeatherHttpFetcher(async () => {
      upstreamCalls++;
      return { status: 200, data: mockOpenWeatherPayload };
    });

    // Request 1: cache miss -> calls upstream
    const res1 = await request(app)
      .get('/api/weather/destination?lat=23.0225&lon=72.5714')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res1.status).toBe(200);
    expect(res1.body.data.isCached).toBe(false);
    expect(upstreamCalls).toBe(1);

    // Request 2: cache hit (same normalized coordinates) -> served from memory cache
    const res2 = await request(app)
      .get('/api/weather/destination?lat=23.0249&lon=72.5702')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res2.status).toBe(200);
    expect(res2.body.data.isCached).toBe(true);
    expect(res2.body.data.isStale).toBe(false);
    expect(upstreamCalls).toBe(1); // No new upstream call!
  });

  it('5. Concurrent requests share an in-flight upstream request (Request Coalescing)', async () => {
    let upstreamCalls = 0;
    setWeatherHttpFetcher(async () => {
      upstreamCalls++;
      // Simulate 50ms network delay
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { status: 200, data: mockOpenWeatherPayload };
    });

    // Fire 4 simultaneous concurrent requests
    const promises = [1, 2, 3, 4].map(() =>
      request(app)
        .get('/api/weather/destination?lat=23.02&lon=72.57')
        .set('Authorization', `Bearer ${managerToken}`)
    );

    const responses = await Promise.all(promises);
    for (const r of responses) {
      expect(r.status).toBe(200);
      expect(r.body.data.temperature.current).toBe(31.4);
    }

    // Crucial: Only 1 upstream request should have been dispatched!
    expect(upstreamCalls).toBe(1);
  });

  it('6. Stale cache is returned as resilient fallback when upstream fails', async () => {
    let shouldFail = false;
    setWeatherHttpFetcher(async () => {
      if (shouldFail) {
        const timeoutErr: any = new Error('Gateway Timeout');
        timeoutErr.status = 504;
        throw timeoutErr;
      }
      return { status: 200, data: mockOpenWeatherPayload };
    });

    // Seed cache
    const res1 = await request(app)
      .get('/api/weather/destination?lat=23.02&lon=72.57')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res1.status).toBe(200);

    // Expire the fresh TTL intentionally by manipulating cache entry
    const key = weatherCache.getCacheKey(23.02, 72.57);
    const cached = weatherCache.getStale(key);
    expect(cached).toBeDefined();

    // Now make upstream fail (e.g. 504 or network outage)
    shouldFail = true;

    // Simulate stale by manually setting an expired entry
    weatherCache.set(key, cached!, -1000); // expired 1s ago

    const res2 = await request(app)
      .get('/api/weather/destination?lat=23.02&lon=72.57')
      .set('Authorization', `Bearer ${managerToken}`);

    // Still succeeds by falling back to stale data!
    expect(res2.status).toBe(200);
    expect(res2.body.data.isStale).toBe(true);
    expect(res2.body.data.dataSource).toBe('cache_fallback');
  });

  it('7. Provider HTTP 429 rate limit is handled gracefully', async () => {
    setWeatherHttpFetcher(async () => {
      return { status: 429, data: { message: 'Too many requests' } };
    });

    const res = await request(app)
      .get('/api/weather/destination?lat=26.91&lon=75.78')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('rate limit');
  });

  it('8. Upstream API key is NEVER exposed in response or error messages', async () => {
    const fakeKey = 'super_secret_openweather_key_999';
    process.env.OPENWEATHER_API_KEY = fakeKey;

    setWeatherHttpFetcher(async (url) => {
      const err: any = new Error(`Failed to call ${url}`);
      err.status = 502;
      throw err;
    });

    const res = await request(app)
      .get('/api/weather/destination?lat=28.61&lon=77.20')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(502);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain(fakeKey);
  });

  it('9. GET /api/trips/:tripID/destination-weather enforces RBAC and returns trip destination weather', async () => {
    setWeatherHttpFetcher(async () => {
      return { status: 200, data: mockOpenWeatherPayload };
    });

    // Manager can access destination weather of organization trip
    const mgrRes = await request(app)
      .get(`/api/trips/${testTrip.tripID}/destination-weather`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(mgrRes.status).toBe(200);
    expect(mgrRes.body.success).toBe(true);
    expect(mgrRes.body.data.locationName).toBe(testTrip.destination);

    // Assigned driver (driverUser1) can access their own trip's destination weather
    const drv1Res = await request(app)
      .get(`/api/trips/${testTrip.tripID}/destination-weather`)
      .set('Authorization', `Bearer ${driverToken1}`);
    expect(drv1Res.status).toBe(200);
    expect(drv1Res.body.success).toBe(true);

    // Unassigned driver (driverUser2) is FORBIDDEN from accessing driverUser1's trip weather
    const drv2Res = await request(app)
      .get(`/api/trips/${testTrip.tripID}/destination-weather`)
      .set('Authorization', `Bearer ${driverToken2}`);
    expect(drv2Res.status).toBe(403);
    expect(drv2Res.body.success).toBe(false);
  });

  it('10. Severe weather generates deterministic advisory (Rain / Wind / Low Visibility)', async () => {
    const severePayload = {
      ...mockOpenWeatherPayload,
      weather: [{ id: 502, main: 'Rain', description: 'heavy intensity rain', icon: '10d' }],
      rain: { '1h': 8.5 },
      wind: { speed: 15.0 }, // 15 m/s = 54 km/h
      visibility: 1500, // 1.5 km
    };

    setWeatherHttpFetcher(async () => {
      return { status: 200, data: severePayload };
    });

    const res = await request(app)
      .get('/api/weather/destination?lat=21.17&lon=72.83')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.precipitationMm).toBe(8.5);
    expect(data.hasPrecipitation).toBe(true);
    expect(data.windSpeedKmh).toBe(54);
    expect(data.visibilityKm).toBe(1.5);
    expect(data.advisory.severity).toBe('WARNING');
    expect(data.advisory.message).toContain('Heavy rainfall');
  });
});
