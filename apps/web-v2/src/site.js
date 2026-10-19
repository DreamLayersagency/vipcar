/**
 * VIPCAR business contact details and asset locations, identical to App 1
 * (`apps/web/src/main.jsx`). Vehicle and photo keys resolve to the same images.
 */
export const ORIGIN = 'https://vipcar.com.tn';
export const PHONE = '+216 55 771 077';
export const PHONE_HREF = 'tel:+21655771077';
export const WA = 'https://wa.me/21655771077';
export const EMAIL = 'info@vipcar.com.tn';
export const ADDRESS = ["Rue de la Feuille d'Érable", 'Lac 2, Tunis'];
export const HUBS = 'Tunis · Gabès · Djerba';
const ASSET = `${ORIGIN}/images`;

/** Base-aware path to a file in this app's `public/` folder. */
export function publicAsset(name) {
  return `${import.meta.env.BASE_URL}${name.replace(/^\//, '')}`;
}

export const LOGO_LIGHT = publicAsset('images/vipcar-logo-light.svg');
export const LOGO_DARK = publicAsset('images/vipcar-logo.svg');

/** Resolve an image key the same way App 1 does. */
export function img(name) {
  const value = String(name || '');
  if (/^(data:|https?:\/\/|\/)/i.test(value)) return value;
  return `${ASSET}/${value}`;
}
