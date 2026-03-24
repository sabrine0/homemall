import { Router } from "express";
import authRoutes from "./auth.routes.js";
import profileRoutes from "./profile.routes.js";
import zonesRoutes from "./zones.routes.js";
import analyzeRoutes from "./analyze.routes.js";
import reportRoutes from "./report.routes.js";
import favoritesRoutes from "./favorites.routes.js";
import adminRoutes from "./admin.routes.js";
import copilotRoutes from "./copilot.routes.js";
import listingsRoutes from "./listings.routes.js";
import chatsRoutes from "./chats.routes.js";
import sellersRoutes from "./sellers.routes.js";
import aiSearchRoutes from "../presentation/http/routes/ai-search.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/zones", zonesRoutes);
router.use("/analyze", analyzeRoutes);
router.use("/report", reportRoutes);
router.use("/favorites", favoritesRoutes);
router.use("/listings", listingsRoutes);
router.use("/sellers", sellersRoutes);
router.use("/chats", chatsRoutes);
router.use("/admin", adminRoutes);
router.use("/copilot", copilotRoutes);
router.use("/search", aiSearchRoutes);

export default router;
