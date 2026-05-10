"use client";

import { useChat } from "@ai-sdk/react";
import { getTelegramWebApp, useTelegramThemeSync } from "@/lib/telegram-web-app";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";
import { Messages } from "./messages";
import { Header } from "./header";
import { toast } from "sonner";
import { EmptySearchState } from "./empty-search-state";

export default function Chat() {
  const [input, setInput] = useState("");
  const webApp = useMemo(() => getTelegramWebApp(), []);
  const telegramUser = webApp?.initDataUnsafe?.user ?? null;

  useTelegramThemeSync();

  const { sendMessage, messages, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({
        telegramInitData: webApp?.initData ?? "",
      }),
    }),
    onError: (error) => {
      toast.error(
        error.message.length > 0
          ? error.message
          : "An error occured, please try again later.",
        { position: "top-center", richColors: true },
      );
    },
  });

  const isLoading = status === "streaming" || status === "submitted";
  const isEmpty = messages.length === 0;

  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sendMessage({ text: input });
        setInput("");
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
    <div className="relative flex h-dvh w-full flex-col bg-black">
      <Header telegramUserName={telegramUser?.first_name} />
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
