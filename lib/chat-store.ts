import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { UIMessage } from "ai";

import {
  SUBSCRIBER_CHAT_LIMIT,
  SUBSCRIBER_DAILY_TOTAL_LIMIT,
  SUBSCRIBER_SEARCH_LIMIT,
  type ChatConversation,
  type ChatConversationSummary,
  type GoatAccessStatus,
  type GoatUsageKind,
} from "@/lib/chat-history";

type ChatStoreUser = {
  conversations: ChatConversation[];
  usage: {
    dailyTotals: Record<string, number>;
    guestLifetimeUsed: number;
    subscriberUsed: Record<GoatUsageKind, number>;
    countedMessageIds: Record<
      string,
      {
        countedAt: string;
        dayKey: string;
        usageKind: GoatUsageKind;
      }
    >;
  };
};

type ChatStoreFile = {
  users: Record<string, ChatStoreUser>;
};

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "chat-store.json");
const APP_TIME_ZONE = process.env.GOAT_TIME_ZONE ?? "Asia/Novosibirsk";
let mutationQueue = Promise.resolve();

function createEmptyStore(): ChatStoreFile {
  return {
    users: {},
  };
}

async function ensureStoreDir() {
  await mkdir(STORE_DIR, { recursive: true });
}

async function readStore(): Promise<ChatStoreFile> {
  await ensureStoreDir();

  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as ChatStoreFile;

    if (parsed && typeof parsed === "object" && parsed.users) {
      return parsed;
    }

    return createEmptyStore();
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return createEmptyStore();
    }

    console.error("Failed to read chat store:", error);
    return createEmptyStore();
  }
}

async function writeStore(store: ChatStoreFile) {
  await ensureStoreDir();
  await writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

async function mutateStore<T>(
  mutator: (store: ChatStoreFile) => Promise<T> | T,
): Promise<T> {
  const nextMutation = mutationQueue.then(async () => {
    const store = await readStore();
    const result = await mutator(store);
    await writeStore(store);
    return result;
  });

  mutationQueue = nextMutation.then(
    () => undefined,
    () => undefined,
  );

  return nextMutation;
}

function singleLine(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function getDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function clipText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function getMessageText(message: UIMessage) {
  return singleLine(
    message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ") ?? "",
  );
}

function buildConversationTitle(messages: UIMessage[]) {
  const firstUserMessage = messages.find(
    (message) => message.role === "user" && getMessageText(message),
  );
  const firstUserText = firstUserMessage ? getMessageText(firstUserMessage) : "";

  const firstMeaningfulText =
    firstUserText ||
    messages.map(getMessageText).find((text) => text.length > 0) ||
    "Новый диалог";

  return clipText(firstMeaningfulText, 68);
}

function buildConversationPreview(messages: UIMessage[]) {
  const latestMeaningfulText =
    [...messages]
      .reverse()
      .map(getMessageText)
      .find((text) => text.length > 0) || "Пустой диалог";

  return clipText(latestMeaningfulText, 120);
}

function summarizeConversation(
  conversation: ChatConversation,
): ChatConversationSummary {
  return {
    id: conversation.id,
    title: conversation.title,
    preview: conversation.preview,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: conversation.messages.length,
  };
}

function cloneMessages(messages: UIMessage[]) {
  return JSON.parse(JSON.stringify(messages)) as UIMessage[];
}

function getOrCreateUser(store: ChatStoreFile, userKey: string): ChatStoreUser {
  const existingUser = store.users[userKey];

  if (existingUser) {
    const usage = existingUser.usage as Partial<ChatStoreUser["usage"]> | undefined;

    existingUser.usage = {
      countedMessageIds:
        usage?.countedMessageIds && typeof usage.countedMessageIds === "object"
          ? usage.countedMessageIds
          : {},
      dailyTotals:
        usage?.dailyTotals && typeof usage.dailyTotals === "object"
          ? usage.dailyTotals
          : {},
      guestLifetimeUsed:
        typeof usage?.guestLifetimeUsed === "number" ? usage.guestLifetimeUsed : 0,
      subscriberUsed: {
        chat:
          typeof usage?.subscriberUsed?.chat === "number"
            ? usage.subscriberUsed.chat
            : 0,
        search:
          typeof usage?.subscriberUsed?.search === "number"
            ? usage.subscriberUsed.search
            : 0,
      },
    };

    return existingUser;
  }

  const nextUser: ChatStoreUser = {
    conversations: [],
    usage: {
      countedMessageIds: {},
      dailyTotals: {},
      guestLifetimeUsed: 0,
      subscriberUsed: {
        chat: 0,
        search: 0,
      },
    },
  };

  store.users[userKey] = nextUser;
  return nextUser;
}

function upsertConversation(
  user: ChatStoreUser,
  conversationId: string,
  messages: UIMessage[],
) {
  const nowIso = new Date().toISOString();
  const existingConversation = user.conversations.find(
    (conversation) => conversation.id === conversationId,
  );
  const nextConversation: ChatConversation = {
    id: conversationId,
    title: buildConversationTitle(messages),
    preview: buildConversationPreview(messages),
    createdAt: existingConversation?.createdAt ?? nowIso,
    updatedAt: nowIso,
    messages: cloneMessages(messages),
  };

  if (existingConversation) {
    Object.assign(existingConversation, nextConversation);
    return existingConversation;
  }

  user.conversations.unshift(nextConversation);
  return nextConversation;
}

export function getChatStoreUserKey({
  source,
  telegramUserId,
}: {
  source: "telegram" | "development";
  telegramUserId?: number | null;
}) {
  if (source === "telegram") {
    return telegramUserId != null
      ? `tg:${telegramUserId}`
      : "tg:anonymous";
  }

  return "development-preview";
}

export async function listChatConversationsForUser(userKey: string) {
  const store = await readStore();
  const user = store.users[userKey];

  if (!user) {
    return [] satisfies ChatConversationSummary[];
  }

  return [...user.conversations]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(summarizeConversation);
}

export async function getChatConversationForUser(
  userKey: string,
  conversationId: string,
) {
  const store = await readStore();
  const user = store.users[userKey];

  if (!user) {
    return null;
  }

  return (
    user.conversations.find(
      (conversation) => conversation.id === conversationId,
    ) ?? null
  );
}

export async function deleteChatConversationForUser(
  userKey: string,
  conversationId: string,
) {
  return mutateStore(async (store) => {
    const user = store.users[userKey];

    if (!user) {
      return false;
    }

    const nextConversations = user.conversations.filter(
      (conversation) => conversation.id !== conversationId,
    );
    const deleted = nextConversations.length !== user.conversations.length;

    user.conversations = nextConversations;

    return deleted;
  });
}

export async function saveChatConversationForUser(
  userKey: string,
  conversationId: string,
  messages: UIMessage[],
) {
  return mutateStore(async (store) => {
    const user = getOrCreateUser(store, userKey);
    const conversation = upsertConversation(user, conversationId, messages);

    user.conversations.sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );

    return summarizeConversation(conversation);
  });
}

function buildLocalSubscriberStatus(user: ChatStoreUser): GoatAccessStatus {
  const currentDayKey = getDayKey();
  const usedChat = user.usage.subscriberUsed.chat;
  const usedDaily = user.usage.dailyTotals[currentDayKey] ?? 0;
  const usedSearch = user.usage.subscriberUsed.search;
  const remainingDaily = Math.max(0, SUBSCRIBER_DAILY_TOTAL_LIMIT - usedDaily);
  const remainingChat = Math.max(0, SUBSCRIBER_CHAT_LIMIT - usedChat);
  const remainingSearch = Math.max(0, SUBSCRIBER_SEARCH_LIMIT - usedSearch);
  const noUsageBucketsLeft = remainingChat <= 0 && remainingSearch <= 0;
  const message =
    remainingDaily <= 0
      ? `Дневной лимит исчерпан: ${SUBSCRIBER_DAILY_TOTAL_LIMIT} сообщений.`
      : noUsageBucketsLeft
        ? "Лимиты Goat закончились."
        : undefined;

  return {
    allowed: remainingDaily > 0 && !noUsageBucketsLeft,
    daily: {
      limit: SUBSCRIBER_DAILY_TOTAL_LIMIT,
      remaining: remainingDaily,
      used: usedDaily,
    },
    limits: {
      chat: SUBSCRIBER_CHAT_LIMIT,
      search: SUBSCRIBER_SEARCH_LIMIT,
    },
    message,
    remaining: {
      chat: remainingChat,
      search: remainingSearch,
    },
    source: "local",
    tier: "subscriber",
    used: {
      chat: usedChat,
      search: usedSearch,
    },
  };
}

export async function getLocalGoatAccessStatus(userKey: string) {
  const store = await readStore();
  const user = getOrCreateUser(store, userKey);

  return buildLocalSubscriberStatus(user);
}

export async function consumeLocalGoatAccess(
  userKey: string,
  messageId: string,
  usageKind: GoatUsageKind,
) {
  return mutateStore(async (store) => {
    const user = getOrCreateUser(store, userKey);
    const dayKey = getDayKey();

    if (user.usage.countedMessageIds[messageId]) {
      return buildLocalSubscriberStatus(user);
    }

    const currentDailyUsage = user.usage.dailyTotals[dayKey] ?? 0;
    const currentUsage = user.usage.subscriberUsed[usageKind];
    const usageLimit =
      usageKind === "search"
        ? SUBSCRIBER_SEARCH_LIMIT
        : SUBSCRIBER_CHAT_LIMIT;

    if (currentDailyUsage >= SUBSCRIBER_DAILY_TOTAL_LIMIT) {
      throw new Error(
        `Дневной лимит исчерпан: ${SUBSCRIBER_DAILY_TOTAL_LIMIT} сообщений.`,
      );
    }

    if (currentUsage >= usageLimit) {
      throw new Error(
        usageKind === "search"
          ? `Лимит поисковых сообщений исчерпан: ${SUBSCRIBER_SEARCH_LIMIT}.`
          : `Лимит обычных сообщений исчерпан: ${SUBSCRIBER_CHAT_LIMIT}.`,
      );
    }

    user.usage.dailyTotals[dayKey] = currentDailyUsage + 1;
    user.usage.subscriberUsed[usageKind] = currentUsage + 1;
    user.usage.countedMessageIds[messageId] = {
      countedAt: new Date().toISOString(),
      dayKey,
      usageKind,
    };

    return buildLocalSubscriberStatus(user);
  });
}
