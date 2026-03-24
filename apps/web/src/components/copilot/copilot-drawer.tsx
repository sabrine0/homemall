"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CopilotChatResponse, UserProfileInput } from "@homemall/shared";
import { clientApi } from "@/lib/client-api";
import { useI18n } from "@/components/i18n/i18n-provider";

interface CopilotDrawerProps {
  open: boolean;
  onClose: () => void;
  context: UserProfileInput;
}

type ChatMessage =
  | {
      id: string;
      role: "user";
      text: string;
    }
  | {
      id: string;
      role: "assistant";
      text: string;
      payload?: CopilotChatResponse;
    };

const quickPromptKeys = [
  "copilot.quick.quiet",
  "copilot.quick.allergy",
  "copilot.quick.invest",
  "copilot.quick.compare",
] as const;

export function CopilotDrawer({ open, onClose, context }: CopilotDrawerProps) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: t("copilot.welcome"),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  const canSend = useMemo(
    () => input.trim().length >= 2 && !sending,
    [input, sending],
  );

  useEffect(() => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === "welcome"
          ? { ...message, text: t("copilot.welcome") }
          : message,
      ),
    );
  }, [t]);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (message.length < 2 || sending) return;

    const userMessage: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      text: message,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const response = await clientApi<CopilotChatResponse>(
        "/api/copilot/chat",
        {
          method: "POST",
          body: JSON.stringify({
            message,
            context,
          }),
        },
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: "assistant",
          text: response.assistantText,
          payload: response,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a_err_${Date.now()}`,
          role: "assistant",
          text: err instanceof Error ? err.message : t("copilot.failed"),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-brand-200 bg-white p-4 shadow-2xl">
        <header className="flex items-center justify-between gap-2 border-b border-brand-100 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-brand-600">
              HomeMall
            </p>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl text-brand-900">
              {t("copilot.title")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-800"
          >
            {t("common.close")}
          </button>
        </header>

        <div className="mt-3 flex flex-wrap gap-2">
          {quickPromptKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => sendMessage(t(key))}
              className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800"
            >
              {t(key)}
            </button>
          ))}
        </div>

        <div
          ref={scrollRef}
          className="mt-3 h-[calc(100%-13rem)] overflow-y-auto pr-1"
        >
          <div className="space-y-3">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`rounded-2xl border p-3 ${
                  message.role === "user"
                    ? "ml-8 border-brand-300 bg-brand-50"
                    : "mr-8 border-brand-100 bg-white"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.15em] text-brand-600">
                  {message.role}
                </p>
                <p className="mt-1 text-sm text-brand-900">{message.text}</p>

                {message.role === "assistant" &&
                message.payload?.recommendations.length ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs uppercase tracking-[0.15em] text-brand-600">
                      {t("copilot.topZones")}
                    </p>
                    {message.payload.recommendations.map((item) => (
                      <div
                        key={item.zoneId}
                        className="rounded-xl border border-brand-100 bg-brand-50 p-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-brand-900">
                            {item.name}
                          </p>
                          <p className="text-lg font-bold text-brand-800">
                            {item.score}
                          </p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.badges.map((badge) => (
                            <span
                              key={`${item.zoneId}_${badge}`}
                              className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-brand-800"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-brand-800">
                          {item.why.map((reason) => (
                            <li key={`${item.zoneId}_${reason}`}>{reason}</li>
                          ))}
                        </ul>
                        <div className="mt-2">
                          <Link
                            href={`/zones/${item.zoneId}`}
                            className="text-xs font-semibold text-brand-800 underline"
                          >
                            {t("copilot.openDetails")}
                          </Link>
                        </div>
                      </div>
                    ))}

                    {message.payload.tclSuggestion ? (
                      <Link
                        href={`/tcl?zoneA=${message.payload.tclSuggestion.optionAZoneId}&zoneB=${message.payload.tclSuggestion.optionBZoneId}`}
                        className="inline-flex rounded-xl bg-brand-700 px-3 py-2 text-xs font-semibold text-white"
                      >
                        {t("copilot.runTclTopTwo")}
                      </Link>
                    ) : null}

                    {message.payload.followUpQuestions.length ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                        <p className="font-semibold">{t("copilot.followUp")}</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4">
                          {message.payload.followUpQuestions.map((question) => (
                            <li key={question}>{question}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(input);
          }}
          className="mt-3 flex gap-2 border-t border-brand-100 pt-3"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("copilot.placeholder")}
            className="flex-1 rounded-xl border border-brand-200 px-3 py-2 text-sm outline-none ring-brand-300 focus:ring"
          />
          <button
            type="submit"
            disabled={!canSend}
            className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed"
          >
            {sending ? "..." : t("action.send")}
          </button>
        </form>
      </aside>
    </div>
  );
}
