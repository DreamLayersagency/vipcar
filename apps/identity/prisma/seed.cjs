/**
 * Local-only staff users for /admin (ops_agent | admin).
 * Idempotent: upserts by email. Do not use these passwords in production.
 */
const bcrypt = require('bcrypt');
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

const STAFF = [
  {
    email: 'admin@vipcar.local',
    password: 'VipcarAdmin1!',
    name: 'VIPCAR Admin',
    role: 'admin',
    locale: 'en',
  },
  {
    email: 'ops@vipcar.local',
    password: 'VipcarOps1!',
    name: 'VIPCAR Ops',
    role: 'ops_agent',
    locale: 'fr',
  },
];

async function main() {
  const seeded = [];
  for (const user of STAFF) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    const row = await prisma.user.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        passwordHash,
        name: user.name,
        role: user.role,
        locale: user.locale,
        isActive: true,
      },
      update: {
        passwordHash,
        name: user.name,
        role: user.role,
        locale: user.locale,
        isActive: true,
      },
    });
    seeded.push({ email: row.email, role: row.role });
  }
  console.log(JSON.stringify({ staff: seeded }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
