import type {Response} from 'express';

export const ok = (res: Response, data: unknown, message = 'OK') => res.json({success: true, message, data});
export const fail = (res: Response, status: number, message: string, details?: unknown) =>
  res.status(status).json({success: false, message, details, data: details});

export const mustChangePasswordUsers = new Set<string>();

export const publicUser = (user: any) => {
  const isMustChange = Boolean(
    (user?.id && mustChangePasswordUsers.has(user.id)) ||
    (user?.email && mustChangePasswordUsers.has(user.email)) ||
    user?.mustChangePassword ||
    user?.mustchangepassword ||
    user?.must_change_password
  );

  return {
    id: user.id,
    userID: user.id,
    driverID: user.role === 'ROLE_DRIVER' || user.role === 'DRIVER' ? user.id : undefined,
    name: user.name,
    email: user.email,
    phoneNo: user.phoneNo ?? user.phoneno,
    phoneno: user.phoneNo ?? user.phoneno,
    role: user.role,
    licenseNo: user.licenseNo ?? user.licenseno,
    licenseno: user.licenseNo ?? user.licenseno,
    licenseExpiryDate: user.licenseExpiryDate ?? user.licenseexpirydate,
    licenseexpirydate: user.licenseExpiryDate ?? user.licenseexpirydate,
    trips: user.trips ?? 0,
    safetyScore: user.safetyScore ?? user.safetyscore ?? 95,
    safetyscore: user.safetyScore ?? user.safetyscore ?? 95,
    status: user.status ?? (user.role?.includes('DRIVER') ? 'AVAILABLE' : 'ACTIVE'),
    organizationId: user.organizationId || user.organization_id,
    organization_id: user.organization_id || user.organizationId,
    organizationName: user.organizationName || user.organization_name,
    mustChangePassword: isMustChange,
    must_change_password: isMustChange
  };
};
