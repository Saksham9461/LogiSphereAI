describe('Manual Driver Registration Logic', () => {
  const validateDriverForm = (form: {
    name: string;
    licenseNumber: string;
    licenseExpiry: string;
    phone: string;
    email: string;
  }) => {
    const errors: Record<string, string> = {};

    if (!form.name.trim()) {
      errors.name = 'Full name is required';
    }

    if (!form.licenseNumber.trim()) {
      errors.licenseNumber = 'Licence number is required';
    }

    if (!form.licenseExpiry.trim()) {
      errors.licenseExpiry = 'Expiry date is required';
    } else {
      const expiryRegex = /^(0[1-9]|1[0-2])\/\d{4}$/;
      if (!expiryRegex.test(form.licenseExpiry.trim())) {
        errors.licenseExpiry = 'Use MM/YYYY format';
      } else {
        const [monthStr, yearStr] = form.licenseExpiry.trim().split('/');
        const month = parseInt(monthStr, 10);
        const year = parseInt(yearStr, 10);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        if (year < currentYear || (year === currentYear && month < currentMonth)) {
          errors.licenseExpiry = 'Licence has expired';
        }
      }
    }

    if (!form.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else {
      const cleanPhone = form.phone.replace(/[\s\-+]/g, '');
      if (cleanPhone.length < 10) {
        errors.phone = 'Enter a valid 10-digit phone number';
      }
    }

    if (!form.email.trim()) {
      errors.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        errors.email = 'Enter a valid email address';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  const isLicenceExpired = (expiryStr: string): boolean => {
    if (!expiryStr) return false;
    const parts = expiryStr.split('/');
    if (parts.length !== 2) return false;
    const month = parseInt(parts[0], 10);
    const year = parseInt(parts[1], 10);
    if (isNaN(month) || isNaN(year)) return false;
    const now = new Date();
    return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
  };

  const createDriverPayload = (form: {
    name: string;
    licenseNumber: string;
    licenseExpiry: string;
    phone: string;
    email: string;
    status?: string;
  }) => ({
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    role: 'Driver' as const,
    licenseNumber: form.licenseNumber.trim().toUpperCase(),
    licenseExpiry: form.licenseExpiry.trim(),
    status: form.status || 'Available',
  });

  const canManageDrivers = (role?: string): boolean => {
    return role?.toLowerCase() === 'manager';
  };

  test('validates valid manual driver entry correctly', () => {
    const validForm = {
      name: 'Rajesh Kumar',
      licenseNumber: 'DL-0420110012345',
      licenseExpiry: '12/2029',
      phone: '9876543210',
      email: 'rajesh.kumar@example.com',
    };

    const result = validateDriverForm(validForm);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });

  test('rejects missing full name', () => {
    const result = validateDriverForm({
      name: '   ',
      licenseNumber: 'DL-0420110012345',
      licenseExpiry: '12/2029',
      phone: '9876543210',
      email: 'rajesh@example.com',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBe('Full name is required');
  });

  test('rejects missing licence number', () => {
    const result = validateDriverForm({
      name: 'Rajesh Kumar',
      licenseNumber: '',
      licenseExpiry: '12/2029',
      phone: '9876543210',
      email: 'rajesh@example.com',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.licenseNumber).toBe('Licence number is required');
  });

  test('rejects invalid expiry format', () => {
    const result = validateDriverForm({
      name: 'Rajesh Kumar',
      licenseNumber: 'DL-0420110012345',
      licenseExpiry: '2029/12',
      phone: '9876543210',
      email: 'rajesh@example.com',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.licenseExpiry).toBe('Use MM/YYYY format');
  });

  test('rejects already expired licence', () => {
    const result = validateDriverForm({
      name: 'Rajesh Kumar',
      licenseNumber: 'DL-0420110012345',
      licenseExpiry: '01/2020',
      phone: '9876543210',
      email: 'rajesh@example.com',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.licenseExpiry).toBe('Licence has expired');
  });

  test('rejects invalid phone number', () => {
    const result = validateDriverForm({
      name: 'Rajesh Kumar',
      licenseNumber: 'DL-0420110012345',
      licenseExpiry: '12/2029',
      phone: '12345',
      email: 'rajesh@example.com',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.phone).toBe('Enter a valid 10-digit phone number');
  });

  test('rejects invalid email address', () => {
    const result = validateDriverForm({
      name: 'Rajesh Kumar',
      licenseNumber: 'DL-0420110012345',
      licenseExpiry: '12/2029',
      phone: '9876543210',
      email: 'rajesh-invalid-email',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe('Enter a valid email address');
  });

  test('correctly identifies expired licences with helper', () => {
    expect(isLicenceExpired('01/2020')).toBe(true);
    expect(isLicenceExpired('12/2099')).toBe(false);
    expect(isLicenceExpired('')).toBe(false);
    expect(isLicenceExpired('invalid')).toBe(false);
  });

  test('enforces RBAC so only Manager can add/edit drivers', () => {
    expect(canManageDrivers('Manager')).toBe(true);
    expect(canManageDrivers('manager')).toBe(true);
    expect(canManageDrivers('Driver')).toBe(false);
    expect(canManageDrivers('driver')).toBe(false);
    expect(canManageDrivers(undefined)).toBe(false);
  });

  test('constructs clean backend payload with uppercased licence number and trimmed values', () => {
    const payload = createDriverPayload({
      name: '  Vikram Singh  ',
      licenseNumber: 'dl0420150098765',
      licenseExpiry: '11/2030',
      phone: '+91 9988776655',
      email: 'VIKRAM.SINGH@EXAMPLE.COM ',
      status: 'Available',
    });

    expect(payload).toEqual({
      name: 'Vikram Singh',
      email: 'vikram.singh@example.com',
      phone: '+91 9988776655',
      role: 'Driver',
      licenseNumber: 'DL0420150098765',
      licenseExpiry: '11/2030',
      status: 'Available',
    });
  });
});
