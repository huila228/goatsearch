"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ChatConversationSummary } from "@/lib/chat-history";
import { cn } from "@/lib/utils";

const DELETE_REVEAL_WIDTH = 96;
const DELETE_OPEN_THRESHOLD = 54;

function formatHistoryDate(updatedAt: string) {
  const date = new Date(updatedAt);

  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const HistorySheet = ({
  activeConversationId,
  conversations,
  isLoading,
  onClose,
  onDeleteConversation,
  onOpenConversation,
  onStartNewChat,
  open,
}: {
  activeConversationId: string | null;
  conversations: ChatConversationSummary[];
  isLoading: boolean;
  onClose: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onOpenConversation: (conversationId: string) => void;
  onStartNewChat: () => void;
  open: boolean;
}) => {
  const [deleteOpenConversationId, setDeleteOpenConversationId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!open) {
      setDeleteOpenConversationId(null);
    }
  }, [open]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-40",
        open ? "pointer-events-auto" : undefined,
      )}
    >
      <button
        type="button"
        aria-label="Закрыть историю"
        className={cn(
          "absolute inset-0 bg-black/56 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "absolute top-0 right-0 flex h-full w-[min(88vw,368px)] flex-col border-l border-white/10 bg-[#0d0d0f]/[0.98] shadow-[-24px_0_80px_rgba(0,0,0,0.45)] [backdrop-filter:blur(20px)_saturate(160%)] transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="border-b border-white/10 px-4 pb-4 pt-5 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[17px] font-medium tracking-tight text-white/96">
                История
              </div>
              <div className="text-[12px] text-white/42">
                Сохраненные диалоги
              </div>
            </div>

            <button
              type="button"
              aria-label="Закрыть историю"
              onClick={onClose}
              className="flex size-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white/72 transition-colors hover:bg-white/[0.09] hover:text-white"
            >
              <X className="size-[18px]" />
            </button>
          </div>

          <button
            type="button"
            onClick={onStartNewChat}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[14px] font-medium text-white/90 transition-colors hover:bg-white/[0.1]"
          >
            <Plus className="size-4" />
            Новый диалог
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          {conversations.length === 0 ? (
            <div className="rounded-[26px] border border-white/8 bg-white/[0.03] px-4 py-5 text-sm leading-6 text-white/44">
              История пока пустая. Отправь первое сообщение, и диалог появится
              здесь.
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId;

                return (
                  <HistoryConversationRow
                    key={conversation.id}
                    conversation={conversation}
                    deleteOpen={deleteOpenConversationId === conversation.id}
                    isActive={isActive}
                    isBusy={isLoading}
                    onDelete={() => {
                      setDeleteOpenConversationId(null);
                      onDeleteConversation(conversation.id);
                    }}
                    onOpen={() => onOpenConversation(conversation.id)}
                    onSwipeChange={(isOpen) => {
                      setDeleteOpenConversationId(
                        isOpen ? conversation.id : null,
                      );
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

const HistoryConversationRow = ({
  conversation,
  deleteOpen,
  isActive,
  isBusy,
  onDelete,
  onOpen,
  onSwipeChange,
}: {
  conversation: ChatConversationSummary;
  deleteOpen: boolean;
  isActive: boolean;
  isBusy: boolean;
  onDelete: () => void;
  onOpen: () => void;
  onSwipeChange: (open: boolean) => void;
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const interactionRef = useRef({
    isDragging: false,
    isHorizontal: false,
    startX: 0,
    startY: 0,
    startOffset: 0,
  });

  useEffect(() => {
    setSwipeOffset(deleteOpen ? -DELETE_REVEAL_WIDTH : 0);
  }, [deleteOpen]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (isBusy) {
      return;
    }

    const touch = event.touches[0];
    interactionRef.current = {
      isDragging: true,
      isHorizontal: false,
      startX: touch.clientX,
      startY: touch.clientY,
      startOffset: swipeOffset,
    };
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!interactionRef.current.isDragging || isBusy) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - interactionRef.current.startX;
    const deltaY = touch.clientY - interactionRef.current.startY;

    if (!interactionRef.current.isHorizontal) {
      if (Math.abs(deltaX) <= 6) {
        return;
      }

      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        interactionRef.current.isDragging = false;
        return;
      }

      interactionRef.current.isHorizontal = true;
    }

    event.preventDefault();

    const boundedOffset = Math.max(
      -DELETE_REVEAL_WIDTH,
      Math.min(0, interactionRef.current.startOffset + deltaX),
    );

    setSwipeOffset(boundedOffset);
  };

  const finishGesture = () => {
    if (!interactionRef.current.isHorizontal) {
      interactionRef.current.isDragging = false;
      interactionRef.current.isHorizontal = false;
      return;
    }

    const shouldOpen = swipeOffset <= -DELETE_OPEN_THRESHOLD;

    onSwipeChange(shouldOpen);
    interactionRef.current.isDragging = false;
    interactionRef.current.isHorizontal = false;
    setSwipeOffset(shouldOpen ? -DELETE_REVEAL_WIDTH : 0);
  };

  const handleClick = () => {
    if (isBusy) {
      return;
    }

    if (deleteOpen) {
      onSwipeChange(false);
      return;
    }

    onOpen();
  };

  return (
    <div className="relative overflow-hidden rounded-[24px]">
      <div
        className="absolute inset-y-0 right-0 overflow-hidden rounded-[24px]"
        style={{
          width: `${Math.max(0, -swipeOffset)}px`,
        }}
      >
        <button
          type="button"
          aria-label="Удалить диалог"
          disabled={isBusy}
          onClick={onDelete}
          className="absolute inset-y-0 right-0 flex h-full w-24 flex-col items-center justify-center gap-1 rounded-[24px] bg-[#7a0c18] text-white transition-colors hover:bg-[#8f1020] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="size-[18px]" />
          <span className="text-[11px] font-medium tracking-tight">
            Удалить
          </span>
        </button>
      </div>

      <div
        className={cn(
          "relative z-10 w-full will-change-transform [touch-action:pan-y]",
          interactionRef.current.isDragging
            ? undefined
            : "transition-transform duration-200 ease-out",
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
        }}
        onClick={handleClick}
        onTouchEnd={finishGesture}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
      >
        <button
          type="button"
          disabled={isBusy}
          className={cn(
            "block w-full rounded-[24px] border px-4 py-3 text-left transition-colors",
            isActive
              ? "border-white/16 bg-white/[0.1]"
              : "border-white/8 bg-white/[0.04] hover:bg-white/[0.08]",
            isBusy ? "cursor-not-allowed opacity-70" : undefined,
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[14px] font-medium text-white/94">
                {conversation.title}
              </div>
              <div className="mt-1 line-clamp-2 text-[13px] leading-5 text-white/52">
                {conversation.preview}
              </div>
            </div>
            <div className="shrink-0 text-[11px] text-white/34">
              {formatHistoryDate(conversation.updatedAt)}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
