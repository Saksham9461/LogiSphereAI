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
