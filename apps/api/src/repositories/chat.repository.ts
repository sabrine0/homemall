import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

const conversationBaseInclude = {
  listing: {
    include: {
      zone: {
        select: {
          id: true,
          name: true,
          city: true
        }
      }
    }
  },
  seller: {
    select: {
      id: true,
      email: true
    }
  },
  buyer: {
    select: {
      id: true,
      email: true
    }
  }
} as const;

const conversationListInclude = {
  ...conversationBaseInclude,
  messages: {
    orderBy: {
      createdAt: "desc"
    },
    take: 1,
    include: {
      sender: {
        select: {
          id: true,
          email: true
        }
      }
    }
  }
} as const;

export type ChatConversationWithLastMessage = Prisma.ChatConversationGetPayload<{
  include: typeof conversationListInclude;
}>;

export type ChatConversationWithRelations = Prisma.ChatConversationGetPayload<{
  include: typeof conversationBaseInclude;
}>;

export type ChatMessageWithSender = Prisma.ChatMessageGetPayload<{
  include: {
    sender: {
      select: {
        id: true;
        email: true;
      };
    };
  };
}>;

export class ChatRepository {
  async findById(id: string): Promise<ChatConversationWithRelations | null> {
    return prisma.chatConversation.findUnique({
      where: { id },
      include: conversationBaseInclude
    });
  }

  async findOrCreateByListingAndBuyer(params: {
    listingId: string;
    sellerId: string;
    buyerId: string;
  }): Promise<ChatConversationWithRelations> {
    return prisma.chatConversation.upsert({
      where: {
        listingId_buyerId: {
          listingId: params.listingId,
          buyerId: params.buyerId
        }
      },
      create: {
        listingId: params.listingId,
        sellerId: params.sellerId,
        buyerId: params.buyerId
      },
      update: {},
      include: conversationBaseInclude
    });
  }

  async listForUser(userId: string): Promise<ChatConversationWithLastMessage[]> {
    return prisma.chatConversation.findMany({
      where: {
        OR: [{ sellerId: userId }, { buyerId: userId }]
      },
      orderBy: [{ updatedAt: "desc" }],
      include: conversationListInclude
    });
  }

  async listMessages(conversationId: string): Promise<ChatMessageWithSender[]> {
    return prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: "asc" }],
      include: {
        sender: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
  }

  async createMessage(params: {
    conversationId: string;
    senderId: string;
    text: string;
  }): Promise<ChatMessageWithSender> {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          conversationId: params.conversationId,
          senderId: params.senderId,
          text: params.text
        },
        include: {
          sender: {
            select: {
              id: true,
              email: true
            }
          }
        }
      });

      await tx.chatConversation.update({
        where: { id: params.conversationId },
        data: { updatedAt: now }
      });

      return message;
    });
  }
}
