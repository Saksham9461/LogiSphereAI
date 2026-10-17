/* eslint-disable import/first */
jest.mock('react-native-url-polyfill/auto', () => {});
jest.mock('@maplibre/maplibre-react-native', () => ({}));
jest.mock('../src/services/supabaseClient', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    })),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineSOSQueue, QUEUE_STORAGE_KEY, QueuedSOSRequest } from '../src/services/offlineSOSQueue';
import { sosSyncWorker } from '../src/services/sosSyncWorker';
import client from '../src/api/axiosClient';
import useAuthStore from '../src/store/AuthStore';
import { useAlertStore } from '../src/store/AlertStore';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (key: string) => store[key] || null),
    setItem: jest.fn(async (key: string, val: string) => {
      store[key] = String(val);
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
    clear: jest.fn(async () => {
      store = {};
    }),
    _getStore: () => store,
  };
});

jest.mock('../src/api/axiosClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn((success) =>
    success({
      coords: { latitude: 23.2156, longitude: 72.6369, accuracy: 12 },
      timestamp: Date.now(),
    })
  ),
  requestAuthorization: jest.fn((success) => success()),
}));

describe('LogiSphere AI — Offline SOS Queue & Synchronization Worker', () => {
  const driverAId = 'drv-test-aaa';
  const driverBId = 'drv-test-bbb';

  beforeEach(async () => {
    jest.clearAllMocks();
    await offlineSOSQueue._resetForTesting();
    // Default auth state: driver A
    useAuthStore.setState({
      authStatus: 'authenticated',
      user: { id: driverAId, role: 'ROLE_DRIVER', name: 'Ramesh Driver' },
      token: 'valid-test-token-driver-a',
    });
  });

  afterEach(() => {
    sosSyncWorker.cleanup();
  });

  it('1. Offline SOS request is persisted locally in versioned storage key', async () => {
    const req: QueuedSOSRequest = {
      clientRequestId: 'sos-req-101',
      driverId: driverAId,
      payload: {
        clientRequestId: 'sos-req-101',
        latitude: 23.2156,
        longitude: 72.6369,
        accuracy: 10,
        capturedAt: '2026-10-17T12:00:00.000Z',
        locationStatus: 'PRECISE',
        message: 'Highway emergency',
        createdAt: '2026-10-17T12:00:00.000Z',
      },
      createdAt: '2026-10-17T12:00:00.000Z',
      retryCount: 0,
      status: 'PENDING_SYNC',
    };

    await offlineSOSQueue.enqueue(req);

    const queued = await offlineSOSQueue.getQueue();
    expect(queued.length).toBe(1);
    expect(queued[0].clientRequestId).toBe('sos-req-101');
    expect(queued[0].driverId).toBe(driverAId);

    // Verify storage key is versioned
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      QUEUE_STORAGE_KEY,
      expect.stringContaining('sos-req-101')
    );
  });

  it('2. Multiple queued SOS requests are preserved without losing entries', async () => {
    const req1: QueuedSOSRequest = {
      clientRequestId: 'sos-multi-1',
      driverId: driverAId,
      payload: {
        clientRequestId: 'sos-multi-1',
        latitude: 23.1,
        longitude: 72.1,
        accuracy: 5,
        capturedAt: new Date().toISOString(),
        locationStatus: 'PRECISE',
        createdAt: new Date().toISOString(),
      },
      createdAt: '2026-10-17T12:01:00.000Z',
      retryCount: 0,
      status: 'PENDING_SYNC',
    };

    const req2: QueuedSOSRequest = {
      clientRequestId: 'sos-multi-2',
      driverId: driverAId,
      payload: {
        clientRequestId: 'sos-multi-2',
        latitude: 23.2,
        longitude: 72.2,
        accuracy: 5,
        capturedAt: new Date().toISOString(),
        locationStatus: 'PRECISE',
        createdAt: new Date().toISOString(),
      },
      createdAt: '2026-10-17T12:02:00.000Z',
      retryCount: 0,
      status: 'PENDING_SYNC',
    };

    await offlineSOSQueue.enqueue(req1);
    await offlineSOSQueue.enqueue(req2);

    const queue = await offlineSOSQueue.getQueue();
    expect(queue.length).toBe(2);
    expect(queue[0].clientRequestId).toBe('sos-multi-1');
    expect(queue[1].clientRequestId).toBe('sos-multi-2');
  });

  it('3. Safely handles malformed or corrupted stored data without crashing', async () => {
    // Inject corrupt JSON into storage
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, '{"invalid_json": true broken syntax');

    // Reset memory cache to force re-reading corrupted storage
    (offlineSOSQueue as any).memoryCache = null;

    const queue = await offlineSOSQueue.getQueue();
    expect(Array.isArray(queue)).toBe(true);
    expect(queue.length).toBe(0);
  });

  it('4. Filters out invalid entries while preserving valid ones from stored data', async () => {
    const mixedData = [
      { clientRequestId: 'valid-1', driverId: driverAId, payload: { clientRequestId: 'valid-1' }, createdAt: '2026-10-17T12:00:00.000Z' },
      { corruptedField: 123 }, // Corrupt item
      null, // Corrupt null
      { clientRequestId: '', driverId: driverAId }, // Invalid empty ID
    ];

    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(mixedData));
    (offlineSOSQueue as any).memoryCache = null;

    const queue = await offlineSOSQueue.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].clientRequestId).toBe('valid-1');
  });

  it('5. Dequeuing one item retains all other queued requests', async () => {
    await offlineSOSQueue.enqueue({
      clientRequestId: 'item-keep-1',
      driverId: driverAId,
      payload: { clientRequestId: 'item-keep-1', latitude: null, longitude: null, accuracy: null, capturedAt: null, locationStatus: 'UNAVAILABLE', createdAt: '2026-10-17T12:00:00.000Z' },
      createdAt: '2026-10-17T12:00:00.000Z',
      retryCount: 0,
      status: 'PENDING_SYNC',
    });

    await offlineSOSQueue.enqueue({
      clientRequestId: 'item-delete',
      driverId: driverAId,
      payload: { clientRequestId: 'item-delete', latitude: null, longitude: null, accuracy: null, capturedAt: null, locationStatus: 'UNAVAILABLE', createdAt: '2026-10-17T12:01:00.000Z' },
      createdAt: '2026-10-17T12:01:00.000Z',
      retryCount: 0,
      status: 'PENDING_SYNC',
    });

    await offlineSOSQueue.enqueue({
      clientRequestId: 'item-keep-2',
      driverId: driverAId,
      payload: { clientRequestId: 'item-keep-2', latitude: null, longitude: null, accuracy: null, capturedAt: null, locationStatus: 'UNAVAILABLE', createdAt: '2026-10-17T12:02:00.000Z' },
      createdAt: '2026-10-17T12:02:00.000Z',
      retryCount: 0,
      status: 'PENDING_SYNC',
    });

    await offlineSOSQueue.dequeue('item-delete');

    const remaining = await offlineSOSQueue.getQueue();
    expect(remaining.length).toBe(2);
    expect(remaining.map((i) => i.clientRequestId)).toEqual(['item-keep-1', 'item-keep-2']);
  });

  it('6. Account Isolation: getDriverQueue returns only the active driver requests', async () => {
    await offlineSOSQueue.enqueue({
      clientRequestId: 'driver-a-sos',
      driverId: driverAId,
      payload: { clientRequestId: 'driver-a-sos', latitude: null, longitude: null, accuracy: null, capturedAt: null, locationStatus: 'UNAVAILABLE', createdAt: '2026-10-17T12:00:00.000Z' },
      createdAt: '2026-10-17T12:00:00.000Z',
      retryCount: 0,
      status: 'PENDING_SYNC',
    });

    await offlineSOSQueue.enqueue({
      clientRequestId: 'driver-b-sos',
      driverId: driverBId,
      payload: { clientRequestId: 'driver-b-sos', latitude: null, longitude: null, accuracy: null, capturedAt: null, locationStatus: 'UNAVAILABLE', createdAt: '2026-10-17T12:00:00.000Z' },
      createdAt: '2026-10-17T12:00:00.000Z',
      retryCount: 0,
      status: 'PENDING_SYNC',
    });

    const driverAItems = await offlineSOSQueue.getDriverQueue(driverAId);
    expect(driverAItems.length).toBe(1);
    expect(driverAItems[0].clientRequestId).toBe('driver-a-sos');

    const driverBItems = await offlineSOSQueue.getDriverQueue(driverBId);
    expect(driverBItems.length).toBe(1);
    expect(driverBItems[0].clientRequestId).toBe('driver-b-sos');
  });

  it('7. Sync Worker synchronizes pending requests and removes them on server confirmation', async () => {
    await offlineSOSQueue.enqueue({
      clientRequestId: 'sync-test-01',
      driverId: driverAId,
      payload: {
        clientRequestId: 'sync-test-01',
        latitude: 23.2156,
        longitude: 72.6369,
        accuracy: 10,
        capturedAt: '2026-10-17T12:00:00.000Z',
        locationStatus: 'PRECISE',
        message: 'Sync test message',
        createdAt: '2026-10-17T12:00:00.000Z',
      },
      createdAt: '2026-10-17T12:00:00.000Z',
      retryCount: 0,
      status: 'PENDING_SYNC',
    });

    (client.post as jest.Mock).mockResolvedValueOnce({
      status: 201,
      data: {
        success: true,
        alert: {
          id: 'alt-server-confirmed-01',
          clientRequestId: 'sync-test-01',
          driverId: driverAId,
          status: 'ACTIVE',
          createdAt: '2026-10-17T12:00:00.000Z',
        },
      },
    });

    const result = await sosSyncWorker.syncPendingSOS('unit_test');
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);

    // Queue should now be empty
    const remaining = await offlineSOSQueue.getDriverQueue(driverAId);
    expect(remaining.length).toBe(0);
  });

  it('8. Temporary backend failure retains request in queue with incremented retry count', async () => {
    await offlineSOSQueue.enqueue({
      clientRequestId: 'retry-fail-01',
      driverId: driverAId,
      payload: {
        clientRequestId: 'retry-fail-01',
        latitude: 23.2156,
        longitude: 72.6369,
        accuracy: 10,
        capturedAt: '2026-10-17T12:00:00.000Z',
        locationStatus: 'PRECISE',
        createdAt: '2026-10-17T12:00:00.000Z',
      },
      createdAt: '2026-10-17T12:00:00.000Z',
      retryCount: 0,
      status: 'PENDING_SYNC',
    });

    // Simulate 503 Service Unavailable or Network Timeout
    (client.post as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

    const result = await sosSyncWorker.syncPendingSOS('unit_test');
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);

    // Item must be retained in queue
    const remaining = await offlineSOSQueue.getDriverQueue(driverAId);
    expect(remaining.length).toBe(1);
    expect(remaining[0].retryCount).toBe(1);
    expect(remaining[0].lastError).toBe('Network timeout');
    expect(remaining[0].status).toBe('PENDING_SYNC');
  });

  it('9. Session expiration (401) retains the queue and pauses sync until re-authentication', async () => {
    await offlineSOSQueue.enqueue({
      clientRequestId: 'auth-exp-01',
      driverId: driverAId,
      payload: {
        clientRequestId: 'auth-exp-01',
        latitude: 23.2156,
        longitude: 72.6369,
        accuracy: 10,
        capturedAt: '2026-10-17T12:00:00.000Z',
        locationStatus: 'PRECISE',
        createdAt: '2026-10-17T12:00:00.000Z',
      },
      createdAt: '2026-10-17T12:00:00.000Z',
      retryCount: 0,
      status: 'PENDING_SYNC',
    });

    (client.post as jest.Mock).mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Token expired' } },
    });

    await sosSyncWorker.syncPendingSOS('unit_test');

    // Item must still exist in queue
    const remaining = await offlineSOSQueue.getDriverQueue(driverAId);
    expect(remaining.length).toBe(1);
    expect(remaining[0].clientRequestId).toBe('auth-exp-01');
    expect(remaining[0].lastError).toContain('Session expired');
  });

  it('10. Switching accounts does not submit the previous account’s pending SOS under the new session', async () => {
    // Queue an SOS under driver A
    await offlineSOSQueue.enqueue({
      clientRequestId: 'driver-a-only-sos',
      driverId: driverAId,
      payload: {
        clientRequestId: 'driver-a-only-sos',
        latitude: 23.2156,
        longitude: 72.6369,
        accuracy: 10,
        capturedAt: '2026-10-17T12:00:00.000Z',
        locationStatus: 'PRECISE',
        createdAt: '2026-10-17T12:00:00.000Z',
      },
      createdAt: '2026-10-17T12:00:00.000Z',
      retryCount: 0,
      status: 'PENDING_SYNC',
    });

    // Now switch active logged in session to driver B
    useAuthStore.setState({
      authStatus: 'authenticated',
      user: { id: driverBId, role: 'ROLE_DRIVER', name: 'Suresh Driver' },
      token: 'valid-test-token-driver-b',
    });

    // Trigger sync while driver B is active
    await sosSyncWorker.syncPendingSOS('account_switched');

    // client.post must NOT have been called with driver A's SOS
    expect(client.post).not.toHaveBeenCalled();

    // Driver A's SOS must still exist untouched in the queue
    const queue = await offlineSOSQueue.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].driverId).toBe(driverAId);
    expect(queue[0].clientRequestId).toBe('driver-a-only-sos');
  });
});
