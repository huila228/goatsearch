"use client";

import { getToolName, type ReasoningUIPart, type UIMessage } from "ai";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import {
  Children,
  isValidElement,
  memo,
  useCallback,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import equal from "fast-deep-equal";

import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2,
  PocketKnife,
  StopCircle,
} from "lucide-react";

const searchProgressPhrases = [
  "Ищу в интернете",
  "Перебираю все обсуждения",
  "Захожу глубоко в дебри сайтов",
];

const chatProgressPhrases = [
  "Докуривает",
  "Кручу рогами мысль",
  "Ладно, сейчас отвечу",
];

function sanitizeGrokRenderText(text: string) {
  return text
    .replace(/\s*<grok:render\b[^>]*>[\s\S]*?<\/grok:render>\s*/gi, " ")
    .replace(/<\/?grok:render\b[^>]*>/gi, "")
    .replace(/<grok:render[\s\S]*$/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ");
}

interface ReasoningMessagePartProps {
  part: ReasoningUIPart;
  isReasoning: boolean;
}

function getNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getNodeText).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getNodeText(node.props.children);
  }

  return "";
}

function isCitationLabel(text: string) {
  return /^\[\d+\]$/.test(text.trim());
}

function MarkdownLink({
  children,
  className,
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const label = getNodeText(children);
  const match = label.trim().match(/^\[(\d+)\]$/);

  if (match) {
    return (
      <a
        className={cn(
          "inline-flex items-center rounded-full border border-white/12 bg-white/[0.06] px-1.5 py-0.5 text-[11px] leading-none font-medium text-white/78 no-underline transition-colors hover:bg-white/[0.1] hover:text-white",
          className,
        )}
        href={href}
        rel="noreferrer"
        target="_blank"
        {...props}
      >
        {match[1]}
      </a>
    );
  }

  return (
    <a
      className={cn(
        "wrap-anywhere break-all font-medium text-[#6fb8ff] underline underline-offset-4 transition-colors hover:text-white",
        className,
      )}
      href={href}
      rel="noreferrer"
      target="_blank"
      {...props}
    >
      {children}
    </a>
  );
}

function MarkdownParagraph({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  const text = getNodeText(children);
  const isCitationOnly = /^(?:\s*[.,]?\s*\[\d+\]\s*)+$/.test(text);

  if (isCitationOnly) {
    return (
      <div
        className={cn("mb-2 flex flex-wrap gap-2", className)}
        {...props}
      >
        {Children.toArray(children).filter((child) => {
          if (typeof child === "string") {
            return child.replace(/[\s.,]/g, "").length > 0;
          }

          if (isValidElement(child)) {
            return isCitationLabel(getNodeText(child));
          }

          return false;
        })}
      </div>
    );
  }

  return (
    <p className={className} {...props}>
      {children}
    </p>
  );
}

const streamdownComponents = {
  a: MarkdownLink,
  p: MarkdownParagraph,
};

function SearchProgress({
  compact = false,
  mode = "search",
}: {
  compact?: boolean;
  mode?: "search" | "chat";
}) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const phrases =
    mode === "search" ? searchProgressPhrases : chatProgressPhrases;

  useEffect(() => {
    setPhraseIndex(0);

    if (mode === "search") {
      const secondPhase = window.setTimeout(() => {
        setPhraseIndex(1);
      }, 5200);

      const thirdPhase = window.setTimeout(() => {
        setPhraseIndex(2);
      }, 11200);

      return () => {
        window.clearTimeout(secondPhase);
        window.clearTimeout(thirdPhase);
      };
    }

    const interval = window.setInterval(() => {
      setPhraseIndex((currentIndex) => (currentIndex + 1) % phrases.length);
    }, 2600);

    return () => {
      window.clearInterval(interval);
    };
  }, [mode, phrases.length]);

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        compact ? "min-h-8" : "min-h-11",
      )}
    >
      <div className="relative flex size-8 shrink-0 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-white/[0.06] animate-pulse" />
        <Loader2 className="relative size-4 animate-spin text-white/72" />
      </div>

      <div className="min-w-0 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={phraseIndex}
            initial={{ opacity: 0, y: 7, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -7, filter: "blur(4px)" }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className={cn(
              "text-white/78",
              compact ? "text-[13px] leading-5" : "text-[15px] leading-6",
            )}
          >
            {phrases[phraseIndex]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function ReasoningMessagePart({
  part,
  isReasoning,
}: ReasoningMessagePartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sanitizedReasoningText = sanitizeGrokRenderText(part.text);

  const variants = {
    collapsed: {
      height: 0,
      opacity: 0,
      marginTop: 0,
      marginBottom: 0,
    },
    expanded: {
      height: "auto",
      opacity: 1,
      marginTop: "1rem",
      marginBottom: 0,
    },
  };

  const memoizedSetIsExpanded = useCallback((value: boolean) => {
    setIsExpanded(value);
  }, []);

  useEffect(() => {
    memoizedSetIsExpanded(isReasoning);
  }, [isReasoning, memoizedSetIsExpanded]);

  return (
    <div className="flex flex-col">
      {isReasoning ? (
        <SearchProgress compact />
      ) : (
        <div className="flex flex-row gap-2 items-center">
          <div className="text-sm font-medium text-muted-foreground">
            Проверил обсуждения
          </div>
          <button
            className={cn(
              "cursor-pointer rounded-full hover:bg-white/8",
              {
                "bg-white/8": isExpanded,
              },
            )}
            onClick={() => {
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronUpIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="reasoning"
            className="flex flex-col gap-4 border-l border-border pl-3 text-sm text-muted-foreground"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <Streamdown components={streamdownComponents}>
              {sanitizedReasoningText}
            </Streamdown>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PurePreviewMessage = ({
  message,
  isLatestMessage,
  pendingVariant,
  status,
}: {
  message: UIMessage;
  isLoading: boolean;
  pendingVariant?: "search" | "chat";
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
}) => {
  const isUser = message.role === "user";
  const hasTextContent =
    message.parts?.some(
      (part) => part.type === "text" && part.text.trim().length > 0,
    ) ?? false;
  const hasReasoningPart =
    message.parts?.some((part) => part.type === "reasoning") ?? false;
  const showSearchStatus =
    !isUser &&
    isLatestMessage &&
    (status === "submitted" || status === "streaming") &&
    !hasTextContent &&
    !hasReasoningPart;

  return (
    <AnimatePresence key={message.id}>
      <motion.div
        className="mx-auto w-full group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={`message-${message.id}`}
        data-role={message.role}
      >
        <div
          className={cn(
            "w-full items-start",
            isUser
              ? "flex justify-end"
              : "grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_2.5rem]",
          )}
        >
          {!isUser ? (
            <div
              className={cn(
                "mt-0.5 size-10 shrink-0 overflow-hidden rounded-2xl border shadow-[0_10px_24px_rgba(0,0,0,0.24)]",
                showSearchStatus
                  ? "border-white/14"
                  : "border-white/10",
              )}
            >
              <Image
                src="/goat-avatar.png"
                alt=""
                width={40}
                height={40}
                className="size-full object-cover"
              />
            </div>
          ) : null}

          <div
            className={cn(
              "flex flex-col space-y-4",
              isUser ? "w-fit" : "min-w-0 pt-[2px]",
            )}
          >
            {showSearchStatus ? (
              <SearchProgress mode={pendingVariant ?? "search"} />
            ) : null}
            {message.parts?.map((part, i) => {
              switch (part.type) {
                case "text":
                  const sanitizedText = sanitizeGrokRenderText(part.text);

                  return (
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      key={`message-${message.id}-part-${i}`}
                      className={cn("w-full", isUser ? "flex justify-end" : undefined)}
                    >
                      {isUser ? (
                        <div className="relative ml-auto w-fit max-w-[min(82vw,56ch)] p-[1px] [border-radius:26px_30px_18px_28px/26px_24px_22px_32px] bg-[linear-gradient(135deg,rgba(255,255,255,0.34),rgba(255,255,255,0.12)_32%,rgba(120,145,185,0.2)_68%,rgba(255,255,255,0.22))] shadow-[0_14px_34px_rgba(0,0,0,0.24)]">
                          <div className="w-fit overflow-hidden break-words bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.09),rgba(255,255,255,0.03)_28%,rgba(14,16,20,0.96)_70%)] px-4 py-3 text-[15px] leading-[1.56] text-white [border-radius:25px_29px_17px_27px/25px_23px_21px_31px] [&_p]:m-0 [&_p]:leading-[1.56]">
                            <Streamdown components={streamdownComponents}>
                              {sanitizedText}
                            </Streamdown>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full max-w-[min(100%,67ch)] p-[1px] [border-radius:30px_30px_28px_30px/28px_32px_26px_30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08)_22%,rgba(120,145,185,0.12)_58%,rgba(255,255,255,0.12)_100%)] shadow-[0_14px_38px_rgba(0,0,0,0.2)]">
                          <div className="w-full overflow-hidden break-words rounded-[29px_29px_27px_29px/27px_31px_25px_29px] bg-[radial-gradient(140%_120%_at_0%_0%,rgba(255,255,255,0.12),transparent_34%),radial-gradient(120%_110%_at_100%_8%,rgba(118,146,192,0.14),transparent_36%),radial-gradient(110%_130%_at_18%_100%,rgba(255,255,255,0.06),transparent_42%),radial-gradient(95%_95%_at_100%_100%,rgba(92,112,150,0.1),transparent_38%),linear-gradient(180deg,rgba(28,31,38,0.9),rgba(16,18,24,0.92)_45%,rgba(10,12,16,0.95)_100%)] px-5 py-4 text-[15px] leading-[1.52] text-foreground backdrop-blur-[12px] [&_p]:m-0 [&_p]:leading-[1.52]">
                            <Streamdown components={streamdownComponents}>
                              {sanitizedText}
                            </Streamdown>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                // TODO: add your other tools here
                case "tool-getWeather":
                  const { state } = part;

                  return (
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      key={`message-${message.id}-part-${i}`}
                      className="mb-3 flex flex-col gap-2 rounded-2xl border border-border/40 bg-card/50 p-3 text-sm text-foreground"
                    >
                      <div className="flex flex-1 justify-center items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/40 bg-muted/60">
                          <PocketKnife className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex gap-2 items-baseline font-medium">
                            {state === "input-streaming" ? "Calling" : "Called"}{" "}
                            <span className="rounded-md bg-muted px-2 py-1 text-xs">
                              {getToolName(part)}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-center items-center w-5 h-5">
                          {state === "input-streaming" ? (
                            isLatestMessage && status !== "ready" ? (
                              <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                            ) : (
                              <StopCircle className="w-4 h-4 text-red-500" />
                            )
                          ) : state === "output-available" ? (
                            <CheckCircle size={14} className="text-green-600" />
                          ) : null}
                        </div>
                      </div>
                    </motion.div>
                  );
                case "reasoning":
                  return (
                    <ReasoningMessagePart
                      key={`message-${message.id}-${i}`}
                      part={part}
                      isReasoning={
                        (message.parts &&
                          status === "streaming" &&
                          i === message.parts.length - 1) ??
                        false
                      }
                    />
                  );
                default:
                  return null;
              }
            })}
          </div>

          {!isUser ? (
            <div
              aria-hidden
              className="hidden size-10 shrink-0 sm:block"
            />
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const Message = memo(PurePreviewMessage, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.pendingVariant !== nextProps.pendingVariant) return false;
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;

  return true;
});
