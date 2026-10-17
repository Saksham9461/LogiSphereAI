import AsyncStorage from '@react-native-async-storage/async-storage';

export const QUEUE_STORAGE_KEY = '@logisphere_pending_sos_queue_v1';

export type QueueItemStatus = 'PENDING_SYNC' | 'SYNCING';

export interface QueuedSOSPayload {
  clientRequestId: string;
  userId?: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  capturedAt: string | null;
  locationStatus: 'PRECISE' | 'LAST_KNOWN' | 'UNAVAILABLE';
  tripId?: string | null;
  vehicleId?: string | null;
  message?: string;
  createdAt: string;
}

export interface QueuedSOSRequest {
  clientRequestId: string;
  driverId: string;
  payload: QueuedSOSPayload;
  createdAt: string;
  retryCount: number;
  lastAttemptAt?: string | null;
  lastError?: string | null;
  status: QueueItemStatus;
}

type QueueListener = (queue: QueuedSOSRequest[]) => void;

class OfflineSOSQueueService {
  private memoryCache: QueuedSOSRequest[] | null = null;
  private listeners: Set<QueueListener> = new Set();
  private isWriting: boolean = false;

  /**
   * Safely loads the persistent queue from durable storage.
   * Handles malformed or non-array data gracefully without crashing.
   */
  public async getQueue(): Promise<QueuedSOSRequest[]> {
    if (this.memoryCache !== null) {
      return [...this.memoryCache];
    }

    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (!raw) {
        this.memoryCache = [];
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        console.warn('[OfflineSOSQueue] Stored queue is not an array. Resetting corrupted queue.');
        this.memoryCache = [];
        return [];
      }

      // Filter and validate items to discard corrupted entries while preserving valid ones
      const validItems: QueuedSOSRequest[] = [];
      for (const item of parsed) {
        if (
          item &&
          typeof item === 'object' &&
          typeof item.clientRequestId === 'string' &&
          item.clientRequestId.trim().length > 0 &&
          typeof item.driverId === 'string' &&
          item.payload &&
          typeof item.payload === 'object'
        ) {
          validItems.push({
            clientRequestId: item.clientRequestId,
            driverId: item.driverId,
            payload: {
              clientRequestId: item.clientRequestId,
              userId: item.payload.userId,
              latitude: item.payload.latitude ?? null,
              longitude: item.payload.longitude ?? null,
              accuracy: item.payload.accuracy ?? null,
              capturedAt: item.payload.capturedAt ?? null,
              locationStatus: item.payload.locationStatus || 'UNAVAILABLE',
              tripId: item.payload.tripId ?? null,
              vehicleId: item.payload.vehicleId ?? null,
              message: item.payload.message || 'EMERGENCY SOS: Driver triggered emergency alert',
              createdAt: item.payload.createdAt || item.createdAt || new Date().toISOString(),
            },
            createdAt: item.createdAt || new Date().toISOString(),
            retryCount: typeof item.retryCount === 'number' ? item.retryCount : 0,
            lastAttemptAt: item.lastAttemptAt ?? null,
            lastError: item.lastError ?? null,
            status: item.status === 'SYNCING' ? 'PENDING_SYNC' : (item.status || 'PENDING_SYNC'),
          });
        } else {
          console.warn('[OfflineSOSQueue] Discarding malformed queue entry:', item);
        }
      }

      this.memoryCache = validItems;
      return [...validItems];
    } catch (err: any) {
      console.error('[OfflineSOSQueue] Failed to parse stored queue. Returning empty queue to avoid crash:', err);
      this.memoryCache = [];
      return [];
    }
  }

  /**
   * Retrieves pending items belonging strictly to a specific driver account.
   */
  public async getDriverQueue(driverId: string): Promise<QueuedSOSRequest[]> {
    if (!driverId) return [];
    const all = await this.getQueue();
    const normDriver = String(driverId).toLowerCase();
    return all.filter((item) => String(item.driverId).toLowerCase() === normDriver);
  }

  /**
   * Enqueues a new SOS request durably before network submission.
   * Prevents overwriting if the clientRequestId already exists.
   */
  public async enqueue(request: QueuedSOSRequest): Promise<void> {
    if (!request || !request.clientRequestId || !request.driverId) {
      throw new Error('Invalid QueuedSOSRequest: clientRequestId and driverId are required');
    }

    const current = await this.getQueue();
    const existingIndex = current.findIndex((item) => item.clientRequestId === request.clientRequestId);

    let nextQueue: QueuedSOSRequest[];
    if (existingIndex >= 0) {
      console.warn(`[OfflineSOSQueue] Item with clientRequestId "${request.clientRequestId}" already queued. Preserving original.`);
      nextQueue = current;
    } else {
      nextQueue = [...current, request];
    }

    await this.persistQueue(nextQueue);
  }

  /**
   * Removes a successfully synchronized item from the queue by clientRequestId.
   * Never clears other items in the queue.
   */
  public async dequeue(clientRequestId: string): Promise<void> {
    if (!clientRequestId) return;
    const current = await this.getQueue();
    const nextQueue = current.filter((item) => item.clientRequestId !== clientRequestId);
    await this.persistQueue(nextQueue);
  }

  /**
   * Updates state metadata for an in-flight or retried item.
   */
  public async updateQueueItem(
    clientRequestId: string,
    patch: Partial<Pick<QueuedSOSRequest, 'retryCount' | 'lastAttemptAt' | 'lastError' | 'status'>>
  ): Promise<void> {
    if (!clientRequestId) return;
    const current = await this.getQueue();
    const index = current.findIndex((item) => item.clientRequestId === clientRequestId);
    if (index === -1) return;

    const nextQueue = [...current];
    nextQueue[index] = {
      ...nextQueue[index],
      ...patch,
    };

    await this.persistQueue(nextQueue);
  }

  /**
   * Subscribes to queue changes for real-time UI updates (e.g., driver alerts screen).
   */
  public subscribeQueue(listener: QueueListener): () => void {
    this.listeners.add(listener);
    // Initial emit
    this.getQueue().then((q) => {
      try {
        listener(q);
      } catch (_) {}
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Durably writes the queue to AsyncStorage and notifies subscribers.
   */
  private async persistQueue(queue: QueuedSOSRequest[]): Promise<void> {
    this.memoryCache = queue;
    try {
      this.isWriting = true;
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (err: any) {
      console.error('[OfflineSOSQueue] Error writing queue to AsyncStorage:', err);
    } finally {
      this.isWriting = false;
    }

    this.notifyListeners(queue);
  }

  private notifyListeners(queue: QueuedSOSRequest[]): void {
    const copy = [...queue];
    for (const listener of this.listeners) {
      try {
        listener(copy);
      } catch (err) {
        console.warn('[OfflineSOSQueue] Listener callback error:', err);
      }
    }
  }

  /**
   * Testing helper to reset queue cache & storage.
   */
  public async _resetForTesting(): Promise<void> {
    this.memoryCache = [];
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    this.notifyListeners([]);
  }
}

export const offlineSOSQueue = new OfflineSOSQueueService();
