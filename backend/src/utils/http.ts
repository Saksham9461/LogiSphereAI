import type {Response} from 'express';

export const ok = (res: Response, data: unknown, message = 'OK') => res.json({success: true, message, data});
export const fail = (res: Response, status: number, message: string, details?: unknown) =>
  res.status(status).json({success: false, message, details});

export const mustChangePasswordUsers = new Set<string>();

export const publicUser = (user: any) => {
  const isMustChange = Boolean(
    (user?.id && mustChangePasswordUsers.has(user.id)) ||
    (user?.email && mustChangePasswordUsers.has(user.email)) ||
    user?.mustChangePassword ||
    user?.must_change_password
  );

  return {
    id: user.id,
    userID: user.id,
    driverID: user.role === 'ROLE_DRIVER' || user.role === 'DRIVER' ? user.id : undefined,
    name: user.name,
    email: user.email,
    phoneNo: user.phoneNo,
    role: user.role,
    licenseNo: user.licenseNo,
    licenseExpiryDate: user.licenseExpiryDate,
    trips: user.trips ?? 0,
    safetyScore: user.safetyScore ?? 95,
    status: user.status ?? (user.role?.includes('DRIVER') ? 'AVAILABLE' : 'ACTIVE'),
    mustChangePassword: isMustChange,
    must_change_password: isMustChange
  };
};
