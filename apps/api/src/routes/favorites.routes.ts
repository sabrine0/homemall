import { Router } from "express";
import { addFavorite, listFavorites } from "../controllers/favorites.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { favoriteSchema } from "../utils/validation.js";

const router = Router();

router.get("/", requireAuth, listFavorites);
router.post("/", requireAuth, validateBody(favoriteSchema), addFavorite);

export default router;
