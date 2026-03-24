import type { ChatConversation, ChatMessage, ContactSellerResponse } from "@homemall/shared";
import type { ListingPurpose, ListingType } from "@prisma/client";
import { ApiError } from "../middlewares/error.middleware.js";
import {
  ChatRepository,
  type ChatConversationWithLastMessage,
  type ChatConversationWithRelations,
  type ChatMessageWithSender
} from "../repositories/chat.repository.js";
import { ListingRepository } from "../repositories/listing.repository.js";

const fromPrismaPurpose = (value: ListingPurpose): "rent" | "buy" => (value === "BUY" ? "buy" : "rent");

const fromPrismaType = (value: ListingType): "apartment" | "house" | "studio" | "villa" | "land" => {
  if (value === "HOUSE") return "house";
  if (value === "STUDIO") return "studio";
  if (value === "VILLA") return "villa";
  if (value === "LAND") return "land";
  return "apartment";
};

const safeImageUrls = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter((item) => item.length > 0);
};

export class ChatService {
  private readonly chatRepository = new ChatRepository();
  private readonly listingRepository = new ListingRepository();

  private toMessage(message: ChatMessageWithSender): ChatMessage {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderEmail: message.sender.email,
      text: message.text,
      createdAt: message.createdAt.toISOString()
    };
  }

  private toConversation(
    conversation: ChatConversationWithRelations | ChatConversationWithLastMessage,
    currentUserId: string
  ): ChatConversation {
    const listingImages = safeImageUrls(conversation.listing.imageUrls);
    const counterpart = conversation.sellerId === currentUserId ? conversation.buyer : conversation.seller;
    const lastMessage =
      "messages" in conversation && conversation.messages.length > 0 ? this.toMessage(conversation.messages[0]) : undefined;

    return {
      id: conversation.id,
      listingId: conversation.listingId,
      sellerId: conversation.sellerId,
      buyerId: conversation.buyerId,
      participantIds: [conversation.sellerId, conversation.buyerId],
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      listing: {
        id: conversation.listing.id,
        zoneId: conversation.listing.zoneId,
        title: conversation.listing.title,
        purpose: fromPrismaPurpose(conversation.listing.purpose),
        type: fromPrismaType(conversation.listing.type),
        priceMonthly: conversation.listing.priceMonthly ?? undefined,
        priceSale: conversation.listing.priceSale ?? undefined,
        imageUrl: listingImages[0]
      },
      counterpart: {
        id: counterpart.id,
        email: counterpart.email
      },
      lastMessage
    };
  }

  private async requireParticipant(conversationId: string, userId: string): Promise<ChatConversationWithRelations> {
    const conversation = await this.chatRepository.findById(conversationId);
    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    if (conversation.sellerId !== userId && conversation.buyerId !== userId) {
      throw new ApiError(403, "You are not allowed to access this conversation");
    }

    return conversation;
  }

  async contactSeller(params: {
    buyerId: string;
    listingId: string;
    initialMessage?: string;
  }): Promise<ContactSellerResponse> {
    const listing = await this.listingRepository.findById(params.listingId);
    if (!listing) {
      throw new ApiError(404, "Listing not found");
    }

    if (listing.status !== "ACTIVE") {
      throw new ApiError(409, "This listing is not active");
    }
    if (listing.isExternal) {
      throw new ApiError(
        409,
        "External marketplace listings are read-only. Use listed contact channels."
      );
    }

    if (listing.sellerId === params.buyerId) {
      throw new ApiError(400, "You cannot start a chat with your own listing");
    }

    const conversation = await this.chatRepository.findOrCreateByListingAndBuyer({
      listingId: listing.id,
      sellerId: listing.sellerId,
      buyerId: params.buyerId
    });

    const initialMessage = params.initialMessage?.trim();
    if (initialMessage) {
      await this.chatRepository.createMessage({
        conversationId: conversation.id,
        senderId: params.buyerId,
        text: initialMessage
      });
    }

    const refreshed = await this.chatRepository.findById(conversation.id);
    if (!refreshed) {
      throw new ApiError(500, "Failed to load conversation after contact");
    }

    return {
      conversation: this.toConversation(refreshed, params.buyerId)
    };
  }

  async listConversations(userId: string): Promise<ChatConversation[]> {
    const conversations = await this.chatRepository.listForUser(userId);
    return conversations.map((item) => this.toConversation(item, userId));
  }

  async listMessages(userId: string, conversationId: string): Promise<{
    conversation: ChatConversation;
    messages: ChatMessage[];
  }> {
    const conversation = await this.requireParticipant(conversationId, userId);
    const messages = await this.chatRepository.listMessages(conversationId);

    return {
      conversation: this.toConversation(conversation, userId),
      messages: messages.map((item) => this.toMessage(item))
    };
  }

  async sendMessage(userId: string, conversationId: string, text: string): Promise<ChatMessage> {
    await this.requireParticipant(conversationId, userId);
    const message = await this.chatRepository.createMessage({
      conversationId,
      senderId: userId,
      text: text.trim()
    });
    return this.toMessage(message);
  }
}
