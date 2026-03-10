/* web pages with check auth with jwt and access for core by proxy */
import { Router } from "express";
import { authenticateJwt } from "../middleware/authMiddleware";
import { movieProxy, uploadUrlProxy, confirmUploadProxy, } from "../proxy/movieProxy";

export const movieRoutes = Router();

movieRoutes.get("/:id/upload-url", authenticateJwt, uploadUrlProxy);
movieRoutes.post("/:id/confirm-upload", authenticateJwt, confirmUploadProxy);
movieRoutes.use(authenticateJwt);
movieRoutes.use(movieProxy);