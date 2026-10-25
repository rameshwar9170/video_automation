const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const v = await prisma.video.deleteMany();
  console.log('Cleared videos:', v.count);
  const t = await prisma.topic.deleteMany();
  console.log('Cleared topics:', t.count);
  const r = await prisma.research.deleteMany();
  console.log('Cleared research:', r.count);
  await prisma.$disconnect();
}

main().catch(console.error);
