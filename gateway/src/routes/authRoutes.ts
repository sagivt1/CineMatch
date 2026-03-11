/* auth routing before access */
import { Router } from "express";
import { changePassword, deleteAccount, login, register, updateProfile } from "../controllers/authController";
import { authenticateJwt } from "../middleware/authMiddleware";
import { avatarUploadUrlProxy } from "../proxy/movieProxy";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.patch("/me", authenticateJwt, updateProfile);
authRoutes.get("/avatar-upload-url", authenticateJwt, avatarUploadUrlProxy);
authRoutes.post("/change-password", authenticateJwt, changePassword);
authRoutes.delete("/me", authenticateJwt, deleteAccount);
