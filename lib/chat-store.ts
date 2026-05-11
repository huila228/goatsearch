import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { UIMessage } from "ai";

import {
  DAILY_MESSAGE_LIMIT,
  MONTHLY_MESSAGE_LIMIT,
  type ChatConversation,
  type ChatConversationSummary,
} from "@/lib/chat-history";

type ChatStoreUser = {
  conversations: ChatConversation[];
  usage: {
    dailyCounts: Record<string, number>;
    monthlyCounts: Record<string, number>;
    countedMessageIds: Record<
      string,
      {
        dayKey: string;
        monthKey: string;
        countedAt: string;
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

function getNowParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return { year, month, day };
}

function getDayKey(date = new Date()) {
  const { year, month, day } = getNowParts(date);
  return `${year}-${month}-${day}`;
}

function getMonthKey(date = new Date()) {
  const { year, month } = getNowParts(date);
  return `${year}-${month}`;
}

function singleLine(text: string) {
  return text.replace(/\s+/g, " ").trim();
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
    return existingUser;
  }

  const nextUser: ChatStoreUser = {
    conversations: [],
    usage: {
      dailyCounts: {},
      monthlyCounts: {},
      countedMessageIds: {},
    },
  };

  store.users[userKey] = nextUser;
  return nextUser;
}

function cleanupUsageState(user: ChatStoreUser, now = new Date()) {
  const currentDayKey = getDayKey(now);
  const currentMonthKey = getMonthKey(now);

  user.usage.dailyCounts = Object.fromEntries(
    Object.entries(user.usage.dailyCounts).filter(([key]) => key === currentDayKey),
  );

  user.usage.monthlyCounts = Object.fromEntries(
    Object.entries(user.usage.monthlyCounts).filter(
      ([key]) => key === currentMonthKey,
    ),
  );

  user.usage.countedMessageIds = Object.fromEntries(
    Object.entries(user.usage.countedMessageIds).filter(
      ([, record]) => record.monthKey === currentMonthKey,
    ),
  );
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

export async function consumeChatUserMessageQuota(
  userKey: string,
  messageId: string,
) {
  return mutateStore(async (store) => {
    const user = getOrCreateUser(store, userKey);
    const now = new Date();

    cleanupUsageState(user, now);

    if (user.usage.countedMessageIds[messageId]) {
      return;
    }

    const dayKey = getDayKey(now);
    const monthKey = getMonthKey(now);
    const usedToday = user.usage.dailyCounts[dayKey] ?? 0;
    const usedThisMonth = user.usage.monthlyCounts[monthKey] ?? 0;

    if (usedToday >= DAILY_MESSAGE_LIMIT) {
      throw new Error(
        `Дневной лимит исчерпан: ${DAILY_MESSAGE_LIMIT} сообщений в день.`,
      );
    }

    if (usedThisMonth >= MONTHLY_MESSAGE_LIMIT) {
      throw new Error(
        `Месячный лимит исчерпан: ${MONTHLY_MESSAGE_LIMIT} сообщений в месяц.`,
      );
    }

    user.usage.dailyCounts[dayKey] = usedToday + 1;
    user.usage.monthlyCounts[monthKey] = usedThisMonth + 1;
    user.usage.countedMessageIds[messageId] = {
      dayKey,
      monthKey,
      countedAt: now.toISOString(),
    };
  });
}
