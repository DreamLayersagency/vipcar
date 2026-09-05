export const ROLES = [
  'customer',
  'corporate_manager',
  'driver',
  'ops_agent',
  'admin',
] as const;

export type Role = (typeof ROLES)[number];

/** Staff roles allowed on ops/admin mutating routes. */
export const STAFF_ROLES = ['ops_agent', 'admin'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
