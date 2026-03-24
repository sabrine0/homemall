"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChatConversation, ChatMessage } from "@homemall/shared";
import { useI18n } from "@/components/i18n/i18n-provider";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { clientApi } from "@/lib/client-api";
import { formatCurrency } from "@/lib/format";

interface MessagesWorkspaceProps {
  initialConversationId?: string;
}

interface ConversationsResponse {
  conversations: ChatConversation[];
}

interface ConversationMessagesResponse {
  conversation: ChatConversation;
  messages: ChatMessage[];
}

export function MessagesWorkspace({
  initialConversationId,
}: MessagesWorkspaceProps) {
  const { t } = useI18n();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(initialConversationId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reportingListingId, setReportingListingId] = useState<string | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedConversation = useMemo(
    () =>
      conversations.find((item) => item.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const loadConversations = async () => {
    setLoading(true);
    try {
      const response = await clientApi<ConversationsResponse>("/api/chats");
      setConversations(response.conversations);
      const fallback = response.conversations[0]?.id ?? null;
      if (
        !selectedConversationId ||
        !response.conversations.some(
          (item) => item.id === selectedConversationId,
        )
      ) {
        setSelectedConversationId(
          initialConversationId &&
            response.conversations.some(
              (item) => item.id === initialConversationId,
            )
            ? initialConversationId
            : fallback,
        );
      }
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Could not load conversations.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await clientApi<ConversationMessagesResponse>(
        `/api/chats/${conversationId}/messages`,
      );
      setMessages(response.messages);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Could not load chat messages.",
      );
    }
  };

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedConversationId);
  }, [selectedConversationId]);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedConversationId || !messageText.trim()) {
      return;
    }

    setSending(true);
    setFeedback(null);
    try {
      const response = await clientApi<{ message: ChatMessage }>(
        `/api/chats/${selectedConversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ text: messageText.trim() }),
        },
      );
      setMessages((prev) => [...prev, response.message]);
      setMessageText("");
      await loadConversations();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Could not send message.",
      );
    } finally {
      setSending(false);
    }
  };

  const reportListing = async (listingId: string) => {
    const reasonInput = window.prompt(
      "Tell us why this offer should be reported to admin.",
    );
    const reason = reasonInput?.trim();
    if (!reason) {
      return;
    }

    setReportingListingId(listingId);
    setFeedback(null);
    try {
      await clientApi<{ report: { id: string } }>(
        `/api/listings/${listingId}/report`,
        {
          method: "POST",
          body: JSON.stringify({ reason }),
        },
      );
      setFeedback("Report submitted to admin.");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Could not submit this report.",
      );
    } finally {
      setReportingListingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-5 md:px-6">
      <Card className="rounded-3xl">
        <p className="text-xs uppercase tracking-[0.18em] text-brand-600">
          {t("nav.messages")}
        </p>
        <h1 className="font-[family-name:var(--font-heading)] text-4xl text-brand-900">
          {t("messages.title")}
        </h1>
        <p className="mt-1 text-sm text-brand-700">{t("messages.subtitle")}</p>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-3xl">
          <CardTitle>{t("messages.title")}</CardTitle>
          <div className="mt-3 space-y-3">
            {loading ? (
              <p className="text-sm text-brand-700">{t("common.loading")}</p>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-brand-700">{t("messages.empty")}</p>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    selectedConversationId === conversation.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-brand-200 bg-white hover:border-brand-300"
                  }`}
                >
                  <p className="text-sm font-semibold text-brand-900">
                    {conversation.listing.title}
                  </p>
                  <p className="text-xs text-brand-700">
                    {conversation.counterpart.email}
                  </p>
                  <p className="mt-1 text-xs text-brand-700">
                    {conversation.listing.purpose === "rent"
                      ? `${formatCurrency(conversation.listing.priceMonthly ?? 0)} / ${t("common.month")}`
                      : formatCurrency(conversation.listing.priceSale ?? 0)}
                  </p>
                  {conversation.lastMessage ? (
                    <p className="mt-1 truncate text-xs text-brand-800">
                      {conversation.lastMessage.text}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-brand-600">
                      No messages yet.
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="rounded-3xl">
          {selectedConversation ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-100 pb-3">
                <div>
                  <CardTitle>{selectedConversation.listing.title}</CardTitle>
                  <CardDescription>
                    {selectedConversation.counterpart.email}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/zones/${selectedConversation.listing.zoneId}`}
                    className={buttonClassName("outline", "sm")}
                  >
                    Zone details
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => reportListing(selectedConversation.listingId)}
                    disabled={
                      reportingListingId === selectedConversation.listingId
                    }
                  >
                    {reportingListingId === selectedConversation.listingId
                      ? t("action.running")
                      : "Report offer"}
                  </Button>
                </div>
              </div>

              <div className="mt-3 max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <p className="text-sm text-brand-700">
                    {t("messages.select")}
                  </p>
                ) : (
                  messages.map((message) => {
                    const isMine =
                      message.senderId !== selectedConversation.counterpart.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                            isMine
                              ? "bg-brand-700 text-white"
                              : "border border-brand-200 bg-brand-50 text-brand-900"
                          }`}
                        >
                          <p>{message.text}</p>
                          <p
                            className={`mt-1 text-[10px] ${isMine ? "text-brand-100" : "text-brand-600"}`}
                          >
                            {new Date(message.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={sendMessage}
                className="mt-3 flex gap-2 border-t border-brand-100 pt-3"
              >
                <input
                  type="text"
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder={t("messages.placeholder")}
                  className="w-full rounded-xl border border-brand-200 px-3 py-2"
                />
                <Button type="submit" disabled={sending || !messageText.trim()}>
                  {sending ? t("action.running") : t("action.sendMessage")}
                </Button>
              </form>
            </>
          ) : (
            <p className="text-sm text-brand-700">{t("messages.select")}</p>
          )}
        </Card>
      </div>
      {feedback ? <p className="text-sm text-brand-700">{feedback}</p> : null}
    </div>
  );
}
