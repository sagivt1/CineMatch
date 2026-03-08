/* access for core port by proxy - secure */
import { createProxyMiddleware } from "http-proxy-middleware";
import { AuthenticatedRequest } from "../types/authRequest";

export const movieProxy = createProxyMiddleware({
  target: "http://core:8000",
  changeOrigin: true,
  pathRewrite: {
    "^/CineMatch/movies": "/api/movies",},
  on: {
    proxyReq: (proxyReq, req) => {
      const authReq = req as AuthenticatedRequest;

      proxyReq.removeHeader("x-user-id");

      if (authReq.user?.userId) {
        proxyReq.setHeader("X-User-Id", authReq.user.userId);
      }
    },
  },
});