import { env } from "../config/env";

const AVATAR_BASE_URL = (env.AVATAR_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

export function normalizeAvatarKey(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    if (!AVATAR_BASE_URL) {
      return null;
    }

    let inputUrl: URL;
    let baseUrl: URL;
    try {
      inputUrl = new URL(trimmed);
      baseUrl = new URL(AVATAR_BASE_URL);
    } catch {
      return null;
    }

    if (inputUrl.origin !== baseUrl.origin) {
      return null;
    }

    const basePath = baseUrl.pathname.replace(/\/+$/, "");
    if (!inputUrl.pathname.startsWith(`${basePath}/`)) {
      return null;
    }

    const key = inputUrl.pathname.slice(basePath.length + 1).replace(/^\/+/, "");
    return key || null;
  }

  const cleaned = trimmed.split("?")[0]?.split("#")[0] ?? "";
  if (!cleaned || !/^[a-zA-Z0-9._/-]+$/.test(cleaned)) {
    return null;
  }

  return cleaned.replace(/^\/+/, "");
}

export function buildAvatarUrl(key: string | null, updatedAt?: Date | string | null): string | null {
  if (!key) {
    return null;
  }

  if (/^https?:\/\//i.test(key)) {
    return key;
  }

  const cleaned = key.replace(/^\/+/, "");
  const baseUrl = `${AVATAR_BASE_URL}/${cleaned}`;

  if (!updatedAt) {
    return baseUrl;
  }

  const ts = new Date(updatedAt).getTime();
  if (!Number.isFinite(ts)) {
    return baseUrl;
  }

  return `${baseUrl}?v=${ts}`;
}
