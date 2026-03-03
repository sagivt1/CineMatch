import dotenv from 'dotenv';

dotenv.config();

type NodeEnv = 'development' | 'test' | 'production';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? 3000);
  if (Number.isNaN(port)) {
    throw new Error('PORT must be a valid number');
  }
  return port;
}

const NODE_ENV = (process.env.NODE_ENV ?? 'development') as NodeEnv;

if (!['development', 'test', 'production'].includes(NODE_ENV)) {
  throw new Error(`Invalid NODE_ENV value: ${NODE_ENV}`);
}

export const env = {
  PORT: parsePort(process.env.PORT),
  NODE_ENV,
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '1h',
};