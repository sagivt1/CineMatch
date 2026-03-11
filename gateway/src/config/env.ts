// src/config/env.ts

import dotenv from "dotenv";

type NodeEnv = "development" | "test" | "production";

const NODE_ENV = (process.env.NODE_ENV ?? "development") as NodeEnv;

// טעינת env לפי הסביבה
if (NODE_ENV === "test") {
  dotenv.config({
    path: ".env.test",
    override: true,
    quiet: true
  });
} else {
  dotenv.config(); // טוען .env
}

// פונקציה לבדוק משתני חובה
function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

// פונקציה לפרס PORT
function parsePort(value: string | undefined): number {
  const port = Number(value ?? 3000);

  if (Number.isNaN(port)) {
    throw new Error("PORT must be a valid number");
  }

  return port;
}

// export של כל משתני הסביבה
export const env = {
  NODE_ENV,

  PORT: parsePort(process.env.PORT),

  JWT_SECRET: requireEnv("JWT_SECRET"),

  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "1h",

  AVATAR_PUBLIC_BASE_URL:
    (process.env.AVATAR_PUBLIC_BASE_URL ?? "http://localhost:9000/cinematch-avatars").replace(/\/+$/, "")
};
