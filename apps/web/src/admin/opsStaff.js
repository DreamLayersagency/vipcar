import { apiWithAuth } from '../auth.js';

/**
 * @typedef {{ id: string, email: string, name: string, phone: string | null, locale: string, role: string, isActive?: boolean }} StaffUser
 */

export async function listOpsStaff(opts = {}) {
  const payload = await apiWithAuth('/v1/ops/staff', {
    locale: opts.locale,
    signal: opts.signal,
  });
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function createOpsStaff(body, opts = {}) {
  const payload = await apiWithAuth('/v1/ops/staff', {
    method: 'POST',
    locale: opts.locale,
    body: {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      password: body.password,
      ...(body.phone?.trim() ? { phone: body.phone.trim() } : {}),
      locale: body.locale || 'en',
    },
  });
  return payload?.data;
}

export function validateStaffForm(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'required';
  if (!form.email?.trim()) errors.email = 'required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'email';
  if (!form.password || form.password.length < 8) errors.password = 'password';
  return errors;
}
