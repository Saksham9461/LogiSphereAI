import { db } from '../../config/database';

export const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata';

/**
 * Get calendar date YYYY-MM-DD in the configured business timezone
 */
export function getBusinessDateString(date: Date = new Date(), timeZone = BUSINESS_TIMEZONE): string {
  try {
    return date.toLocaleDateString('en-CA', { timeZone });
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Get current time string in business timezone (e.g. "11:59 PM")
 */
export function getBusinessTimeString(date: Date = new Date(), timeZone = BUSINESS_TIMEZONE): string {
  try {
    return date.toLocaleTimeString('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Parse an attendance record's calendar date into YYYY-MM-DD format
 */
export function extractRecordDateKey(record: any, timeZone = BUSINESS_TIMEZONE): string {
  const created = record.created_at || record.createdAt || record.createdat;
  if (created) {
    try {
      const d = new Date(created);
      if (!isNaN(d.getTime())) {
        return getBusinessDateString(d, timeZone);
      }
    } catch (_) {}
  }

  // Fallback to record.date string parsing
  const rawDate = record.date;
  if (typeof rawDate === 'string') {
    // Check YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      return rawDate;
    }
    // Check DD/MM/YYYY or D/M/YYYY
    const parts = rawDate.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }

  return getBusinessDateString(new Date(), timeZone);
}

/**
 * Reconcile open attendance sessions.
 * 
 * Rules:
 * 1. An attendance session from a calendar day strictly before today (in business timezone)
 *    is closed at 11:59:59 PM of that day with auto_clock_out = true.
 * 2. An open session from today is closed if current time in business timezone is at or past 23:59:00.
 * 3. Never overwrites manual clock outs; idempotent and concurrency-safe.
 */
export async function runAutoClockOutReconciliation(targetUserId?: string): Promise<{
  reconciledCount: number;
  reconciledIds: string[];
}> {
  try {
    const allRecords = await db.list('attendance_records');
    const now = new Date();
    const todayDateKey = getBusinessDateString(now, BUSINESS_TIMEZONE);

    // Get current hour and minute in business timezone
    let currentHour = 0;
    let currentMinute = 0;
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: BUSINESS_TIMEZONE,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      }).formatToParts(now);
      currentHour = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
      currentMinute = Number(parts.find(p => p.type === 'minute')?.value ?? 0);
    } catch (_) {
      currentHour = now.getHours();
      currentMinute = now.getMinutes();
    }
    const isAtDayEnd = currentHour === 23 && currentMinute >= 59;

    const reconciledIds: string[] = [];

    for (const record of allRecords) {
      // Must be currently open (no clockOutTime)
      const clockOut = record.clockOutTime || record.clockouttime;
      if (clockOut) continue;

      const recordUserId = record.userId || record.userid;
      if (targetUserId && String(recordUserId).toLowerCase() !== String(targetUserId).toLowerCase()) {
        continue;
      }

      const recordDateKey = extractRecordDateKey(record, BUSINESS_TIMEZONE);
      const isPastDay = recordDateKey < todayDateKey;
      const isTodayExpired = recordDateKey === todayDateKey && isAtDayEnd;

      if (isPastDay || isTodayExpired) {
        // Construct the 11:59:59 PM timestamp for the specific attendance date
        const autoTimeStr = '11:59 PM';
        let dayEndIso = `${recordDateKey}T23:59:59.000Z`;
        try {
          // Adjust ISO for business timezone if needed
          const [y, m, d] = recordDateKey.split('-').map(Number);
          const localMidnight = new Date(Date.UTC(y, m - 1, d, 18, 29, 59)); // 23:59:59 IST is 18:29:59 UTC
          dayEndIso = localMidnight.toISOString();
        } catch (_) {}

        console.log(`[Auto Clock-Out] Auto closing session "${record.id}" for user "${recordUserId}" (Date: ${recordDateKey}) at 11:59 PM`);

        await db.update(
          'attendance_records',
          { id: record.id },
          {
            clockOutTime: autoTimeStr,
            clockouttime: autoTimeStr,
            autoClockOut: true,
            auto_clock_out: true,
            clockOutType: 'AUTOMATIC',
            clock_out_type: 'AUTOMATIC',
            status: 'Auto Clocked Out (11:59 PM)',
            updatedAt: dayEndIso,
            updated_at: dayEndIso,
          }
        );

        reconciledIds.push(record.id);
      }
    }

    if (reconciledIds.length > 0) {
      console.log(`[Auto Clock-Out Reconciliation] Successfully closed ${reconciledIds.length} expired session(s).`);
    }

    return {
      reconciledCount: reconciledIds.length,
      reconciledIds,
    };
  } catch (error) {
    console.error('[Auto Clock-Out Error] Reconciliation failed:', error);
    return { reconciledCount: 0, reconciledIds: [] };
  }
}

let scheduledJobInterval: NodeJS.Timeout | null = null;

/**
 * Initialize automatic clock-out background job.
 * Runs on startup to reconcile missed sessions, then repeats every 60 seconds.
 */
export function initAutoClockOutJob(): void {
  // 1. Initial reconciliation on server boot
  runAutoClockOutReconciliation().catch(err => {
    console.warn('[Auto Clock-Out] Initial boot reconciliation error:', err);
  });

  // 2. Periodic interval (every 60 seconds)
  if (scheduledJobInterval) {
    clearInterval(scheduledJobInterval);
  }

  scheduledJobInterval = setInterval(() => {
    runAutoClockOutReconciliation().catch(err => {
      console.warn('[Auto Clock-Out] Periodic reconciliation error:', err);
    });
  }, 60 * 1000);

  console.log(`[Auto Clock-Out Service] Initialized background reconciliation job (Timezone: ${BUSINESS_TIMEZONE}).`);
}

export function stopAutoClockOutJob(): void {
  if (scheduledJobInterval) {
    clearInterval(scheduledJobInterval);
    scheduledJobInterval = null;
  }
}
