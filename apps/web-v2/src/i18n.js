import { copy, locationLabels } from './content/app1-content.js';

/** Locale helpers mirroring App 1 so both views translate identically. */
export const LANGUAGES = Object.freeze([
  { code: 'en', name: 'English', native: 'English', dir: 'ltr' },
  { code: 'fr', name: 'French', native: 'Français', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', native: 'العربية', dir: 'rtl' },
]);

export const LANGUAGE_CODES = LANGUAGES.map((item) => item.code);

export function languageIndex(lang) {
  return lang === 'en' ? 0 : lang === 'fr' ? 1 : 2;
}

export function text(lang, english, french, arabic) {
  return lang === 'ar' ? arabic : lang === 'fr' ? french : english;
}

export function languageOption(lang) {
  return LANGUAGES.find((item) => item.code === lang) ?? LANGUAGES[0];
}

export function t(lang) {
  return copy[lang] ?? copy.en;
}

export function locationLabel(name, lang) {
  return lang === 'ar' ? locationLabels[name] ?? name : name;
}

export function categoryLabel(category, lang) {
  if (lang !== 'ar') return category;
  return { All: 'الكل', Luxury: 'فاخرة', SUV: 'دفع رباعي', Sedan: 'سيدان', 'Van & Group': 'فان ومجموعات', Compact: 'مدمجة', Economy: 'اقتصادية', 'Pick-up': 'بيك أب' }[category] ?? category;
}

export function tierLabel(tier, lang) {
  if (lang !== 'ar') return tier;
  return { Luxury: 'فاخرة', Premium: 'مميزة', Standard: 'قياسية', Economy: 'اقتصادية' }[tier] ?? tier;
}

export function transmissionLabel(transmission, lang) {
  if (lang === 'ar') return transmission === 'Automatic' ? 'أوتوماتيكية' : 'يدوية';
  if (lang === 'fr') return transmission === 'Automatic' ? 'Automatique' : 'Manuelle';
  return transmission;
}

export function durationLabel(duration, lang) {
  if (duration === 'hourly') return text(lang, 'By the hour', 'À l’heure', 'بالساعة');
  if (duration === 'half-day') return text(lang, 'Half day', 'Demi-journée', 'نصف يوم');
  return text(lang, 'Full day', 'Journée complète', 'يوم كامل');
}
