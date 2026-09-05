/**
 * Bundled fleet seed — same SEO slugs as catalog B2 seed / sitemap / prerender.
 * Used for:
 * - Playwright SSG (`scripts/prerender.mjs`) so build does not need the gateway
 * - Runtime fallback when GET /v1/catalog/vehicles is unreachable
 * Prices are indicative TND / day.
 */
export const FLEET_SEED = [
  { slug: 'mercedes-v-class', name: 'Mercedes-Benz V-Class 250', cat: 'Van & Group', tier: 'Luxury', price: 300, seats: 7, bags: 6, transmission: 'Automatic', image: 'fleet-v-class.png', location: 'Tunis' },
  { slug: 'mercedes-e-class', name: 'Mercedes-Benz E-Class 180', cat: 'Luxury', tier: 'Luxury', price: 240, seats: 5, bags: 3, transmission: 'Automatic', image: 'fleet-e-class.png' },
  { slug: 'mercedes-a-class', name: 'Mercedes-Benz A-Class', cat: 'Luxury', tier: 'Premium', price: 150, seats: 5, bags: 2, transmission: 'Automatic', image: 'fleet-a-class.png' },
  { slug: 'toyota-prado', name: 'Toyota Land Cruiser Prado 2025', cat: 'SUV', tier: 'Premium', price: 390, seats: 7, bags: 4, transmission: 'Automatic', image: 'fleet-prado.png' },
  { slug: 'toyota-rav4', name: 'Toyota RAV4', cat: 'SUV', tier: 'Standard', price: 102, seats: 5, bags: 3, transmission: 'Automatic', image: 'fleet-rav4.png' },
  { slug: 'mercedes-e-350-e', name: 'Mercedes Class E 350 E', cat: 'Luxury', tier: 'Luxury', price: 255, seats: 5, bags: 2, transmission: 'Automatic', image: 'fleet-e-class.png' },
  { slug: 'volkswagen-t-cross', name: 'Volkswagen T-Cross', cat: 'SUV', tier: 'Standard', price: 72, seats: 5, bags: 3, transmission: 'Automatic', image: 'fleet-t-cross.png' },
  { slug: 'volkswagen-passat', name: 'Volkswagen Passat', cat: 'Sedan', tier: 'Standard', price: 75, seats: 5, bags: 3, transmission: 'Manual', image: 'fleet-passat.png' },
  { slug: 'toyota-corolla', name: 'Toyota Corolla', cat: 'Sedan', tier: 'Standard', price: 57, seats: 5, bags: 3, transmission: 'Automatic', image: 'fleet-corolla.png' },
  { slug: 'volkswagen-golf-8', name: 'Volkswagen Golf 8', cat: 'Compact', tier: 'Standard', price: 81, seats: 5, bags: 2, transmission: 'Automatic', image: 'fleet-golf.png' },
  { slug: 'hyundai-i20', name: 'Hyundai i20', cat: 'Compact', tier: 'Economy', price: 45, seats: 5, bags: 2, transmission: 'Manual', image: 'fleet-i20.png' },
  { slug: 'kia-picanto', name: 'Kia Picanto', cat: 'Economy', tier: 'Economy', price: 36, seats: 4, bags: 4, transmission: 'Automatic', image: 'fleet-i20.png' },
  { slug: 'suzuki-ciaz', name: 'Suzuki Ciaz', cat: 'Sedan', tier: 'Economy', price: 42, seats: 5, bags: 3, transmission: 'Automatic', image: 'fleet-ciaz.png' },
  { slug: 'toyota-hilux', name: 'Toyota Hilux', cat: 'Pick-up', tier: 'Premium', price: 135, seats: 5, bags: 4, transmission: 'Manual', image: 'fleet-hilux.png' },
  { slug: 'peugeot-traveller', name: 'Peugeot Traveller', cat: 'Van & Group', tier: 'Premium', price: 141, seats: 9, bags: 6, transmission: 'Manual', image: 'fleet-traveller.png' },
  { slug: 'seat-ibiza', name: 'Seat IBIZA', cat: 'Economy', tier: 'Economy', price: 45, seats: 5, bags: 4, transmission: 'Manual', image: 'fleet-i20.png' },
  { slug: 'byd-song-plus', name: 'BYD SONG PLUS', cat: 'SUV', tier: 'Premium', price: 90, seats: 5, bags: 2, transmission: 'Automatic', image: 'fleet-rav4.png' },
  { slug: 'toyota-prado-2023', name: 'Toyota Land Cruiser Prado 2023', cat: 'SUV', tier: 'Premium', price: 270, seats: 7, bags: 6, transmission: 'Automatic', image: 'fleet-prado.png' },
];

export const FLEET_CATEGORIES = ['All', 'Luxury', 'SUV', 'Sedan', 'Van & Group', 'Compact', 'Economy', 'Pick-up'];
