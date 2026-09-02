export const NATS_PATTERNS = {
  identity: {
    register: 'identity.register',
    login: 'identity.login',
    refresh: 'identity.refresh',
    logout: 'identity.logout',
    me: 'identity.me',
    health: 'identity.health',
  },
} as const;
