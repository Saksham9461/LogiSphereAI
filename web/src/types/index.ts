// ==============================================================================
// LogiSphere AI — Web Portal Domain Types
// Organization Registration, Approval Workflow & Platform Administration
// ==============================================================================

export type OrgApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface OrgRegistrationPayload {
  organizationName: string;
  name?: string;
  slug?: string;
  formattedAddress?: string;
  address?: string;
  googlePlacesId?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  managerName: string;
  managerEmail: string;
  password?: string;
  managerPassword?: string;
  managerPhone?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface OrgRegistrationResponseData {
  organization: {
    id: string;
    name: string;
    slug: string;
    status: OrgApprovalStatus;
    registrationTimestamp: string;
  };
  membership: {
    id: string;
    status: string;
    role: string;
  };
  organizationId: string;
  name: string;
  slug: string;
  status: OrgApprovalStatus;
  managerEmail: string;
  registrationTimestamp: string;
}

export interface OrgStatusData {
  organizationId: string;
  name: string;
  slug: string;
  status: OrgApprovalStatus;
  registrationTimestamp: string;
  reviewReason?: string;
}

export interface OrgStatusByEmailResult {
  organizationName: string;
  maskedEmail: string;
  status: OrgApprovalStatus;
  registrationTimestamp: string;
  reviewReason?: string;
}

export interface CheckStatusApiResponse {
  success: boolean;
  found: boolean;
  message?: string;
  data?: OrgStatusByEmailResult;
}

export interface PlaceSuggestion {
  placeId: string;
  title: string;
  address: string;
  secondaryText?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: OrgApprovalStatus | 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED';
  plan?: 'FREE' | 'PRO' | 'ENTERPRISE';
  contactEmail?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  serviceResult?: T;
  details?: unknown;
}

// ==============================================================================
// Platform Administrator & Organization Governance Types
// ==============================================================================

export interface AdminUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  isPlatformAdmin: boolean;
}

export interface AdminOrgMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  phoneNo?: string;
  role: string;
  status: string;
  createdAt?: string;
}

export interface AdminOrgSummary {
  id: string;
  name: string;
  slug: string;
  formattedAddress: string;
  googlePlacesId?: string;
  latitude?: number;
  longitude?: number;
  status: OrgApprovalStatus;
  registrationTimestamp: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewReason?: string;
  memberCount?: number;
  manager?: {
    id: string;
    name: string;
    email: string;
    phoneNo?: string;
    role?: string;
    status?: string;
    membershipStatus?: string;
    createdAt?: string;
  } | null;
  members?: AdminOrgMember[];
}

export interface AdminOrgDetails extends AdminOrgSummary {
  members?: AdminOrgMember[];
  created_at?: string;
  updated_at?: string;
}

export interface AuditLogEntry {
  id: string;
  actorUserId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: 'ORG_REGISTERED' | 'ORG_APPROVED' | 'ORG_REJECTED' | 'ORG_SUSPENDED';
  targetOrgId?: string;
  reason?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AdminDashboardStats {
  totalOrganizations: number;
  pendingApplications: number;
  approvedOrganizations: number;
  rejectedOrganizations: number;
  suspendedOrganizations: number;
  recentActivity: AuditLogEntry[];
}

// ==============================================================================
// Authenticated SaaS Fleet Domain Types
// ==============================================================================

export interface AuthUser {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role: string;
  phoneNo?: string | null;
  organizationId?: string | null;
  organization_id?: string | null;
  organizationName?: string | null;
  token?: string;
  mustChangePassword?: boolean;
}

export interface Vehicle {
  id: string;
  vehicleID: string;
  name: string;
  registrationNumber: string;
  reg?: string;
  type: string;
  maxLoadCapacity: number;
  capacity?: number;
  odometer: number;
  acquisitionCost: number;
  cost?: number;
  status: 'AVAILABLE' | 'ON_TRIP' | 'IN_SHOP' | 'MAINTENANCE' | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Driver {
  id: string;
  driverID?: string;
  userID?: string;
  name: string;
  email: string;
  phoneNo?: string;
  role: string;
  status?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  driverScore?: number;
  assignedVehicleId?: string;
  createdAt?: string;
}

export interface Trip {
  id: string;
  tripID?: string;
  tripid?: string;
  vehicleID: string;
  vehicleName?: string;
  driverID: string;
  driverName?: string;
  source: string;
  destination: string;
  cargoWeight?: number | string;
  status:
    | 'PENDING_APPROVAL'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'GOING_TO_PICKUP'
    | 'ARRIVED_AT_PICKUP'
    | 'PICKED_UP'
    | 'IN_TRANSIT'
    | 'ARRIVED_AT_DROP'
    | 'DELIVERED'
    | 'CANCELLED'
    | string;
  distanceKm?: number;
  plannedDistance?: string;
  completedDistance?: string;
  progressPercent?: number;
  eta?: string;
  startOdometer?: number;
  finalOdometer?: number;
  fuelConsumed?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LiveVehicle {
  tripID: string;
  vehicleID: string;
  vehicleName: string;
  registrationNumber: string;
  driverID: string;
  driverName: string;
  driverPhone?: string;
  source: string;
  destination: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  speed: number;
  accuracy: number | null;
  heading: number | null;
  isLive: boolean;
  freshness: 'LIVE' | 'UPDATING' | 'STALE' | 'NO_SIGNAL';
  lastUpdated: string | null;
}

export interface AttendanceRecord {
  id: string;
  userId?: string;
  date: string;
  clockInTime: string;
  clockOutTime: string | null;
  locationName: string;
  distanceFromOffice: number;
  status: string;
  latitude?: number;
  longitude?: number;
  autoClockOut?: boolean;
}

export interface AttendanceStatusResponse {
  clockedIn: boolean;
  activeRecord: AttendanceRecord | null;
  geofence: {
    latitude: number;
    longitude: number;
    geofenceRadius: number;
    organizationName: string;
  } | null;
  history: AttendanceRecord[];
}

export interface MaintenanceRecord {
  id: string;
  maintenanceID?: string;
  vehicleID: string;
  vehicle?: string;
  serviceType: string;
  service?: string;
  cost: number;
  date: string;
  status: 'Active' | 'Completed' | string;
  rawStatus?: string;
}

export interface FuelLog {
  id: string;
  fuelLogId?: string;
  vehicleID: string;
  vehicle?: string;
  date: string;
  liters: number;
  cost: number;
  odometer?: number;
  createdAt?: string;
}

export interface ExpenseRecord {
  id: string;
  expenseId?: string;
  vehicleID: string;
  tripID?: string;
  vehicle?: string;
  trip?: string;
  toll: number;
  maint: number;
  other: number;
  total: number;
  createdAt?: string;
}

export interface EmergencyAlert {
  id: string;
  driverId: string;
  driverName: string;
  tripId?: string | null;
  vehicleId?: string | null;
  latitude: number | null;
  longitude: number | null;
  locationStatus: 'PRECISE' | 'LAST_KNOWN' | 'UNAVAILABLE';
  message: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledgedByName?: string | null;
  acknowledgedAt?: string | null;
  resolvedByName?: string | null;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phoneNo?: string | null;
  isOnline: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  status: 'SENT' | 'DELIVERED' | 'READ';
  tempId?: string;
}

export interface ConversationSummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  participant: ChatUser;
  lastMessage: {
    id: string;
    message: string;
    senderId: string;
    receiverId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

export interface FleetAiResponse {
  success: boolean;
  intent: string;
  type: string;
  message: string;
  metrics?: Record<string, number | string>;
  items?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    badge?: string;
    badgeColor?: string;
    metadata?: Record<string, string | number>;
    actionPayload?: any;
  }>;
  actions?: Array<{
    label: string;
    actionType: 'navigate' | 'query' | 'track_vehicle';
    payload?: any;
  }>;
  hasMore?: boolean;
  context?: {
    lastSubjectType?: 'vehicle' | 'trip' | 'driver';
    lastSubjectId?: string;
    lastSubjectName?: string;
  };
  suggestions?: string[];
  data?: any;
}

export interface DashboardSummaryData {
  stats: {
    activeVehicles: number;
    availableVehicles: number;
    vehiclesInMaintenance: number;
    activeTrips: number;
    previousTrips: number;
    driversOnDuty: number;
    fleetUtilization: number;
  };
  vehicleStatus: Array<{
    label: string;
    value: number;
    max: number;
    color: string;
  }>;
}
