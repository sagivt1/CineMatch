import { prisma } from "../prisma";

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`; 
});

afterAll(async () => {
  await prisma.$disconnect();
});