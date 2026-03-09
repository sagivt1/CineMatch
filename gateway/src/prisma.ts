import "dotenv/config";
import { env } from "prisma/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `postgresql://${env("POSTGRES_USER")}:${env("POSTGRES_PASSWORD")}@${env("POSTGRES_HOST")}:${env("POSTGRES_PORT")}/${env("POSTGRES_DB")}?schema=public`;
if (!connectionString) {
  throw new Error("Missing DATABASE_URL");
}

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });