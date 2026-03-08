/* web pages with check auth with jwt and access for core by proxy */
import { Router } from "express";
import { authenticateJwt } from "../middleware/authMiddleware";
import { movieProxy } from "../proxy/movieProxy";

export const movieRoutes = Router();

movieRoutes.use(authenticateJwt);
movieRoutes.use(movieProxy);