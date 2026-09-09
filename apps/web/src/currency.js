export const CURRENCIES = [
  { code: 'TND', name: { en: 'Tunisian dinar', fr: 'Dinar tunisien', ar: 'الدينار التونسي' }, symbol: 'TND' },
  { code: 'USD', name: { en: 'US dollar', fr: 'Dollar américain', ar: 'الدولار الأمريكي' }, symbol: '$' },
  { code: 'EUR', name: { en: 'Euro', fr: 'Euro', ar: 'اليورو' }, symbol: '€' },
  { code: 'GBP', name: { en: 'British pound', fr: 'Livre sterling', ar: 'الجنيه الإسترليني' }, symbol: '£' },
];

// These are the display rates used by the official VIPCAR fleet page.
// TND remains the billing/source currency; foreign-currency prices are indicative.
export const DISPLAY_RATES_FROM_TND = { TND: 1, USD: 0.32, EUR: 0.30, GBP: 0.25 };
export const CURRENCY_STORAGE_KEY = 'vipcar.currency';

export function getInitialCurrency() {
  try {
    const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    return CURRENCIES.some((currency) => currency.code === stored) ? stored : 'TND';
  } catch {
    return 'TND';
  }
}

export function getCurrency(code) {
  return CURRENCIES.find((currency) => currency.code === code) ?? CURRENCIES[0];
}

export function formatCurrency(amountTnd, code = 'TND', lang = 'en') {
  const amount = Number(amountTnd);
  if (!Number.isFinite(amount)) return '—';
  const currency = getCurrency(code);
  const converted = Math.round(amount * (DISPLAY_RATES_FROM_TND[currency.code] ?? 1));
  const locale = lang === 'ar' ? 'ar-TN' : lang === 'fr' ? 'fr-TN' : 'en-US';
  const value = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(converted);
  return currency.code === 'TND' ? `${value} TND` : `${currency.symbol}${value}`;
}
