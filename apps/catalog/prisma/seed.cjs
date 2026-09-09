/**
 * Catalog seed from apps/web hardcoded fleet + locations (F-07 / F-09).
 * Idempotent: upserts by slug.
 */
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

const CATEGORY = {
  Luxury: 'Luxury',
  SUV: 'SUV',
  Sedan: 'Sedan',
  'Van & Group': 'VanAndGroup',
  Compact: 'Compact',
  Economy: 'Economy',
  'Pick-up': 'PickUp',
};

/** Ops hubs: Tunis, Gabès, Djerba (Africa/Tunis). */
const hubs = [
  { slug: 'tunis', name: 'Tunis' },
  { slug: 'gabes', name: 'Gabès' },
  { slug: 'djerba', name: 'Djerba' },
];

/** SPA fleet — 18 models (apps/web/src/main.jsx). */
const fleet = [
  {
    slug: 'mercedes-v-class',
    name: 'Mercedes-Benz V-Class 250',
    cat: 'Van & Group',
    tier: 'Luxury',
    price: 900,
    seats: 7,
    bags: 6,
    transmission: 'Automatic',
    image: 'fleet-v-class.png',
    hubSlug: 'tunis',
  },
  {
    slug: 'mercedes-e-class',
    name: 'Mercedes-Benz E-Class 180',
    cat: 'Luxury',
    tier: 'Luxury',
    price: 700,
    seats: 5,
    bags: 3,
    transmission: 'Automatic',
    image: 'fleet-e-class.png',
  },
  {
    slug: 'mercedes-a-class',
    name: 'Mercedes-Benz A-Class',
    cat: 'Luxury',
    tier: 'Premium',
    price: 380,
    seats: 5,
    bags: 2,
    transmission: 'Automatic',
    image: 'fleet-a-class.png',
  },
  {
    slug: 'toyota-prado',
    name: 'Toyota Land Cruiser Prado 2025',
    cat: 'SUV',
    tier: 'Premium',
    price: 1100,
    seats: 7,
    bags: 4,
    transmission: 'Automatic',
    image: 'fleet-prado.png',
  },
  {
    slug: 'toyota-rav4',
    name: 'Toyota RAV4',
    cat: 'SUV',
    tier: 'Standard',
    price: 320,
    seats: 5,
    bags: 3,
    transmission: 'Automatic',
    image: 'fleet-rav4.png',
  },
  {
    slug: 'mercedes-e-350-e',
    name: 'Mercedes Class E 350 E',
    cat: 'Luxury',
    tier: 'Luxury',
    price: 950,
    seats: 5,
    bags: 2,
    transmission: 'Automatic',
    image: 'fleet-e-class.png',
  },
  {
    slug: 'volkswagen-t-cross',
    name: 'Volkswagen T-Cross',
    cat: 'SUV',
    tier: 'Standard',
    price: 150,
    seats: 5,
    bags: 3,
    transmission: 'Automatic',
    image: 'fleet-t-cross.png',
  },
  {
    slug: 'volkswagen-passat',
    name: 'Volkswagen Passat',
    cat: 'Sedan',
    tier: 'Standard',
    price: 250,
    seats: 5,
    bags: 3,
    transmission: 'Manual',
    image: 'fleet-passat.png',
  },
  {
    slug: 'toyota-corolla',
    name: 'Toyota Corolla',
    cat: 'Sedan',
    tier: 'Standard',
    price: 150,
    seats: 5,
    bags: 3,
    transmission: 'Automatic',
    image: 'fleet-corolla.png',
  },
  {
    slug: 'volkswagen-golf-8',
    name: 'Volkswagen Golf 8',
    cat: 'Compact',
    tier: 'Standard',
    price: 190,
    seats: 5,
    bags: 2,
    transmission: 'Automatic',
    image: 'fleet-golf.png',
  },
  {
    slug: 'hyundai-i20',
    name: 'Hyundai i20',
    cat: 'Compact',
    tier: 'Economy',
    price: 95,
    seats: 5,
    bags: 2,
    transmission: 'Manual',
    image: 'fleet-i20.png',
  },
  {
    slug: 'kia-picanto',
    name: 'Kia Picanto',
    cat: 'Economy',
    tier: 'Economy',
    price: 110,
    seats: 4,
    bags: 4,
    transmission: 'Automatic',
    image: 'fleet-i20.png',
  },
  {
    slug: 'suzuki-ciaz',
    name: 'Suzuki Ciaz',
    cat: 'Sedan',
    tier: 'Economy',
    price: 100,
    seats: 5,
    bags: 3,
    transmission: 'Automatic',
    image: 'fleet-ciaz.png',
  },
  {
    slug: 'toyota-hilux',
    name: 'Toyota Hilux',
    cat: 'Pick-up',
    tier: 'Premium',
    price: 450,
    seats: 5,
    bags: 4,
    transmission: 'Manual',
    image: 'fleet-hilux.png',
  },
  {
    slug: 'peugeot-traveller',
    name: 'Peugeot Traveller',
    cat: 'Van & Group',
    tier: 'Premium',
    price: 470,
    seats: 9,
    bags: 6,
    transmission: 'Manual',
    image: 'fleet-traveller.png',
  },
  {
    slug: 'seat-ibiza',
    name: 'Seat IBIZA',
    cat: 'Economy',
    tier: 'Economy',
    price: 95,
    seats: 5,
    bags: 4,
    transmission: 'Manual',
    image: 'fleet-i20.png',
  },
  {
    slug: 'byd-song-plus',
    name: 'BYD SONG PLUS',
    cat: 'SUV',
    tier: 'Premium',
    price: 280,
    seats: 5,
    bags: 2,
    transmission: 'Automatic',
    image: 'fleet-rav4.png',
  },
  {
    slug: 'toyota-prado-2023',
    name: 'Toyota Land Cruiser Prado 2023',
    cat: 'SUV',
    tier: 'Premium',
    price: 800,
    seats: 7,
    bags: 6,
    transmission: 'Automatic',
    image: 'fleet-prado.png',
  },
];

/**
 * Commercial landing cities + pickup points from SPA locations /
 * commercialLocations. Gabès: no transfer landing. Chauffeur: tunis/gabes/djerba.
 */
const locations = [
  {
    slug: 'tunis',
    nameEn: 'Tunis',
    nameFr: 'Tunis',
    type: 'city',
    airportName: 'Tunis-Carthage Airport',
    hubSlug: 'tunis',
    supportsRental: true,
    supportsTransfer: true,
    supportsChauffeur: true,
  },
  {
    slug: 'djerba',
    nameEn: 'Djerba',
    nameFr: 'Djerba',
    type: 'city',
    airportName: 'Djerba-Zarzis Airport',
    hubSlug: 'djerba',
    supportsRental: true,
    supportsTransfer: true,
    supportsChauffeur: true,
  },
  {
    slug: 'sousse',
    nameEn: 'Sousse',
    nameFr: 'Sousse',
    type: 'city',
    airportName: 'Enfidha-Hammamet Airport',
    hubSlug: null,
    supportsRental: true,
    supportsTransfer: true,
    supportsChauffeur: false,
  },
  {
    slug: 'hammamet',
    nameEn: 'Hammamet',
    nameFr: 'Hammamet',
    type: 'city',
    airportName: 'Enfidha-Hammamet Airport',
    hubSlug: null,
    supportsRental: true,
    supportsTransfer: true,
    supportsChauffeur: false,
  },
  {
    slug: 'gabes',
    nameEn: 'Gabès',
    nameFr: 'Gabès',
    type: 'city',
    airportName: null,
    hubSlug: 'gabes',
    supportsRental: true,
    supportsTransfer: false,
    supportsChauffeur: true,
  },
  {
    slug: 'tunis-carthage-airport',
    nameEn: 'Tunis-Carthage Airport',
    nameFr: 'Aéroport Tunis-Carthage',
    type: 'airport',
    airportName: 'Tunis-Carthage Airport',
    hubSlug: 'tunis',
    supportsRental: true,
    supportsTransfer: true,
    supportsChauffeur: false,
  },
  {
    slug: 'enfidha-hammamet-airport',
    nameEn: 'Enfidha-Hammamet Airport',
    nameFr: 'Aéroport Enfidha-Hammamet',
    type: 'airport',
    airportName: 'Enfidha-Hammamet Airport',
    hubSlug: null,
    supportsRental: true,
    supportsTransfer: true,
    supportsChauffeur: false,
  },
  {
    slug: 'djerba-zarzis-airport',
    nameEn: 'Djerba-Zarzis Airport',
    nameFr: 'Aéroport Djerba-Zarzis',
    type: 'airport',
    airportName: 'Djerba-Zarzis Airport',
    hubSlug: 'djerba',
    supportsRental: true,
    supportsTransfer: true,
    supportsChauffeur: false,
  },
  {
    slug: 'nabeul',
    nameEn: 'Nabeul',
    nameFr: 'Nabeul',
    type: 'city',
    airportName: null,
    hubSlug: null,
    supportsRental: true,
    supportsTransfer: true,
    supportsChauffeur: false,
  },
  {
    slug: 'bizerte',
    nameEn: 'Bizerte',
    nameFr: 'Bizerte',
    type: 'city',
    airportName: null,
    hubSlug: null,
    supportsRental: true,
    supportsTransfer: true,
    supportsChauffeur: false,
  },
];

async function main() {
  const hubIds = {};

  for (const hub of hubs) {
    const row = await prisma.hub.upsert({
      where: { slug: hub.slug },
      create: { slug: hub.slug, name: hub.name, timezone: 'Africa/Tunis' },
      update: { name: hub.name, timezone: 'Africa/Tunis' },
    });
    hubIds[hub.slug] = row.id;
  }

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { slug: loc.slug },
      create: {
        slug: loc.slug,
        nameEn: loc.nameEn,
        nameFr: loc.nameFr,
        type: loc.type,
        airportName: loc.airportName,
        hubId: loc.hubSlug ? hubIds[loc.hubSlug] : null,
        supportsRental: loc.supportsRental,
        supportsTransfer: loc.supportsTransfer,
        supportsChauffeur: loc.supportsChauffeur,
        isPublished: true,
      },
      update: {
        nameEn: loc.nameEn,
        nameFr: loc.nameFr,
        type: loc.type,
        airportName: loc.airportName,
        hubId: loc.hubSlug ? hubIds[loc.hubSlug] : null,
        supportsRental: loc.supportsRental,
        supportsTransfer: loc.supportsTransfer,
        supportsChauffeur: loc.supportsChauffeur,
        isPublished: true,
      },
    });
  }

  for (const car of fleet) {
    const category = CATEGORY[car.cat];
    if (!category) throw new Error(`Unknown category: ${car.cat}`);

    await prisma.vehicleModel.upsert({
      where: { slug: car.slug },
      create: {
        slug: car.slug,
        name: car.name,
        category,
        tier: car.tier,
        seats: car.seats,
        bags: car.bags,
        transmission: car.transmission,
        imageKey: car.image,
        baseDailyPriceTnd: car.price,
        defaultHubId: car.hubSlug ? hubIds[car.hubSlug] : null,
        isPublished: true,
      },
      update: {
        name: car.name,
        category,
        tier: car.tier,
        seats: car.seats,
        bags: car.bags,
        transmission: car.transmission,
        imageKey: car.image,
        baseDailyPriceTnd: car.price,
        defaultHubId: car.hubSlug ? hubIds[car.hubSlug] : null,
        isPublished: true,
      },
    });
  }

  const [hubCount, vehicleCount, locationCount, gabes, chauffeurLocs] = await Promise.all([
    prisma.hub.count(),
    prisma.vehicleModel.count({ where: { isPublished: true } }),
    prisma.location.count({ where: { isPublished: true } }),
    prisma.location.findUnique({ where: { slug: 'gabes' } }),
    prisma.location.findMany({
      where: { supportsChauffeur: true },
      select: { slug: true },
      orderBy: { slug: 'asc' },
    }),
  ]);

  console.log(
    JSON.stringify(
      {
        hubs: hubCount,
        vehicles: vehicleCount,
        locations: locationCount,
        gabesSupportsTransfer: gabes?.supportsTransfer ?? null,
        chauffeurLocationSlugs: chauffeurLocs.map((l) => l.slug),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
