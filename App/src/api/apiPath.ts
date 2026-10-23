import { Platform } from 'react-native';


// export const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001';
// const IS_PRODUCTION = !__DEV__;

// export const BASE_URL = IS_PRODUCTION
//   ? 'https://logisphereai.onrender.com'
//   : Platform.OS === 'android'
//     ? 'http://10.0.2.2:5001'
//     : 'http://localhost:5001';

export const BASE_URL = 'http://10.120.151.18:5001';

export const WS_URL = BASE_URL.replace(/^http/, 'ws');

export const GetChatUsers = `${BASE_URL}/api/chat/users`;
export const GetConversations = `${BASE_URL}/api/chat/conversations`;
export const CreateConversation = `${BASE_URL}/api/chat/conversations`;
export const GetMessages = (conversationId: string) => `${BASE_URL}/api/chat/conversations/${conversationId}/messages`;
export const SendMessageRest = (conversationId: string) => `${BASE_URL}/api/chat/conversations/${conversationId}/messages`;
export const MarkConversationRead = (conversationId: string) => `${BASE_URL}/api/chat/conversations/${conversationId}/read`;

export const Login = `${BASE_URL}/api/auth/login`;
export const requestemail = `${BASE_URL}/api/auth/request-reset-password`;
export const resetPassword = `${BASE_URL}/api/auth/reset-password`;
export const Signup = `${BASE_URL}/api/user/create`;
export const RegisterVehicle = `${BASE_URL}/api/vehicle/create`;
export const GetVehicles = `${BASE_URL}/api/vehicle/`;
export const DeleteVehicle = `${BASE_URL}/api/vehicle/delete/`;
export const UpdateVehicle = `${BASE_URL}/api/vehicle/update/`;
export const RegisterTrip = `${BASE_URL}/api/trip/create`;
export const GetTrips = `${BASE_URL}/api/trip`;
export const DispatchTrip = `${BASE_URL}/api/trip/dispatch`;
export const CompleteTrip = `${BASE_URL}/api/trip/complete`;
export const CancelTrip = `${BASE_URL}/api/trip/cancel`;
export const GetDrivers = `${BASE_URL}/api/user`;
export const RegisterDriver = `${BASE_URL}/api/user/create`;
export const UpdateDriver = `${BASE_URL}/api/user/update`;
export const DeleteDriver = `${BASE_URL}/api/user/delete`;
export const ChangePassword = `${BASE_URL}/api/auth/change-password`;
export const TriggerSOS = `${BASE_URL}/api/sos/trigger`;
export const GetMaintenance = `${BASE_URL}/api/maintenance`;
export const RegisterMaintenance = `${BASE_URL}/api/maintenance/create`;
export const CompleteMaintenance = (id: string) => `${BASE_URL}/api/maintenance/${id}/complete`;
export const GetFuel = `${BASE_URL}/api/fuel`;
export const RegisterFuel = `${BASE_URL}/api/fuel/create`;
export const GetExpenses = `${BASE_URL}/api/expenses`;
export const RegisterExpenses = `${BASE_URL}/api/expenses/create`;
export const ExportFuelPdf = `${BASE_URL}/api/fuel/report/export-pdf`;
export const GetAnalytics = `${BASE_URL}/api/analytics`;
export const GetDashboardSummary = `${BASE_URL}/api/dashboard/summary`;
export const UpdateTripStatus = `${BASE_URL}/api/trip`;
export const GetNotifications = `${BASE_URL}/api/notifications`;
export const LocationAutocomplete = `${BASE_URL}/api/v1/locations/autocomplete`;
export const LocationDetails = `${BASE_URL}/api/v1/locations/details`;
export const RouteRecommendation = `${BASE_URL}/api/ai/route-recommendation`;
export const ClockIn = `${BASE_URL}/api/attendance/clock-in`;
export const ClockOut = `${BASE_URL}/api/attendance/clock-out`;
export const GetAttendanceStatus = `${BASE_URL}/api/attendance/status`;
export const GetActiveTripAttendance = `${BASE_URL}/api/attendance/active-trip`;
export const GetAttendanceHistory = `${BASE_URL}/api/attendance/history`;
export const GetAttendanceReport = `${BASE_URL}/api/attendance/report`;
export const ExportAttendancePdf = `${BASE_URL}/api/attendance/report/export-pdf`;
export const GetLiveTracking = `${BASE_URL}/api/tracking/live`;
export const UpdateVehicleLocation = `${BASE_URL}/api/tracking/location`;
export const WS_TRACKING_URL = `${WS_URL}/ws/tracking`;
export const GetMyOrganizations = `${BASE_URL}/api/org/my-organizations`;

// Emergency Alerts
export const GetAlerts = `${BASE_URL}/api/alerts`;
export const GetAlertsCount = `${BASE_URL}/api/alerts/count`;
export const GetAlertDetails = (id: string) => `${BASE_URL}/api/alerts/${id}`;
export const AcknowledgeAlert = (id: string) => `${BASE_URL}/api/alerts/${id}/acknowledge`;
export const ResolveAlert = (id: string) => `${BASE_URL}/api/alerts/${id}/resolve`;
export const WS_ALERTS_URL = `${WS_URL}/ws/alerts`;

// AI Analytics & Forecasting
export const GetMaintenanceForecast = `${BASE_URL}/api/analytics/maintenance-forecast`;
export const GetVehicleMaintenanceForecast = (vehicleId: string) => `${BASE_URL}/api/analytics/maintenance-forecast/${vehicleId}`;
export const GetTripDelayInsights = (tripId: string) => {
  const cleanId = String(tripId || '').trim().replace(/^#/, '');
  return `${BASE_URL}/api/trip/${encodeURIComponent(cleanId)}/delay-insights`;
};
export const GetDestinationWeather = (tripId: string, lat?: number | null, lon?: number | null) => {
  const cleanId = String(tripId || '').trim().replace(/^#/, '');
  let url = `${BASE_URL}/api/trip/${encodeURIComponent(cleanId)}/destination-weather`;
  if (lat !== undefined && lat !== null && lon !== undefined && lon !== null) {
    url += `?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
  }
  return url;
};

// Carbon Intelligence & Sustainability
export const GetCarbonOverview = `${BASE_URL}/api/carbon/overview`;
export const GetCarbonVehicles = `${BASE_URL}/api/carbon/vehicles`;
export const GetCarbonTrips = `${BASE_URL}/api/carbon/trips`;
export const GetCarbonAdvisor = `${BASE_URL}/api/carbon/advisor`;
export const GetCarbonAnomalies = `${BASE_URL}/api/carbon/anomalies`;
export const GetCarbonTargets = `${BASE_URL}/api/carbon/targets`;
export const SetCarbonTarget = `${BASE_URL}/api/carbon/targets`;
export const CompareEcoRoute = `${BASE_URL}/api/carbon/eco-route-compare`;
export const GetCarbonReport = `${BASE_URL}/api/carbon/report`;



