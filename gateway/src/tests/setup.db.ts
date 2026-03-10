import { prisma } from "../prisma";

const shouldUseDb = process.env.SKIP_DB_TEST_SETUP !== "true";

beforeAll(async () => {
  if (!shouldUseDb) {
    return;
  }

  await prisma.$queryRaw`SELECT 1`; 
});

afterAll(async () => {
  if (!shouldUseDb) {
    return;
  }

  await prisma.$disconnect();
});
