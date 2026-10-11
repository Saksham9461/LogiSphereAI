import { Platform, PermissionsAndroid, Alert, NativeModules } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import client from '../../api/axiosClient';

interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

class DriverTrackingService {
  private activeTripId: string | null = null;
  private watchId: number | null = null;
  private heartbeatTimer: any = null;
  private isTracking: boolean = false;
  private lastSubmittedLocation: LocationCoords | null = null;
  private lastSubmissionTime: number = 0;

  // Minimum interval between successive network uploads (45 seconds)
  private readonly MIN_UPLOAD_INTERVAL_MS = 45000;
  // Maximum distance before forcing an immediate upload even if within 45s (100 meters)
  private readonly MOVEMENT_THRESHOLD_METERS = 100;
  // Reject locations with accuracy worse than 500 meters
  private readonly MAX_ACCEPTABLE_ACCURACY_METERS = 500;

  /**
   * Prompts the driver with the required GPS tracking disclosure before trip commencement.
   */
  public promptTrackingNotice(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'GPS Fleet Tracking Notice',
        'Keep GPS enabled while your trip is active. Your location is used for live fleet tracking. Location tracking stops when the trip ends.\n\nBackground location permission may be required for continued tracking.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Enable & Start Trip',
            style: 'default',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Checks and requests required Android & iOS location permissions
   */
  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const fineLocationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'LogiSphere AI requires precise GPS access for active fleet tracking.',
            buttonPositive: 'Grant Permission',
            buttonNegative: 'Deny',
          }
        );

        if (fineLocationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Precise location permission is required for fleet tracking.');
          return false;
        }

        // Notification permission for Android 13+ (API 33+)
        if (Platform.Version >= 33) {
          try {
            await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
          } catch (notifErr) {
            console.log('[DriverTracking] Notification permission error (non-fatal):', notifErr);
          }
        }

        // Background location permission for Android 10+ (API 29+)
        if (Platform.Version >= 29) {
          try {
            const bgGranted = await PermissionsAndroid.check(
              PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
            );
            if (!bgGranted) {
              await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
                {
                  title: 'Background Location Access',
                  message:
                    'LogiSphere AI uses background location to update fleet dispatchers while your trip is active.',
                  buttonPositive: 'Allow in Background',
                  buttonNegative: 'Only While Using App',
                }
              );
            }
          } catch (bgErr) {
            console.log('[DriverTracking] Background location request skipped:', bgErr);
          }
        }

        return true;
      } catch (err) {
        console.warn('[DriverTracking] Android permission request error:', err);
        return false;
      }
    } else if (Platform.OS === 'ios') {
      return new Promise((resolve) => {
        Geolocation.requestAuthorization(
          () => resolve(true),
          (err) => {
            console.warn('[DriverTracking] iOS authorization error:', err);
            resolve(false);
          }
        );
      });
    }

    return true;
  }

  /**
   * Starts tracking for an active trip.
   */
  public async startTracking(tripId: string): Promise<boolean> {
    if (!tripId) {
      console.warn('[DriverTracking] startTracking called without tripId');
      return false;
    }

    // Stop existing tracking session if running for another trip
    if (this.isTracking && this.activeTripId !== tripId) {
      console.log(`[DriverTracking] Switching active tracking from ${this.activeTripId} to ${tripId}`);
      await this.stopTracking();
    }

    if (this.isTracking && this.activeTripId === tripId) {
      console.log(`[DriverTracking] Tracking already active for trip ${tripId}`);
      return true;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('[DriverTracking] Cannot start tracking: permissions not granted');
      return false;
    }

    this.activeTripId = tripId;
    this.isTracking = true;

    // Start native Android Foreground Service for persistent notification and background execution
    if (Platform.OS === 'android' && NativeModules.LocationForegroundModule?.startService) {
      try {
        await NativeModules.LocationForegroundModule.startService(tripId);
        console.log('[DriverTracking] Android Foreground Service started');
      } catch (fgErr) {
        console.warn('[DriverTracking] Foreground service start note:', fgErr);
      }
    }

    // Configure Geolocation module
    try {
      Geolocation.setRNConfiguration({
        skipPermissionRequests: true,
        enableBackgroundLocationUpdates: true,
        locationProvider: 'playServices',
      });
    } catch (cfgErr) {
      console.warn('[DriverTracking] Geolocation config warning:', cfgErr);
    }

    // 1. Initial immediate location capture
    this.captureAndUpload();

    // 2. Continuous location watcher (~60s interval / 25m distance filter)
    try {
      this.watchId = Geolocation.watchPosition(
        (position) => {
          this.handlePositionUpdate(position);
        },
        (error) => {
          console.warn('[DriverTracking] WatchPosition error:', error.message);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 25,
          interval: 60000,
          fastestInterval: 30000,
        }
      );
    } catch (watchErr) {
      console.warn('[DriverTracking] watchPosition failed to attach:', watchErr);
    }

    // 3. Periodic fallback timer: ensures updates every ~60 seconds even if stationary
    this.heartbeatTimer = setInterval(() => {
      if (this.isTracking && this.activeTripId) {
        this.captureAndUpload();
      }
    }, 60000);

    console.log(`[DriverTracking] Live tracking started successfully for trip ${tripId}`);
    return true;
  }

  /**
   * Handles a position fix from GPS watcher
   */
  private handlePositionUpdate(position: any) {
    if (!this.isTracking || !this.activeTripId) return;

    const coords: LocationCoords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
      speed: position.coords.speed ? Math.max(0, position.coords.speed * 3.6) : 0, // convert m/s to km/h
      heading: position.coords.heading ?? null,
      timestamp: position.timestamp || Date.now(),
    };

    // Filter out low accuracy GPS readings
    if (coords.accuracy !== null && coords.accuracy > this.MAX_ACCEPTABLE_ACCURACY_METERS) {
      console.log(`[DriverTracking] Discarding inaccurate reading (${coords.accuracy}m > ${this.MAX_ACCEPTABLE_ACCURACY_METERS}m)`);
      return;
    }

    const now = Date.now();
    const timeSinceLastUpload = now - this.lastSubmissionTime;

    // Movement calculation
    let distanceMoved = 0;
    if (this.lastSubmittedLocation) {
      distanceMoved = this.calculateHaversineDistance(
        this.lastSubmittedLocation.latitude,
        this.lastSubmittedLocation.longitude,
        coords.latitude,
        coords.longitude
      );
    }

    // Optimization: Skip upload if less than MIN_UPLOAD_INTERVAL and hasn't moved significantly
    if (
      this.lastSubmittedLocation &&
      timeSinceLastUpload < this.MIN_UPLOAD_INTERVAL_MS &&
      distanceMoved < this.MOVEMENT_THRESHOLD_METERS
    ) {
      return;
    }

    this.submitLocation(coords);
  }

  /**
   * One-off capture and upload
   */
  private captureAndUpload() {
    if (!this.isTracking || !this.activeTripId) return;

    Geolocation.getCurrentPosition(
      (position) => {
        this.handlePositionUpdate(position);
      },
      (error) => {
        console.warn('[DriverTracking] getCurrentPosition fallback error:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  }

  /**
   * Sends GPS coordinate packet to backend
   */
  private async submitLocation(coords: LocationCoords) {
    if (!this.activeTripId) return;

    try {
      this.lastSubmissionTime = Date.now();
      this.lastSubmittedLocation = coords;

      const payload = {
        tripID: this.activeTripId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        speed: coords.speed,
        accuracy: coords.accuracy,
        heading: coords.heading,
        deviceTimestamp: new Date(coords.timestamp).toISOString(),
      };

      await client.post('/api/tracking/location', payload);
      console.log(`[DriverTracking] Location uploaded for trip ${this.activeTripId}: [${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}]`);
    } catch (err: any) {
      console.warn('[DriverTracking] Failed to submit location update:', err?.response?.data?.message || err?.message);
    }
  }

  /**
   * Stops active tracking and cleans up native services and timers
   */
  public async stopTracking() {
    if (!this.isTracking && !this.activeTripId) return;

    console.log(`[DriverTracking] Stopping tracking for trip ${this.activeTripId}`);

    // Clear watch
    if (this.watchId !== null) {
      try {
        Geolocation.clearWatch(this.watchId);
      } catch (e) {
        console.warn('[DriverTracking] clearWatch error:', e);
      }
      this.watchId = null;
    }

    // Clear periodic timer
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Stop native Android Foreground Service
    if (Platform.OS === 'android' && NativeModules.LocationForegroundModule?.stopService) {
      try {
        await NativeModules.LocationForegroundModule.stopService();
        console.log('[DriverTracking] Android Foreground Service stopped');
      } catch (fgErr) {
        console.warn('[DriverTracking] Foreground service stop note:', fgErr);
      }
    }

    this.activeTripId = null;
    this.isTracking = false;
    this.lastSubmittedLocation = null;
    this.lastSubmissionTime = 0;
  }

  public getIsTracking(): boolean {
    return this.isTracking;
  }

  public getActiveTripId(): string | null {
    return this.activeTripId;
  }

  /**
   * Haversine distance in meters between two lat/lng coordinates
   */
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export const driverTrackingService = new DriverTrackingService();
export default driverTrackingService;
