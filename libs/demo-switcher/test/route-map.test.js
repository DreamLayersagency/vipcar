import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_VIEWS, findView } from '../src/views.js';
import { buildTargetUrl, filterQuery, isHiddenPath, matchRoute, splitViewPath } from '../src/route-map.js';

const v1 = findView('view-1');
const v2 = findView('view-2');

test('splitViewPath strips base path and locale', () => {
  assert.deepEqual(splitViewPath('/fr/fleet/toyota-rav4', v1), { lang: 'fr', rest: '/fleet/toyota-rav4', insideView: true });
  assert.deepEqual(splitViewPath('/v2/ar/booking', v2), { lang: 'ar', rest: '/booking', insideView: true });
  assert.deepEqual(splitViewPath('/v2', v2), { lang: null, rest: '/', insideView: true });
  assert.equal(splitViewPath('/en/fleet', v2).insideView, false);
});

test('matchRoute handles params and length', () => {
  assert.equal(matchRoute('/fleet/:slug', '/fleet/kia-picanto'), true);
  assert.equal(matchRoute('/fleet/:slug', '/fleet'), false);
  assert.equal(matchRoute('/', '/'), true);
});

test('view 1 -> view 2 keeps page, locale and trip query', () => {
  const { url, matched } = buildTargetUrl({
    fromView: v1,
    toView: v2,
    location: { pathname: '/fr/booking', search: '?vehicle=toyota-rav4&name=Ali&phone=123' },
  });
  assert.equal(matched, true);
  assert.equal(url, '/v2/fr/booking?vehicle=toyota-rav4');
});

test('view 2 -> view 1 home and detail pages', () => {
  assert.equal(buildTargetUrl({ fromView: v2, toView: v1, location: { pathname: '/v2/en' } }).url, '/en');
  assert.equal(buildTargetUrl({ fromView: v2, toView: v1, location: { pathname: '/v2/en/fleet/kia-picanto' } }).url, '/en/fleet/kia-picanto');
});

test('unknown page falls back to the target home in the same language', () => {
  const result = buildTargetUrl({ fromView: v1, toView: v2, location: { pathname: '/fr/does-not-exist', search: '?vehicle=x' } });
  assert.deepEqual(result, { url: '/v2/fr', matched: false });
});

test('missing or unsupported locale falls back to the first language', () => {
  assert.equal(buildTargetUrl({ fromView: v2, toView: v1, location: { pathname: '/v2/' } }).url, '/en');
  const narrow = { ...v2, languages: ['en', 'fr'] };
  assert.equal(buildTargetUrl({ fromView: v1, toView: narrow, location: { pathname: '/ar/faq' } }).url, '/v2/en/faq');
});

test('dev mode uses the target dev origin', () => {
  const { url } = buildTargetUrl({ fromView: v1, toView: v2, location: { pathname: '/en/fleet' }, dev: true });
  assert.equal(url, 'http://localhost:5174/v2/en/fleet');
});

test('filterQuery never carries personal fields', () => {
  assert.equal(filterQuery('?name=A&email=a@b.c&phone=1&pickup=Tunis&start=2026-11-01'), '?pickup=Tunis&start=2026-11-01');
  assert.equal(filterQuery(''), '');
});

test('switcher is hidden on the back office only', () => {
  assert.equal(isHiddenPath('/admin', v1), true);
  assert.equal(isHiddenPath('/admin/reservations/123', v1), true);
  assert.equal(isHiddenPath('/en/fleet', v1), false);
  assert.equal(isHiddenPath('/v2/en/fleet', v2), false);
});

test('registry entries are well formed', () => {
  const ids = new Set();
  for (const view of DEMO_VIEWS) {
    assert.ok(!ids.has(view.id), `duplicate id ${view.id}`);
    ids.add(view.id);
    assert.match(view.basePath, /^\/(.+\/)?$/, `${view.id} basePath must start and end with /`);
    assert.ok(view.languages.length > 0);
    assert.ok(view.routes.includes('/'));
  }
});
