import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";
import {
  contactSeller,
  createListing,
  deleteMyListing,
  getListingById,
  listListings,
  listMyListings,
  reportListing,
  uploadListingMedia,
  updateMyListing
} from "../controllers/listings.controller.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { optionalAuth, requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody, validateQuery } from "../middlewares/validate.middleware.js";
import {
  contactSellerSchema,
  createListingSchema,
  listingsQuerySchema,
  reportListingSchema,
  updateListingSchema
} from "../utils/validation.js";

const router = Router();
const uploadsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../uploads/listings",
);

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname) || ".bin";
    const safeStem = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 40) || "media";
    callback(
      null,
      `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeStem}${extension.toLowerCase()}`,
    );
  },
});

const upload = multer({
  storage,
  limits: {
    files: 8,
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const allowed =
      file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/");

    if (!allowed) {
      callback(new ApiError(400, "Only image and video uploads are allowed"));
      return;
    }

    callback(null, true);
  },
});

const uploadListingMediaMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  upload.array("files", 8)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(new ApiError(400, "Each upload must be 15 MB or smaller"));
        return;
      }

      next(new ApiError(400, error.message));
      return;
    }

    next(error);
  });
};

router.get("/", optionalAuth, validateQuery(listingsQuerySchema), listListings);
router.get("/mine", requireAuth, listMyListings);
router.post("/upload", requireAuth, uploadListingMediaMiddleware, uploadListingMedia);
router.post("/", requireAuth, validateBody(createListingSchema), createListing);
router.get("/:id", optionalAuth, getListingById);
router.patch("/:id", requireAuth, validateBody(updateListingSchema), updateMyListing);
router.delete("/:id", requireAuth, deleteMyListing);
router.post("/:id/contact", requireAuth, validateBody(contactSellerSchema), contactSeller);
router.post("/:id/report", requireAuth, validateBody(reportListingSchema), reportListing);

export default router;
