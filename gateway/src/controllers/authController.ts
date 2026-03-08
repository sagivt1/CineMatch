import { Request, Response } from "express";
import { AuthError, registerUser, loginUser } from "../services/authService";

function isValidEmail(email: string) {
  return typeof email === "string" && email.includes("@") && email.length <= 255;
}

function isValidPassword(password: string) {
  return typeof password === "string" && password.length >= 8 && password.length <= 72;
}

export async function register(req: Request, res: Response) {
  const { email, password } = req.body ?? {};

  if (!isValidEmail(email) || !isValidPassword(password)) {
    return res.status(400).json({ error: "INVALID_INPUT" });
  }

  try {
    const user = await registerUser(email, password);
    return res.status(201).json({ user });
  } catch (err: any) {
    if (err instanceof AuthError && err.code === "EMAIL_ALREADY_EXISTS") {
      return res.status(400).json({ error: "EMAIL_ALREADY_EXISTS" });
    }
    console.error("AUTH 500 ERROR:", err);

    return res.status(500).json({
    error: "INTERNAL_SERVER_ERROR"});
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};

  if (!isValidEmail(email) || !isValidPassword(password)) {
    return res.status(400).json({ error: "INVALID_INPUT" });
  }

  try {
    const result = await loginUser(email, password);
    return res.status(200).json(result); // { token }
  } catch (err: any) {
    if (err instanceof AuthError && err.code === "INVALID_CREDENTIALS") {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }
    console.error("AUTH 500 ERROR:", err);

    return res.status(500).json({
    error: "INTERNAL_SERVER_ERROR"});
  }
}