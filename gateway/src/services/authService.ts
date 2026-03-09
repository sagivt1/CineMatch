import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { prisma } from "../prisma";
import { env } from "../config/env";

const SALT_ROUNDS = 10;

export class AuthError extends Error {
  constructor(public code: "EMAIL_ALREADY_EXISTS" | "INVALID_CREDENTIALS") {
    super(code);
  }
}

type SafeUser = {
  id: string;
  email: string;
  displayName: string;
};

type AuthResponse = {
  accessToken: string;
  user: SafeUser;
};

function getJwtSignOptions(): SignOptions {
  return {
    expiresIn: env.JWT_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]>,
  };
}

function signAccessToken(user: SafeUser): string {
  return jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, getJwtSignOptions());
}

export async function registerUser(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResponse> {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = await (prisma.user as any).create({
      data: { email, passwordHash, displayName },
      select: { id: true, email: true, displayName: true },
    });
    return { accessToken: signAccessToken(user as SafeUser), user: user as SafeUser };
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw new AuthError("EMAIL_ALREADY_EXISTS");
    }
    throw err;
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const user = await (prisma.user as any).findUnique({
    where: { email },
    select: { id: true, email: true, displayName: true, passwordHash: true },
  });

  if (!user) {
    throw new AuthError("INVALID_CREDENTIALS");
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new AuthError("INVALID_CREDENTIALS");
  }

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email },
    env.JWT_SECRET,
    getJwtSignOptions(),
  );

  return {
    accessToken,
    user: { id: user.id, email: user.email, displayName: user.displayName },
  };
}
