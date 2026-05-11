"use client";

import { useChat } from "@ai-sdk/react";
import { getTelegramWebApp, useTelegramThemeSync } from "@/lib/telegram-web-app";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";
import { Messages } from "./messages";
import { Header } from "./header";
import { toast } from "sonner";
import { EmptySearchState } from "./empty-search-state";
import { HistorySheet } from "./history-sheet";
import type {
  ChatConversation,
  ChatConversationSummary,
  ChatHistoryConversationResponse,
  ChatHistoryDeleteResponse,
  ChatHistoryListResponse,
} from "@/lib/chat-history";

function createConversationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function Chat() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [historyConversations, setHistoryConversations] = useState<
    ChatConversationSummary[]
  >([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [input, setInput] = useState("");
  const webApp = useMemo(() => getTelegramWebApp(), []);
  const telegramUser = webApp?.initDataUnsafe?.user ?? null;
  const telegramInitData = webApp?.initData ?? "";

  useTelegramThemeSync();

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);

    try {
      const response = await fetch("/api/chat/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegramInitData,
        }),
      });
      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(responseText || "Не удалось загрузить историю.");
      }

      const data = JSON.parse(responseText) as ChatHistoryListResponse;
      setHistoryConversations(data.conversations);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось загрузить историю.",
        { position: "top-center", richColors: true },
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [telegramInitData]);

  const {
    clearError,
    messages,
    sendMessage,
    setMessages,
    status,
    stop,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({
        telegramInitData,
      }),
    }),
    onFinish: () => {
      void loadHistory();
    },
    onError: (error) => {
      toast.error(
        error.message.length > 0
          ? error.message
          : "An error occured, please try again later.",
        { position: "top-center", richColors: true },
      );
      void loadHistory();
    },
  });

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const isLoading = status === "streaming" || status === "submitted";
  const isEmpty = messages.length === 0;

  const openConversation = useCallback(
    async (conversationId: string) => {
      if (isLoading) {
        stop();
      }

      try {
        setHistoryLoading(true);
        const response = await fetch(`/api/chat/history/${conversationId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            telegramInitData,
          }),
        });
        const responseText = await response.text();

        if (!response.ok) {
          throw new Error(responseText || "Не удалось открыть диалог.");
        }

        const data = JSON.parse(responseText) as ChatHistoryConversationResponse;
        const conversation = data.conversation as ChatConversation | null;

        if (!conversation) {
          throw new Error("Диалог не найден.");
        }

        clearError();
        setActiveConversationId(conversation.id);
        setMessages(conversation.messages);
        setHistoryOpen(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Не удалось открыть диалог.",
          { position: "top-center", richColors: true },
        );
      } finally {
        setHistoryLoading(false);
      }
    },
    [clearError, isLoading, setMessages, stop, telegramInitData],
  );

  const startNewChat = useCallback(() => {
    if (isLoading) {
      stop();
    }

    clearError();
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    setHistoryOpen(false);
  }, [clearError, isLoading, setMessages, stop]);

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        setHistoryLoading(true);

        const response = await fetch(`/api/chat/history/${conversationId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            telegramInitData,
          }),
        });
        const responseText = await response.text();

        if (!response.ok) {
          throw new Error(responseText || "Не удалось удалить диалог.");
        }

        const data = JSON.parse(responseText) as ChatHistoryDeleteResponse;

        setHistoryConversations((currentConversations) =>
          currentConversations.filter(
            (conversation) => conversation.id !== data.deletedConversationId,
          ),
        );

        if (activeConversationId === data.deletedConversationId) {
          clearError();
          setActiveConversationId(null);
          setMessages([]);
          setInput("");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Не удалось удалить диалог.",
          { position: "top-center", richColors: true },
        );
      } finally {
        setHistoryLoading(false);
      }
    },
    [activeConversationId, clearError, setMessages, telegramInitData],
  );

  const composer = (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const text = input.trim();

        if (!text || isLoading) {
          return;
        }

        const conversationId = activeConversationId ?? createConversationId();

        setActiveConversationId(conversationId);
        setInput("");
        try {
          await sendMessage(
            { text },
            {
              body: {
                conversationId,
              },
            },
          );
        } catch {
          // The hook-level onError already surfaces the real message.
        }
      }}
      className="w-full px-0"
    >
      <Textarea
        handleInputChange={(e) => setInput(e.currentTarget.value)}
        input={input}
        isLoading={isLoading}
        landing={isEmpty}
        status={status}
        stop={stop}
      />
    </form>
  );

  return (
    <div className="relative flex h-[var(--app-height)] min-h-[var(--app-height)] w-full flex-col overflow-hidden bg-black pb-[var(--app-safe-bottom)]">
      <Header
        historyOpen={historyOpen}
        onOpenHistory={() => setHistoryOpen(true)}
        telegramUserName={telegramUser?.first_name}
      />
      <HistorySheet
        activeConversationId={activeConversationId}
        conversations={historyConversations}
        isLoading={historyLoading || isLoading}
        onClose={() => setHistoryOpen(false)}
        onDeleteConversation={(conversationId) => {
          void deleteConversation(conversationId);
        }}
        onOpenConversation={(conversationId) => {
          void openConversation(conversationId);
        }}
        onStartNewChat={startNewChat}
        open={historyOpen}
      />
      <div
        className={cn(
          "mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col px-4 sm:px-5",
          isEmpty ? "pt-[64px] sm:pt-[66px]" : "pt-0",
        )}
      >
        {isEmpty ? (
          <EmptySearchState>{composer}</EmptySearchState>
        ) : (
          <>
            <Messages messages={messages} isLoading={isLoading} status={status} />
            <div className="pb-3 pt-0 sm:pb-4">{composer}</div>
          </>
        )}
      </div>
    </div>
  );
}
