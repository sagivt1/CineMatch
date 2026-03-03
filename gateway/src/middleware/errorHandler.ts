import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';


// Error class handler

interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode ?? 500;
  const errorCode = err.code ?? 'INTERNAL_ERROR';

  if (env.NODE_ENV !== 'production') {
    console.error('🔥 Error:', err);
  }

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: err.message || 'Something went wrong',
      details: err.details ?? null,
    },
  });
}