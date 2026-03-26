import type {
  ContactSellerInputDto,
  CreateListingInputDto,
  ListingsQueryDto,
  ReportListingInputDto,
  UpdateListingInputDto
} from "@homemall/shared";
import type { Request, Response } from "express";
import { ApiError } from "../middlewares/error.middleware.js";
import { ChatService } from "../services/chat.service.js";
import { ListingService } from "../services/listing.service.js";
import { normalizeMediaUrl } from "../utils/media-url.js";

const listingService = new ListingService();
const chatService = new ChatService();

export const createListing = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as CreateListingInputDto;
  const listing = await listingService.create(req.user!.id, payload);
  res.status(201).json({ listing });
};

export const uploadListingMedia = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    throw new ApiError(400, "At least one media file is required");
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.status(201).json({
    files: files.map((file) => ({
      url:
        normalizeMediaUrl(`${baseUrl}/uploads/listings/${file.filename}`) ??
        `/uploads/listings/${file.filename}`,
      mimeType: file.mimetype,
      originalName: file.originalname,
      sizeBytes: file.size,
    })),
  });
};

export const listListings = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as ListingsQueryDto;
  if (query.mine) {
    if (!req.user?.id) {
      throw new ApiError(401, "Authentication required");
    }
    const listings = await listingService.listMine(req.user.id, query.limit ?? 100);
    res.json({ listings });
    return;
  }

  const listings = await listingService.listPublic(query);
  res.json({ listings });
};

export const listMyListings = async (req: Request, res: Response): Promise<void> => {
  const listings = await listingService.listMine(req.user!.id, 100);
  res.json({ listings });
};

export const getListingById = async (req: Request, res: Response): Promise<void> => {
  const listing = await listingService.getById(req.params.id);
  res.json({ listing });
};

export const updateMyListing = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as UpdateListingInputDto;
  const listing = await listingService.updateMine(req.user!.id, req.params.id, payload);
  res.json({ listing });
};

export const deleteMyListing = async (req: Request, res: Response): Promise<void> => {
  await listingService.deleteMine(req.user!.id, req.params.id);
  res.status(204).send();
};

export const contactSeller = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as ContactSellerInputDto;
  const result = await chatService.contactSeller({
    buyerId: req.user!.id,
    listingId: req.params.id,
    initialMessage: payload.initialMessage
  });
  res.json(result);
};

export const reportListing = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as ReportListingInputDto;
  const report = await listingService.reportListing(req.user!.id, req.params.id, payload);
  res.status(201).json({ report });
};
