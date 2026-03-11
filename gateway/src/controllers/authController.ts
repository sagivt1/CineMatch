import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types/authRequest";
import {
  AuthError,
  changeUserPassword,
  deleteUserAccount,
  loginUser,
  registerUser,
  updateUserProfile,
} from "../services/authService";
import { normalizeAvatarKey } from "../utils/avatar";

function isValidEmail(email: string) {
  return typeof email === "string" && email.includes("@") && email.length <= 255;
}

function isValidPassword(password: string) {
  return typeof password === "string" && password.length >= 8 && password.length <= 72;
}

function isValidDisplayName(displayName: string) {
  return typeof displayName === "string" && displayName.trim().length >= 2 && displayName.trim().length <= 80;
}

function isValidAvatarInput(avatarUrl: unknown) {
  if (avatarUrl === null) {
    return true;
  }

  if (typeof avatarUrl !== "string") {
    return false;
  }

  const trimmed = avatarUrl.trim();
  if (!trimmed || trimmed.length > 500) {
    return false;
  }

  return normalizeAvatarKey(trimmed) !== null;
}

function getAuthenticatedUserId(req: AuthenticatedRequest, res: Response): string | null {
  if (!req.user?.userId) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Unauthorized" });
    return null;
  }

  return req.user.userId;
}

export async function register(req: Request, res: Response) {
  const { email, password, displayName } = req.body ?? {};

  if (!isValidEmail(email) || !isValidPassword(password) || !isValidDisplayName(displayName)) {
    return res.status(400).json({ error: "INVALID_INPUT", message: "Invalid email, password, or displayName" });
  }

  try {
    const result = await registerUser(email, password, displayName.trim());
    return res.status(201).json(result);
  } catch (err: any) {
    if (err instanceof AuthError && err.code === "EMAIL_ALREADY_EXISTS") {
      return res.status(400).json({ error: "EMAIL_ALREADY_EXISTS", message: "Email already exists" });
    }
    console.error("AUTH 500 ERROR:", err);

    return res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "Internal server error"});
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};

  if (!isValidEmail(email) || !isValidPassword(password)) {
    return res.status(400).json({ error: "INVALID_INPUT", message: "Invalid email or password" });
  }

  try {
    const result = await loginUser(email, password);
    return res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof AuthError && err.code === "INVALID_CREDENTIALS") {
      return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Invalid credentials" });
    }
    console.error("AUTH 500 ERROR:", err);

    return res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "Internal server error"});
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) {
    return;
  }

  const { displayName, avatarUrl } = req.body ?? {};
  const hasDisplayName = displayName !== undefined;
  const hasAvatarUrl = avatarUrl !== undefined;

  if (!hasDisplayName && !hasAvatarUrl) {
    return res.status(400).json({ error: "INVALID_INPUT", message: "No profile updates supplied" });
  }

  if (hasDisplayName && !isValidDisplayName(displayName)) {
    return res.status(400).json({ error: "INVALID_INPUT", message: "Invalid displayName" });
  }

  if (hasAvatarUrl && !isValidAvatarInput(avatarUrl)) {
    return res.status(400).json({ error: "INVALID_INPUT", message: "Invalid avatarUrl" });
  }

  try {
    const normalizedAvatarUrl =
      hasAvatarUrl && typeof avatarUrl === "string" ? normalizeAvatarKey(avatarUrl) : avatarUrl;

    const user = await updateUserProfile(userId, {
      displayName: hasDisplayName ? displayName.trim() : undefined,
      avatarUrl: hasAvatarUrl ? (typeof normalizedAvatarUrl === "string" ? normalizedAvatarUrl.trim() : normalizedAvatarUrl) : undefined,
    });
    return res.status(200).json({ user });
  } catch (err: any) {
    if (err instanceof AuthError && err.code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "USER_NOT_FOUND", message: "User not found" });
    }

    console.error("AUTH 500 ERROR:", err);

    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response) {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) {
    return;
  }

  const { oldPassword, newPassword } = req.body ?? {};

  if (!isValidPassword(oldPassword) || !isValidPassword(newPassword)) {
    return res.status(400).json({ error: "INVALID_INPUT", message: "Invalid password" });
  }

  try {
    await changeUserPassword(userId, oldPassword, newPassword);
    return res.status(204).send();
  } catch (err: any) {
    if (err instanceof AuthError && err.code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "USER_NOT_FOUND", message: "User not found" });
    }

    if (err instanceof AuthError && err.code === "INVALID_PASSWORD") {
      return res.status(401).json({ error: "INVALID_PASSWORD", message: "Current password is incorrect" });
    }

    console.error("AUTH 500 ERROR:", err);

    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  }
}

export async function deleteAccount(req: AuthenticatedRequest, res: Response) {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) {
    return;
  }

  const { password } = req.body ?? {};

  if (!isValidPassword(password)) {
    return res.status(400).json({ error: "INVALID_INPUT", message: "Invalid password" });
  }

  try {
    await deleteUserAccount(userId, password);
    return res.status(204).send();
  } catch (err: any) {
    if (err instanceof AuthError && err.code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "USER_NOT_FOUND", message: "User not found" });
    }

    if (err instanceof AuthError && err.code === "INVALID_PASSWORD") {
      return res.status(401).json({ error: "INVALID_PASSWORD", message: "Password is incorrect" });
    }

    console.error("AUTH 500 ERROR:", err);

    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  }
}
