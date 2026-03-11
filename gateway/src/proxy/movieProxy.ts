import { createProxyMiddleware } from "http-proxy-middleware";
import type { Request } from "express";
import { AuthenticatedRequest } from "../types/authRequest";
import "dotenv/config";

const coreServiceUrl = process.env.CORE_SERVICE_URL || "http://core:8000";

function injectUserHeader(proxyReq: any, req: any) {
  const authReq = req as AuthenticatedRequest;

  proxyReq.removeHeader("x-user-id");
  proxyReq.removeHeader("user-id");

  if (authReq.user?.userId) {
    proxyReq.setHeader("X-User-Id", authReq.user.userId);
  }

  if (req.body && Object.keys(req.body).length > 0) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader("Content-Type", "application/json");
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
}

function rewriteWithQuery(targetPath: string, req: Request) {
  const queryIndex = req.url.indexOf("?");
  const query = queryIndex >= 0 ? req.url.slice(queryIndex) : "";
  return `${targetPath}${query}`;
}

export const movieProxy = createProxyMiddleware({
  target: coreServiceUrl,
  changeOrigin: true,
  pathRewrite: (path) => {
    if (path === "/" || path === "") {
      return "/api/movies/";
    }

    return `/api/movies${path}`;
  },
  on: {
    proxyReq: injectUserHeader,
  },
});

export const uploadUrlProxy = createProxyMiddleware({
  target: coreServiceUrl,
  changeOrigin: true,
  pathRewrite: (_path, req) => rewriteWithQuery("/api/upload-url", req as Request),
  on: {
    proxyReq: injectUserHeader,
  },
});

export const confirmUploadProxy = createProxyMiddleware({
  target: coreServiceUrl,
  changeOrigin: true,
  pathRewrite: (_path, req) =>
    rewriteWithQuery("/api/upload-confirm", req as Request),
  on: {
    proxyReq: injectUserHeader,
  },
});

export const avatarUploadUrlProxy = createProxyMiddleware({
  target: coreServiceUrl,
  changeOrigin: true,
  pathRewrite: (_path, req) =>
    rewriteWithQuery("/api/avatar-upload-url", req as Request),
  on: {
    proxyReq: injectUserHeader,
  },
});
