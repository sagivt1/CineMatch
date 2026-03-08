import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../types/authRequest";

type JwtPayload = {
  sub: string;
  email?: string;
};

export function authenticateJwt(req: AuthenticatedRequest,res: Response,next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("Missing JWT_SECRET");
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as unknown as JwtPayload;

    if (!decoded.sub) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = {
      userId: decoded.sub,
    };

    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}