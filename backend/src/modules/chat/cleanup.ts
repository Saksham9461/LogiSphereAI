import { db } from '../../config/database';

let cleanupInterval: NodeJS.Timeout | null = null;

export async function runChatRetentionCleanup(): Promise<number> {
  try {
    const retentionMs = 24 * 60 * 60 * 1000; // 24 hours
    const cutoffIso = new Date(Date.now() - retentionMs).toISOString();
    const deletedCount = await db.deleteMessagesOlderThan(cutoffIso);
    console.log(`[Chat Cleanup] Executed 24h retention cleanup at ${new Date().toISOString()}. Deleted ${deletedCount} expired message(s).`);
    return deletedCount;
  } catch (error) {
    console.error('[Chat Cleanup Error] Failed to execute 24h chat cleanup:', error);
    return 0;
  }
}

export function startChatCleanupJob(intervalMs = 60 * 60 * 1000): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  // Run immediately on server start
  runChatRetentionCleanup().catch(err => {
    console.error('[Chat Cleanup Error] Immediate startup cleanup failed:', err);
  });
  // Schedule hourly periodic run
  cleanupInterval = setInterval(() => {
    runChatRetentionCleanup().catch(err => {
      console.error('[Chat Cleanup Error] Periodic cleanup failed:', err);
    });
  }, intervalMs);
  console.log(`[Chat Cleanup] 24-Hour retention cleanup job initialized (Interval: ${intervalMs / 1000}s).`);
}

export function stopChatCleanupJob(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
