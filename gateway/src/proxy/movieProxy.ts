import { createProxyMiddleware } from "http-proxy-middleware";
import { AuthenticatedRequest } from "../types/authRequest";
import "dotenv/config";

const coreServiceUrl = process.env.CORE_SERVICE_URL || "http://core:8000";

export const movieProxy = createProxyMiddleware({
  target: coreServiceUrl,
  changeOrigin: true,
  pathRewrite: (path) => {
    if (path === "/" || path === "") {
      return "/movies/";
    }

    return `/movies${path}`;
  },
  on: {
    proxyReq: (proxyReq, req) => {
      const authReq = req as AuthenticatedRequest;

      proxyReq.removeHeader("x-user-id");
      proxyReq.removeHeader("user-id");

      if (authReq.user?.userId) {
        proxyReq.setHeader("X-User-Id", authReq.user.userId);
      }
    },
  },
});