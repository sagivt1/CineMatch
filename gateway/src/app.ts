import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from "./routes/authRoutes";
import { movieRoutes } from './routes/movieRoutes';
import { healthRoutes } from "./routes/healthRoutes";

export const app = express();

app.use(express.json());

app.use('/CineMatch', healthRoutes);
app.use('/CineMatch/movies', movieRoutes);
app.use('/CineMatch/auth', authRoutes);
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