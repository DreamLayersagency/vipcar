/**
 * Fleet units seed — one available unit per published catalog vehicle model.
 * Reads catalog.vehicle_models / catalog.hubs via raw SQL (same Postgres cluster).
 * Idempotent: skips plates that already exist for the hub.
 */
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

async function main() {
  const hubs = await prisma.$queryRawUnsafe(
    `SELECT id, slug FROM catalog.hubs ORDER BY slug ASC`,
  );
  if (!hubs.length) {
    throw new Error('No catalog hubs found. Run catalog seed first: node apps/catalog/prisma/seed.cjs');
  }

  const defaultHubId = hubs.find((h) => h.slug === 'tunis')?.id || hubs[0].id;

  const models = await prisma.$queryRawUnsafe(
    `SELECT id, slug, "defaultHubId", "baseDailyPriceTnd"
     FROM catalog.vehicle_models
     WHERE "isPublished" = true
     ORDER BY slug ASC`,
  );
  if (!models.length) {
    throw new Error('No published catalog vehicles. Run catalog seed first.');
  }

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];
    const hubId = model.defaultHubId || defaultHubId;
    const plate = `VC-${String(i + 1).padStart(3, '0')}`;
    const deposit = Number(model.baseDailyPriceTnd) || 0;

    const existing = await prisma.vehicleUnit.findFirst({
      where: { hubId, plate },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.vehicleUnit.create({
      data: {
        modelId: model.id,
        plate,
        hubId,
        status: 'available',
        depositAmountTnd: deposit,
      },
    });
    created += 1;
  }

  const total = await prisma.vehicleUnit.count();
  console.log(
    JSON.stringify(
      {
        catalogModels: models.length,
        unitsCreated: created,
        unitsSkipped: skipped,
        unitsTotal: total,
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
