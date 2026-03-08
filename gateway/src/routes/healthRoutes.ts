/* health check */
import { Router } from 'express';

export const healthRoutes = Router();

healthRoutes.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'working',
    service: 'gateway',
  });
});
