export type Goal = "rent" | "buy" | "sell" | "invest" | "build" | "manage_rental";
export type UserRole = "USER" | "SUPER_ADMIN" | "MANAGER";
export type AdminPermission =
  | "MANAGE_USERS"
  | "MANAGE_LISTINGS"
  | "MODERATE_REPORTS"
  | "MANAGE_IMPORTS"
  | "MANAGE_SETTINGS"
  | "MANAGE_ADMINS";

export interface Sensitivities {
  noise: number;
  heat: number;
  allergies: number;
}

export interface UserProfileInput {
  goal: Goal;
  budgetMin: number;
  budgetMax: number;
  workLat: number;
  workLng: number;
  mobilityModes: string[];
  sensitivities: Sensitivities;
}

export interface Zone {
  id: string;
  name: string;
  city: string;
  centerLat: number;
  centerLng: number;
  metaJson: Record<string, unknown>;
}

export interface ZoneMetrics {
  noiseIndex: number;
  greenIndex: number;
  airQualityIndex: number;
  pollenIndex: number;
  floodRiskIndex: number;
  heatIndex: number;
  transitIndex: number;
  walkIndex: number;
  futureValueIndex: number;
  zoningRiskIndex: number;
}

export type ScoreDimension =
  | "qualityOfLife"
  | "mobility"
  | "health"
  | "climateRisk"
  | "services"
  | "futureValue";

export interface ScoreBreakdown {
  qualityOfLife: number;
  mobility: number;
  health: number;
  climateRisk: number;
  services: number;
  futureValue: number;
}

export interface ScoreWeights {
  qualityOfLife: number;
  mobility: number;
  health: number;
  climateRisk: number;
  services: number;
  futureValue: number;
}

export interface ScoreAssumption {
  field: string;
  assumedValue: string | number | boolean;
  reason: string;
}

export interface ScoreProfile {
  goal: Goal;
  weights: ScoreWeights;
  budgetMin: number;
  budgetMax: number;
  workLat: number;
  workLng: number;
  mobilityModes: string[];
  sensitivities: Sensitivities;
  preferredCity?: string;
  commuteMaxMinutes?: number;
  assumptions: ScoreAssumption[];
}

export type ScoreReasonType = "positive" | "risk" | "assumption" | "penalty";

export interface ScoreReason {
  type: ScoreReasonType;
  metric: keyof ZoneMetrics | "composite";
  message: string;
  impact: number;
}

export interface ScoreResult {
  total: number;
  normalizedTotal: number;
  breakdown: ScoreBreakdown;
  penalties: string[];
  reasons: ScoreReason[];
  topPositives: string[];
  topRisks: string[];
  assumptions: string[];
  explanations: string[];
}

export type ZoneScoreResult = ScoreResult;

export interface TCLComponents {
  housing: number;
  commute: number;
  utilities: number;
  energy: number;
  health: number;
  risk: number;
  riskPenalty: number;
  services: number;
}

export interface TCLBreakdown {
  monthlyTotal: number;
  components: TCLComponents;
  explanations: string[];
  assumptions: string[];
}

export type TCLResult = TCLBreakdown;

export interface FutureOutlook {
  years5: number;
  years10: number;
  explanation: string;
}

export interface AnalyzeZoneItem {
  zoneId: string;
  zoneName: string;
  city: string;
  score: ZoneScoreResult;
  metrics: ZoneMetrics;
}

export interface CompareResponse {
  winner: "A" | "B";
  reason: string;
  optionA: {
    label: string;
    score: ZoneScoreResult;
    tcl: TCLResult;
    future: FutureOutlook;
  };
  optionB: {
    label: string;
    score: ZoneScoreResult;
    tcl: TCLResult;
    future: FutureOutlook;
  };
}

export interface ZoneSummary {
  id: string;
  name: string;
  city: string;
  centerLat: number;
  centerLng: number;
  imageUrl?: string;
  imageUrls?: string[];
  listingInventory?: ZoneListingInventory;
  overallScore: number;
  flags: {
    quiet: boolean;
    transitFriendly: boolean;
    allergyFriendly: boolean;
    floodRiskHigh: boolean;
  };
}

export interface ZoneDetails extends ZoneSummary {
  metrics: ZoneMetrics;
  score: ZoneScoreResult;
  futureOutlook: FutureOutlook;
  listing?: PropertyListing;
}

export interface ListingTypeCounts {
  apartment: number;
  house: number;
  studio: number;
  villa: number;
  land: number;
  total: number;
}

export interface ZoneListingInventory {
  rent: ListingTypeCounts;
  buy: ListingTypeCounts;
  total: number;
  source?: string;
}

export interface PropertyListing {
  id: string;
  zoneId: string;
  title: string;
  type: ListingPropertyType;
  purpose: ListingPurpose;
  sourcePlatform?: ListingSourcePlatform;
  sourceListingId?: string;
  sourceUrl?: string;
  priceMonthly?: number;
  priceSale?: number;
  areaM2?: number;
  bedrooms?: number;
  bathrooms?: number;
  imageUrl?: string;
  imageUrls?: string[];
}

export type ListingPurpose = "rent" | "buy";
export type ListingPropertyType = "apartment" | "house" | "studio" | "villa" | "land";
export type ListingStatus = "active" | "paused" | "closed";
export type ListingSourcePlatform = "manual" | "avito" | "mubawab" | "other";

export interface ListingSellerSummary {
  id: string;
  email: string;
  displayName?: string;
  companyName?: string;
  avatarUrl?: string;
}

export interface ListingOffer extends PropertyListing {
  sellerId: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsApp?: string;
  contactInstagram?: string;
  contactFacebook?: string;
  contactWebsite?: string;
  status: ListingStatus;
  seller?: ListingSellerSummary;
  zoneName?: string;
  zoneCity?: string;
  zoneCenterLat?: number;
  zoneCenterLng?: number;
  createdAt: string;
  updatedAt: string;
}

export type SellerVerificationLevel = "new" | "verified" | "trusted";

export interface SellerProfileStats {
  activeListings: number;
  rentListings: number;
  saleListings: number;
  serviceAreas: string[];
  propertyTypeCounts: ListingTypeCounts;
}

export interface SellerProfile {
  id: string;
  displayName: string;
  email: string;
  companyName: string;
  avatarUrl?: string;
  avatarInitials: string;
  verificationLevel: SellerVerificationLevel;
  about: string;
  languages: string[];
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsApp?: string;
  contactInstagram?: string;
  contactFacebook?: string;
  contactWebsite?: string;
  featuredListingId?: string;
  coverImageUrl?: string;
  memberSince: string;
  stats: SellerProfileStats;
  listings: ListingOffer[];
}

export interface SellerProfileResponse {
  seller: SellerProfile;
}

export interface CreateListingInput {
  zoneId: string;
  title: string;
  description?: string;
  type: ListingPropertyType;
  purpose: ListingPurpose;
  priceMonthly?: number;
  priceSale?: number;
  areaM2?: number;
  bedrooms?: number;
  bathrooms?: number;
  imageUrls: string[];
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsApp?: string;
  contactInstagram?: string;
  contactFacebook?: string;
  contactWebsite?: string;
}

export interface UpdateListingInput {
  title?: string;
  description?: string;
  type?: ListingPropertyType;
  purpose?: ListingPurpose;
  priceMonthly?: number;
  priceSale?: number;
  areaM2?: number;
  bedrooms?: number;
  bathrooms?: number;
  imageUrls?: string[];
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsApp?: string;
  contactInstagram?: string;
  contactFacebook?: string;
  contactWebsite?: string;
  status?: ListingStatus;
}

export interface ListListingsQuery {
  zoneId?: string;
  purpose?: ListingPurpose;
  mine?: boolean;
  limit?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderEmail?: string;
  text: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  listingId: string;
  sellerId: string;
  buyerId: string;
  participantIds: [string, string];
  createdAt: string;
  updatedAt: string;
  listing: Pick<ListingOffer, "id" | "zoneId" | "title" | "purpose" | "type" | "priceMonthly" | "priceSale" | "imageUrl">;
  counterpart: ListingSellerSummary;
  lastMessage?: ChatMessage;
}

export interface ContactSellerInput {
  initialMessage?: string;
}

export interface ContactSellerResponse {
  conversation: ChatConversation;
}

export interface ReportListingInput {
  reason: string;
}

export interface ListingOfferReport {
  id: string;
  listingId: string;
  reporterId: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendChatMessageInput {
  text: string;
}

export interface ListingsResponse {
  listings: ListingOffer[];
}

export interface ListingResponse {
  listing: ListingOffer;
}

export interface UploadedListingMediaFile {
  url: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
}

export interface UploadListingMediaResponse {
  files: UploadedListingMediaFile[];
}

export interface ConversationsResponse {
  conversations: ChatConversation[];
}

export interface ConversationMessagesResponse {
  conversation: ChatConversation;
  messages: ChatMessage[];
}

export interface ReportModel {
  id?: string;
  generatedAt: string;
  createdAt?: string;
  updatedAt?: string;
  profile: UserProfileInput;
  recommendations: AnalyzeZoneItem[];
  summary: string;
}

export type ReportResponse = ReportModel;

export interface CopilotChatRequest {
  message: string;
  context?: Partial<UserProfileInput>;
}

export interface CopilotRecommendation {
  zoneId: string;
  name: string;
  score: number;
  badges: string[];
  why: string[];
}

export interface CopilotChatResponse {
  assistantText: string;
  recommendations: CopilotRecommendation[];
  followUpQuestions: string[];
  tclSuggestion?: {
    optionAZoneId: string;
    optionBZoneId: string;
  };
}

export interface AISearchConstraints {
  city?: string;
  budgetMin?: number;
  budgetMax?: number;
  goal?: Goal;
  rentOrBuy?: "rent" | "buy";
  quiet?: boolean;
  safe?: boolean;
  lowAllergy?: boolean;
  maxCommuteMinutes?: number;
  priorities?: string[];
  limit?: number;
}

export interface AISearchRequest {
  query: string;
  constraints?: AISearchConstraints;
}

export interface AISearchZoneResult {
  zoneId: string;
  zoneName: string;
  city: string;
  score: ScoreResult;
  tcl: TCLBreakdown;
  future: FutureOutlook;
  listing?: PropertyListing;
  reasons: string[];
  simpleScoreLabel: "Excellent" | "Good" | "Fair" | "Risky";
  monthlyCostLabel: string;
  easySummary: string;
}

export interface AISearchResponse {
  query: string;
  parsedConstraints: AISearchConstraints;
  assumptions: string[];
  results: AISearchZoneResult[];
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  adminPermissions: AdminPermission[];
  createdAt: string;
  displayName?: string;
  avatarUrl?: string;
  contactPhone?: string;
  contactWhatsApp?: string;
  contactInstagram?: string;
  contactFacebook?: string;
  contactWebsite?: string;
}

export interface AuthMeResponse {
  user: AuthUser;
}
