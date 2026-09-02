export const ROLES = [
  'customer',
  'corporate_manager',
  'driver',
  'ops_agent',
  'admin',
] as const;

export type Role = (typeof ROLES)[number];
