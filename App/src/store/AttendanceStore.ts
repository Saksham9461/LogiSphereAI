import { create } from 'zustand';

export type AttendanceStatus = 'NOT_CLOCKED_IN' | 'CHECKING_LOCATION' | 'CLOCKED_IN' | 'OUTSIDE_GEOFENCE' | 'LOCATION_UNAVAILABLE';

export interface AttendanceRecord {
  id: string;
  date: string;
  clockInTime: string;
  clockOutTime: string | null;
  locationName: string;
  distanceFromOffice: number;
  status: 'Verified Location' | 'Manual Override';
}

interface AttendanceState {
  status: AttendanceStatus;
  clockInTime: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceFromOffice: number | null;
  history: AttendanceRecord[];
  
  // Actions
  setStatus: (status: AttendanceStatus) => void;
  clockIn: (lat: number, lon: number, distance: number, locationName: string) => void;
  clockOut: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  status: 'NOT_CLOCKED_IN',
  clockInTime: null,
  latitude: null,
  longitude: null,
  distanceFromOffice: null,
  history: [], // Starts empty

  setStatus: (status) => set({ status }),
  
  clockIn: (lat, lon, distance, locationName) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString();

    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      date: dateStr,
      clockInTime: timeStr,
      clockOutTime: null,
      locationName,
      distanceFromOffice: distance,
      status: 'Verified Location'
    };

    set((state) => ({
      status: 'CLOCKED_IN',
      clockInTime: timeStr,
      latitude: lat,
      longitude: lon,
      distanceFromOffice: distance,
      history: [newRecord, ...state.history]
    }));
  },

  clockOut: () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    set((state) => {
      // Update the latest history record with clock out time
      const updatedHistory = [...state.history];
      if (updatedHistory.length > 0 && !updatedHistory[0].clockOutTime) {
        updatedHistory[0].clockOutTime = timeStr;
      }
      
      return {
        status: 'NOT_CLOCKED_IN',
        clockInTime: null,
        latitude: null,
        longitude: null,
        distanceFromOffice: null,
        history: updatedHistory
      };
    });
  }
}));
