import React, { createContext, useContext, useEffect, useState } from 'react';
import { CURRENCY_STORAGE_KEY, getInitialCurrency } from '../../../libs/web-client/src/index.js';
import { locations } from './content/app1-content.js';

const CurrencyContext = createContext({ currency: 'TND', setCurrency: () => {} });

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(getInitialCurrency);
  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    } catch {
      /* storage can be unavailable in private browsing */
    }
  }, [currency]);
  return <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

/* ------------------------------------------------------------------ */
/* Quote draft                                                          */
/* ------------------------------------------------------------------ */

const DRAFT_KEY = 'vipcar_v2_quote_draft';
export const SERVICE_KEYS = ['rental', 'transfer', 'chauffeur'];
const DURATIONS = ['hourly', 'half-day', 'full-day'];

export const EMPTY_TRIP = Object.freeze({
  service: 'rental',
  pickup: locations[0],
  dropoff: '',
  date: '',
  endDate: '',
  duration: 'full-day',
  flightNumber: '',
  passengers: '2',
});

export const EMPTY_CONTACT = Object.freeze({ name: '', phone: '', email: '', notes: '' });

/** Trip fields that may appear in the URL (never personal details). */
const TRIP_QUERY = { service: 'service', pickup: 'pickup', dropoff: 'dropoff', date: 'start', endDate: 'end', duration: 'duration', passengers: 'passengers' };

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Read and sanitise trip fields from a query string. */
export function tripFromQuery(search) {
  const params = new URLSearchParams(search);
  const trip = {};
  const service = params.get('service');
  if (SERVICE_KEYS.includes(service)) trip.service = service;
  const pickup = params.get('pickup');
  if (pickup && locations.includes(pickup)) trip.pickup = pickup;
  const dropoff = params.get('dropoff');
  if (dropoff && locations.includes(dropoff)) trip.dropoff = dropoff;
  const start = params.get('start');
  if (start && isDate(start)) trip.date = start;
  const end = params.get('end');
  if (end && isDate(end)) trip.endDate = end;
  const duration = params.get('duration');
  if (DURATIONS.includes(duration)) trip.duration = duration;
  const passengers = Number(params.get('passengers'));
  if (Number.isInteger(passengers) && passengers >= 1 && passengers <= 50) trip.passengers = String(passengers);
  return trip;
}

/** Only the valid trip parameters of a query string, without `?` (empty when none). */
export function tripSearch(search) {
  const trip = tripFromQuery(search);
  const params = new URLSearchParams();
  for (const [field, key] of Object.entries(TRIP_QUERY)) if (trip[field]) params.set(key, trip[field]);
  return params.toString();
}

/** Serialise trip fields (only the ones relevant to the service) into a query string. */
export function tripToQuery(trip, extra = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(extra)) if (value) params.set(key, value);
  params.set(TRIP_QUERY.service, trip.service);
  if (trip.pickup) params.set(TRIP_QUERY.pickup, trip.pickup);
  if (trip.dropoff) params.set(TRIP_QUERY.dropoff, trip.dropoff);
  if (trip.date) params.set(TRIP_QUERY.date, trip.date);
  if (trip.service === 'rental' && trip.endDate) params.set(TRIP_QUERY.endDate, trip.endDate);
  if (trip.service === 'chauffeur' && trip.duration) params.set(TRIP_QUERY.duration, trip.duration);
  if (trip.passengers) params.set(TRIP_QUERY.passengers, trip.passengers);
  return `?${params}`;
}

/**
 * The in-progress request is kept in sessionStorage (this tab only) so that
 * moving between pages, or switching views and coming back, does not lose it.
 */
export function readDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      trip: { ...EMPTY_TRIP, ...pick(parsed.trip, Object.keys(EMPTY_TRIP)) },
      contact: { ...EMPTY_CONTACT, ...pick(parsed.contact, Object.keys(EMPTY_CONTACT)) },
    };
  } catch {
    return null;
  }
}

export function writeDraft(trip, contact) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ trip, contact }));
  } catch {
    /* ignore */
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function pick(source, keys) {
  if (!source || typeof source !== 'object') return {};
  return Object.fromEntries(keys.filter((key) => typeof source[key] === 'string').map((key) => [key, source[key]]));
}
