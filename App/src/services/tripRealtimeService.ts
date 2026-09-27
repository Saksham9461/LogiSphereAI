import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

let activeChannel: RealtimeChannel | null = null;
let currentSubscribedUserId: string | null = null;
let currentSubscribedUserRole: string | null = null;

export function normalizeTrip(row: any) {
  if (!row) return row;
  return {
    ...row,
    tripID: row.tripID || row.tripid || row.id,
    driverID: row.driverID || row.driverid,
    vehicleID: row.vehicleID || row.vehicleid,
    cargoWeight: row.cargoWeight ?? row.cargoweight,
    plannedDistance: row.plannedDistance ?? row.planneddistance,
    startingOdometer: row.startingOdometer ?? row.startingodometer,
    finalOdometer: row.finalOdometer ?? row.finalodometer,
    fuelConsumed: row.fuelConsumed ?? row.fuelconsumed,
    sourceLatitude: row.sourceLatitude ?? row.sourcelatitude,
    sourceLongitude: row.sourceLongitude ?? row.sourcelongitude,
    destinationLatitude: row.destinationLatitude ?? row.destinationlatitude,
    destinationLongitude: row.destinationLongitude ?? row.destinationlongitude,
    sourcePlaceId: row.sourcePlaceId ?? row.sourceplaceid,
    destinationPlaceId: row.destinationPlaceId ?? row.destinationplaceid,
    createdById: row.createdById ?? row.createdbyid,
  };
}

export const subscribeToTripRealtime = (
  user: any,
  onRealtimeEvent: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', newRow: any, oldRow: any) => void
) => {
  if (!user) {
    console.warn('[Trip Realtime] Subscription skipped: user missing');
    return;
  }

  const userId = String(user.id || user.userId || user.driverID || '');
  const userRole = String(user.role || '');

  if (!userId) {
    console.warn('[Trip Realtime] Subscription skipped: user ID missing');
    return;
  }

  // Prevent duplicate realtime subscriptions for the exact same user session
  if (activeChannel && currentSubscribedUserId === userId && currentSubscribedUserRole === userRole) {
    console.log(`[Trip Realtime] Subscription already active for user ${userId}`);
    return;
  }

  // If subscription exists for a different user, clean it up first
  if (activeChannel) {
    console.log('[Trip Realtime] Cleaning up previous subscription channel');
    unsubscribeFromTripRealtime();
  }

  if (!supabase) {
    console.warn('[Trip Realtime] Supabase client not initialized. Cannot subscribe to Realtime.');
    return;
  }

  console.log('[Trip Realtime] Subscription initialized');
  currentSubscribedUserId = userId;
  currentSubscribedUserRole = userRole;

  const channelName = `trips-realtime-${userId}-${Date.now()}`;

  activeChannel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trips',
      },
      (payload: any) => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const rawNew = payload.new || {};
        const rawOld = payload.old || {};
        const newRow = normalizeTrip(rawNew);
        const oldRow = normalizeTrip(rawOld);

        console.log(`[Trip Realtime] Event received: ${eventType}`);

        const rowDriverId = String(newRow.driverID || oldRow.driverID || '');
        const isManager = userRole === 'ROLE_MANAGER' || userRole === 'ROLE_DISPATCHER';
        const driverMatched =
          isManager ||
          rowDriverId === userId ||
          (eventType === 'UPDATE' && String(oldRow.driverID || '') === userId);

        if (driverMatched) {
          console.log(`[Trip Realtime] Driver ID matched: ${rowDriverId || userId}`);
          console.log('[Trip Realtime] Updating driver trip state');
          onRealtimeEvent(eventType, newRow, oldRow);
        } else {
          console.log(`[Trip Realtime] Event ignored because driver_id doesn't match (${rowDriverId} vs ${userId})`);
        }
      }
    )
    .subscribe((status: string, err?: Error) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Trip Realtime] Subscription connected for user ${userId}`);
      } else if (status === 'CLOSED') {
        console.log('[Trip Realtime] Subscription closed');
      } else if (status === 'CHANNEL_ERROR') {
        console.warn(`[Trip Realtime] Subscription error: ${err?.message || 'Channel error'}`);
      } else {
        console.log(`[Trip Realtime] Subscription status: ${status}`);
      }
    });
};

export const unsubscribeFromTripRealtime = () => {
  if (activeChannel && supabase) {
    console.log('[Trip Realtime] Unsubscribing channel');
    supabase.removeChannel(activeChannel);
    activeChannel = null;
    currentSubscribedUserId = null;
    currentSubscribedUserRole = null;
    console.log('[Trip Realtime] Subscription closed');
  }
};
