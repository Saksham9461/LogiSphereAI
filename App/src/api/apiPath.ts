import { Platform } from 'react-native';

export const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001';

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
export const GetFuel = `${BASE_URL}/api/fuel`;
export const RegisterFuel = `${BASE_URL}/api/fuel/create`;
export const GetExpenses = `${BASE_URL}/api/expenses`;
export const RegisterExpenses = `${BASE_URL}/api/expenses/create`;
export const GetAnalytics = `${BASE_URL}/api/analytics`;
export const GetDashboardSummary = `${BASE_URL}/api/dashboard/summary`;
export const UpdateTripStatus = `${BASE_URL}/api/trip`;
export const GetNotifications = `${BASE_URL}/api/notifications`;
export const LocationAutocomplete = `${BASE_URL}/api/v1/locations/autocomplete`;
export const LocationDetails = `${BASE_URL}/api/v1/locations/details`;
export const RouteRecommendation = `${BASE_URL}/api/ai/route-recommendation`;







