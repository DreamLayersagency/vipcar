import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatQuoteReference, buildWhatsAppQuoteMessage, whatsAppUrl, quoteErrorMessage } from '../src/quotes.js';
import { safeNextPath, loginErrorMessage } from '../src/auth.js';
import { formatCurrency } from '../src/currency.js';
import { mapVehicleDto, pickRelated } from '../src/catalog.js';
import { ApiError, api } from '../src/api.js';
import { configureClient } from '../src/config.js';

test('quote reference matches App 1 format', () => {
  assert.equal(formatQuoteReference('3f2b9c1a-0000-4000-8000-000000000000'), 'VC-3F2B9C1A');
  assert.equal(formatQuoteReference(''), '—');
  assert.equal(formatQuoteReference(undefined), '—');
});

test('WhatsApp message keeps optional lines out', () => {
  const text = buildWhatsAppQuoteMessage({ service: 'rental', pickup: 'Tunis', startDate: '2026-11-01', endDate: '2026-11-04', name: 'A', phone: '+216 1' });
  assert.equal(text, 'Hello VIPCAR, quote request. Service: rental. Pick-up: Tunis. Dates: 2026-11-01 to 2026-11-04. Name: A. Phone: +216 1.');
  assert.equal(whatsAppUrl('a b', 'https://wa.me/1'), 'https://wa.me/1?text=a%20b');
});

test('safeNextPath only allows same view and locale', () => {
  const opts = { lang: 'fr', basePath: '/v2/' };
  assert.equal(safeNextPath('/v2/fr/booking', opts), '/v2/fr/booking');
  assert.equal(safeNextPath(encodeURIComponent('/v2/fr/my-bookings'), opts), '/v2/fr/my-bookings');
  assert.equal(safeNextPath('/fr/booking', opts), '/v2/fr/my-bookings');
  assert.equal(safeNextPath('https://evil.example/v2/fr', opts), '/v2/fr/my-bookings');
  assert.equal(safeNextPath('//evil.example', opts), '/v2/fr/my-bookings');
  assert.equal(safeNextPath(null, { lang: 'en' }), '/en/my-bookings');
});

test('currency conversion is display-only, TND source', () => {
  assert.equal(formatCurrency(100, 'TND', 'en'), '100 TND');
  assert.equal(formatCurrency(100, 'EUR', 'en'), '€30');
  assert.equal(formatCurrency('x', 'TND', 'en'), '—');
});

test('vehicle mapping and related picks', () => {
  const car = mapVehicleDto({ slug: 'a', name: 'A', category: 'SUV', tier: 'Premium', baseDailyPriceTnd: 280, seats: 5, bags: 2, transmission: 'Automatic', imageKey: 'x.png' });
  assert.deepEqual(car, { slug: 'a', name: 'A', cat: 'SUV', tier: 'Premium', price: 280, seats: 5, bags: 2, transmission: 'Automatic', image: 'x.png' });
  const list = [car, { slug: 'b', cat: 'Sedan' }, { slug: 'c', cat: 'SUV' }, { slug: 'd', cat: 'SUV' }];
  assert.deepEqual(pickRelated(list, car).map((v) => v.slug), ['c', 'd', 'b']);
});

test('error messages are localized and never echo 5xx internals', () => {
  const internal = new ApiError({ status: 502, message: 'nats timeout at catalog.vehicles.get' });
  assert.ok(!quoteErrorMessage(internal, 'en').includes('nats'));
  assert.equal(loginErrorMessage(new ApiError({ status: 401, message: 'x' }), 'fr'), 'E-mail ou mot de passe incorrect.');
});

test('api() refuses to run without a configured base URL', async () => {
  configureClient({ apiBaseUrl: '' });
  await assert.rejects(() => api('/v1/health'), (err) => err instanceof ApiError && err.code === 'API_URL_MISSING');
});
