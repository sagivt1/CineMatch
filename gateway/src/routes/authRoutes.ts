import { Router } from 'express';

const router = Router();

router.post('/register', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Register endpoint not implemented yet',
      details: null,
    },
  });
});

router.post('/login', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Login endpoint not implemented yet',
      details: null,
    },
  });
});

export default router;