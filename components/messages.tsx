import type { UIMessage as TMessage } from "ai";
import { getLastUserText, isSearchIntentText } from "@/lib/query-intent";
import { Message } from "./message";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";

export const Messages = ({
  messages,
  isLoading,
  status,
}: {
  messages: TMessage[];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
}) => {
  const [containerRef, endRef] = useScrollToBottom();
  const shouldRenderPendingAssistant =
    isLoading && messages[messages.length - 1]?.role === "user";
  const pendingVariant = isSearchIntentText(getLastUserText(messages))
    ? "search"
    : "chat";

  return (
    <div className="relative flex-1">
      <div
        className="chat-scrollbar absolute inset-0 overflow-y-auto pr-1 sm:pr-2"
        ref={containerRef}
      >
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4 px-0 pb-2 pr-2 pt-[74px] sm:gap-5 sm:pr-3 sm:pt-[78px]">
          {messages.map((m, i) => (
            <div key={i} className={i === 0 ? "mt-auto" : undefined}>
              <Message
                isLatestMessage={
                  i === messages.length - 1 && !shouldRenderPendingAssistant
                }
                isLoading={isLoading}
                message={m}
                pendingVariant={pendingVariant}
                status={status}
              />
            </div>
          ))}

          {shouldRenderPendingAssistant ? (
            <div className={messages.length === 0 ? "mt-auto" : undefined}>
              <Message
                key="pending-assistant"
                isLatestMessage
                isLoading={isLoading}
                message={{
                  id: "pending-assistant",
                  role: "assistant",
                  parts: [],
                }}
                pendingVariant={pendingVariant}
                status={status}
              />
            </div>
          ) : null}

          <div className="h-1 min-w-[8px] shrink-0" ref={endRef} />
        </div>
      </div>
    </div>
  );
};
