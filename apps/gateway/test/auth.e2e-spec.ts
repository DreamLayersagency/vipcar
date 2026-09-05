/**
 * Auth happy-path integration test against a live stack:
 * gateway + identity + Postgres + NATS.
 *
 * Prerequisites: see README "Auth e2e test".
 * Override base URL with GATEWAY_URL (default http://127.0.0.1:3000).
 */

const gatewayUrl = (process.env.GATEWAY_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

type AuthResult = {
  data: {
    user: { id: string; email: string; name: string; role: string; locale: string };
    accessToken: string;
    refreshToken: string;
  };
};

type MeResult = {
  data: { id: string; email: string; name: string; role: string; locale: string };
};

async function jsonFetch(path: string, init?: RequestInit): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${gatewayUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }
  return { status: response.status, body };
}

describe('Auth happy path (gateway → identity)', () => {
  const email = `e2e.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = 'test-pass-12';
  const name = 'E2E User';

  beforeAll(async () => {
    let health: { status: number; body: unknown };
    try {
      health = await jsonFetch('/v1/health');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Gateway unreachable at ${gatewayUrl} (${message}). Start postgres, nats, identity, and gateway first — see README.`,
      );
    }
    expect(health.status).toBe(200);
  }, 15_000);

  it('POST /v1/auth/register → POST /v1/auth/login → GET /v1/auth/me', async () => {
    const register = await jsonFetch('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, locale: 'en' }),
    });
    expect(register.status).toBe(201);
    const registered = register.body as AuthResult;
    expect(registered.data.user.email).toBe(email);
    expect(registered.data.accessToken).toBeTruthy();
    expect(registered.data.refreshToken).toBeTruthy();

    const login = await jsonFetch('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    expect(login.status).toBe(201);
    const loggedIn = login.body as AuthResult;
    expect(loggedIn.data.user.email).toBe(email);
    expect(loggedIn.data.accessToken).toBeTruthy();

    const me = await jsonFetch('/v1/auth/me', {
      method: 'GET',
      headers: { authorization: `Bearer ${loggedIn.data.accessToken}` },
    });
    expect(me.status).toBe(200);
    const profile = me.body as MeResult;
    expect(profile.data.email).toBe(email);
    expect(profile.data.name).toBe(name);
    expect(profile.data.role).toBe('customer');
  }, 30_000);
});
