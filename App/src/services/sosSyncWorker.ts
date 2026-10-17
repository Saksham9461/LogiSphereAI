import { AppState, AppStateStatus } from 'react-native';
import client from '../api/axiosClient';
import { TriggerSOS } from '../api/apiPath';
import { offlineSOSQueue, QueuedSOSRequest } from './offlineSOSQueue';
import useAuthStore from '../store/AuthStore';
import { useAlertStore } from '../store/AlertStore';

class SOSSyncWorkerService {
  private isProcessing: boolean = false;
  private isInitialized: boolean = false;
  private pollIntervalId: any = null;
  private appStateSubscription: any = null;
  private queueSubscription: any = null;

  /**
   * Initializes listeners for app foreground, network hints, and auth changes.
   */
  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Listen for AppState transition to 'active' (foreground resume)
    this.appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        this.syncPendingSOS('app_foreground');
      }
    });

    // 2. React to queue updates (start/stop periodic retry worker dynamically)
    this.queueSubscription = offlineSOSQueue.subscribeQueue((queue) => {
      const currentUser = useAuthStore.getState().user;
      const currentDriverId = currentUser?.id || currentUser?.userId;
      const driverItems = currentDriverId
        ? queue.filter((i) => String(i.driverId).toLowerCase() === String(currentDriverId).toLowerCase())
        : [];

      if (driverItems.length > 0) {
        this.ensurePolling();
      } else {
        this.stopPolling();
      }
    });

    // 3. React to authentication state changes (resume sync after login)
    useAuthStore.subscribe((state, prevState) => {
      const prevId = prevState?.user?.id || prevState?.user?.userId;
      const currentId = state?.user?.id || state?.user?.userId;

      if (state.authStatus === 'authenticated' && currentId && currentId !== prevId) {
        this.syncPendingSOS('auth_resumed');
      }
    });

    // 4. Optional NetInfo listener if available
    try {
      // Dynamic require to avoid crashing if native module is not present
      const NetInfo = require('@react-native-community/netinfo');
      if (NetInfo?.addEventListener) {
        NetInfo.addEventListener((netState: any) => {
          if (netState?.isConnected && netState?.isInternetReachable !== false) {
            this.syncPendingSOS('netinfo_connected');
          }
        });
      }
    } catch (_) {
      // NetInfo not installed or native module not linked
    }

    // Trigger initial check on app boot
    this.syncPendingSOS('app_init');
  }

  /**
   * Starts periodic bounded background check ONLY when pending queue has items.
   */
  private ensurePolling(): void {
    if (this.pollIntervalId) return;
    // Bounded interval: check every 25 seconds for pending queue items
    this.pollIntervalId = setInterval(() => {
      this.syncPendingSOS('timer_tick');
    }, 25000);
  }

  private stopPolling(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  /**
   * Main synchronization worker execution.
   * Sequential, idempotent, mutex-guarded, with bounded backoff and account binding.
   */
  public async syncPendingSOS(triggerReason = 'manual'): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    // Overlap prevention (Mutex lock)
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    // Auth check: verify user is logged in
    const currentUser = useAuthStore.getState().user;
    const authStatus = useAuthStore.getState().authStatus;
    if (authStatus !== 'authenticated' || !currentUser) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    // Role check: Only drivers create SOS alerts
    const role = String(currentUser.role || '').toUpperCase();
    const isDriver = role === 'ROLE_DRIVER' || role === 'DRIVER';
    if (!isDriver) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    const currentDriverId = currentUser.id || currentUser.userId;
    if (!currentDriverId) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    // Account isolation: Strictly fetch pending items belonging ONLY to this authenticated driver
    const pendingItems = await offlineSOSQueue.getDriverQueue(currentDriverId);
    if (!pendingItems || pendingItems.length === 0) {
      this.stopPolling();
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      console.log(`[SOSSyncWorker] Starting sync for driver "${currentDriverId}". Pending count: ${pendingItems.length} (Trigger: ${triggerReason})`);

      // Sequential processing in FIFO order
      for (const item of pendingItems) {
        processed++;

        // Exponential backoff check for timer ticks
        if (triggerReason === 'timer_tick' && item.lastAttemptAt && item.retryCount > 0) {
          // Bounded exponential backoff: min(60s, 1s * 2^retryCount) + random jitter (0-1s)
          const baseDelayMs = Math.min(60000, 1000 * Math.pow(2, Math.min(item.retryCount, 6)));
          const jitterMs = Math.floor(Math.random() * 1000);
          const requiredDelayMs = baseDelayMs + jitterMs;
          const timeSinceLastAttempt = Date.now() - new Date(item.lastAttemptAt).getTime();

          if (timeSinceLastAttempt < requiredDelayMs) {
            console.log(`[SOSSyncWorker] Skipping item "${item.clientRequestId}" (in backoff: ${timeSinceLastAttempt}ms < ${requiredDelayMs}ms)`);
            continue;
          }
        }

        // Mark item as syncing
        await offlineSOSQueue.updateQueueItem(item.clientRequestId, { status: 'SYNCING' });

        try {
          const payload = {
            ...item.payload,
            clientRequestId: item.clientRequestId,
          };

          const response = await client.post(TriggerSOS, payload);
          const data = response?.data;

          if (response.status === 200 || response.status === 201 || (data?.success && data?.alert)) {
            const persistedAlert = data?.alert;
            console.log(`[SOSSyncWorker SUCCESS] Synchronized SOS item "${item.clientRequestId}" -> Alert ID: ${persistedAlert?.id || 'OK'}`);

            // Remove from local persistent queue ONLY after backend confirmation
            await offlineSOSQueue.dequeue(item.clientRequestId);
            succeeded++;

            // Inject the confirmed alert into the AlertStore so manager / driver UI updates immediately
            if (persistedAlert) {
              try {
                useAlertStore.getState().handleRealtimeAlert(persistedAlert);
              } catch (_) {}
            }
          } else {
            throw new Error(data?.message || 'Server rejected SOS sync');
          }
        } catch (error: any) {
          failed++;
          const status = error?.response?.status;
          const errMsg = error?.response?.data?.message || error?.message || 'Network unreachable';

          console.warn(`[SOSSyncWorker FAILED] Error syncing item "${item.clientRequestId}":`, errMsg);

          if (status === 401) {
            // Token expired or invalid: retain item in queue, wait for user to re-authenticate
            await offlineSOSQueue.updateQueueItem(item.clientRequestId, {
              status: 'PENDING_SYNC',
              lastAttemptAt: new Date().toISOString(),
              lastError: 'Session expired. Waiting for authentication.',
            });
            // Stop processing further items until re-authenticated
            break;
          } else if (status === 403) {
            // Unauthorized or role forbidden: retain item without spamming
            await offlineSOSQueue.updateQueueItem(item.clientRequestId, {
              status: 'PENDING_SYNC',
              lastAttemptAt: new Date().toISOString(),
              lastError: errMsg,
            });
            break;
          } else {
            // Transient network failure (timeout, DNS, offline, 500/502/503/504):
            // Retain item for retry with incremented retry count
            await offlineSOSQueue.updateQueueItem(item.clientRequestId, {
              retryCount: item.retryCount + 1,
              lastAttemptAt: new Date().toISOString(),
              lastError: errMsg,
              status: 'PENDING_SYNC',
            });
            // Break loop on network failure to avoid spamming an unreachable host
            break;
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed, succeeded, failed };
  }

  public cleanup(): void {
    this.stopPolling();
    if (this.appStateSubscription?.remove) {
      this.appStateSubscription.remove();
    }
    if (this.queueSubscription) {
      this.queueSubscription();
    }
    this.isInitialized = false;
  }
}

export const sosSyncWorker = new SOSSyncWorkerService();
