import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";

const SALT_ROUNDS = 10;

export class AuthError extends Error {
  constructor(public code: "EMAIL_ALREADY_EXISTS" | "INVALID_CREDENTIALS") {
    super(code);
  }
}

export async function registerUser(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true },
    });
    return user;
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw new AuthError("EMAIL_ALREADY_EXISTS");
    }
    throw err;
  }
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!user) {
    throw new AuthError("INVALID_CREDENTIALS");
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new AuthError("INVALID_CREDENTIALS");
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");

  const token = jwt.sign({ sub: user.id, email: user.email }, secret, {
    expiresIn: "1h",
  });

  return { token };
}