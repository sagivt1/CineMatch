import express from 'express';
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

app.use('/CineMatch', healthRoutes);
app.use('/CineMatch/auth', authRoutes);

// error for non found routes
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route is not found',
      details: null,
    },
  });
});

app.use(errorHandler);