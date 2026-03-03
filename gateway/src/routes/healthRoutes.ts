import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'true',
    service: 'gateway',
  });
});

export default router;