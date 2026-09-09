/**
 * Bundled fleet seed — same SEO slugs as catalog B2 seed / sitemap / prerender.
 * Used for:
 * - Playwright SSG (`scripts/prerender.mjs`) so build does not need the gateway
 * - Runtime fallback when GET /v1/catalog/vehicles is unreachable
 * Prices are indicative TND / day.
 */
export const FLEET_SEED = [
  { slug: 'mercedes-v-class', name: 'Mercedes-Benz V-Class 250', cat: 'Van & Group', tier: 'Luxury', price: 900, seats: 7, bags: 6, transmission: 'Automatic', image: 'fleet-v-class.png', location: 'Tunis' },
  { slug: 'mercedes-e-class', name: 'Mercedes-Benz E-Class 180', cat: 'Luxury', tier: 'Luxury', price: 700, seats: 5, bags: 3, transmission: 'Automatic', image: 'fleet-e-class.png' },
  { slug: 'mercedes-a-class', name: 'Mercedes-Benz A-Class', cat: 'Luxury', tier: 'Premium', price: 380, seats: 5, bags: 2, transmission: 'Automatic', image: 'fleet-a-class.png' },
  { slug: 'toyota-prado', name: 'Toyota Land Cruiser Prado 2025', cat: 'SUV', tier: 'Premium', price: 1100, seats: 7, bags: 4, transmission: 'Automatic', image: 'fleet-prado.png' },
  { slug: 'toyota-rav4', name: 'Toyota RAV4', cat: 'SUV', tier: 'Standard', price: 320, seats: 5, bags: 3, transmission: 'Automatic', image: 'fleet-rav4.png' },
  { slug: 'mercedes-e-350-e', name: 'Mercedes Class E 350 E', cat: 'Luxury', tier: 'Luxury', price: 950, seats: 5, bags: 2, transmission: 'Automatic', image: 'fleet-e-class.png' },
  { slug: 'volkswagen-t-cross', name: 'Volkswagen T-Cross', cat: 'SUV', tier: 'Standard', price: 150, seats: 5, bags: 3, transmission: 'Automatic', image: 'fleet-t-cross.png' },
  { slug: 'volkswagen-passat', name: 'Volkswagen Passat', cat: 'Sedan', tier: 'Standard', price: 250, seats: 5, bags: 3, transmission: 'Manual', image: 'fleet-passat.png' },
  { slug: 'toyota-corolla', name: 'Toyota Corolla', cat: 'Sedan', tier: 'Standard', price: 150, seats: 5, bags: 3, transmission: 'Automatic', image: 'fleet-corolla.png' },
  { slug: 'volkswagen-golf-8', name: 'Volkswagen Golf 8', cat: 'Compact', tier: 'Standard', price: 190, seats: 5, bags: 2, transmission: 'Automatic', image: 'fleet-golf.png' },
  { slug: 'hyundai-i20', name: 'Hyundai i20', cat: 'Compact', tier: 'Economy', price: 95, seats: 5, bags: 2, transmission: 'Manual', image: 'fleet-i20.png' },
  { slug: 'kia-picanto', name: 'Kia Picanto', cat: 'Economy', tier: 'Economy', price: 110, seats: 4, bags: 4, transmission: 'Automatic', image: 'fleet-i20.png' },
  { slug: 'suzuki-ciaz', name: 'Suzuki Ciaz', cat: 'Sedan', tier: 'Economy', price: 100, seats: 5, bags: 3, transmission: 'Automatic', image: 'fleet-ciaz.png' },
  { slug: 'toyota-hilux', name: 'Toyota Hilux', cat: 'Pick-up', tier: 'Premium', price: 450, seats: 5, bags: 4, transmission: 'Manual', image: 'fleet-hilux.png' },
  { slug: 'peugeot-traveller', name: 'Peugeot Traveller', cat: 'Van & Group', tier: 'Premium', price: 470, seats: 9, bags: 6, transmission: 'Manual', image: 'fleet-traveller.png' },
  { slug: 'seat-ibiza', name: 'Seat IBIZA', cat: 'Economy', tier: 'Economy', price: 95, seats: 5, bags: 4, transmission: 'Manual', image: 'fleet-i20.png' },
  { slug: 'byd-song-plus', name: 'BYD SONG PLUS', cat: 'SUV', tier: 'Premium', price: 280, seats: 5, bags: 2, transmission: 'Automatic', image: 'fleet-rav4.png' },
  { slug: 'toyota-prado-2023', name: 'Toyota Land Cruiser Prado 2023', cat: 'SUV', tier: 'Premium', price: 800, seats: 7, bags: 6, transmission: 'Automatic', image: 'fleet-prado.png' },
];

export const FLEET_CATEGORIES = ['All', 'Luxury', 'SUV', 'Sedan', 'Van & Group', 'Compact', 'Economy', 'Pick-up'];
