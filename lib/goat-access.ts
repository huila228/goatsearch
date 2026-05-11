import type { TelegramUser } from "@/types/telegram";
import {
  SUBSCRIBER_CHAT_LIMIT,
  SUBSCRIBER_DAILY_TOTAL_LIMIT,
  SUBSCRIBER_SEARCH_LIMIT,
  type GoatAccessStatus,
  type GoatUsageKind,
} from "@/lib/chat-history";
import {
  consumeLocalGoatAccess,
  getLocalGoatAccessStatus,
} from "@/lib/chat-store";

type AccessSession = {
  source: "telegram" | "development";
  user: TelegramUser | null;
};

type AccessIdentity = {
  session: AccessSession;
  userKey: string;
};

function getAccessBackendConfig() {
  const url = process.env.GOAT_ACCESS_API_URL?.trim();
  const secret = process.env.GOAT_ACCESS_API_SECRET?.trim();

  if (!url || !secret) {
    return null;
  }

  return { secret, url: url.replace(/\/+$/, "") };
}

function shouldBlockWithoutRemoteBackend(identity: AccessIdentity) {
  return (
    process.env.NODE_ENV === "production" &&
    identity.session.source === "telegram"
  );
}

async function callRemoteAccessBackend<T>({
  body,
  identity,
  path,
}: {
  body?: object;
  identity: AccessIdentity;
  path: "/consume" | "/status";
}) {
  const config = getAccessBackendConfig();

  if (!config || identity.session.source !== "telegram" || !identity.session.user) {
    return null;
  }

  const response = await fetch(`${config.url}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.secret}`,
      "Content-Type": "application/json",
      "X-Goat-Access-Secret": config.secret,
    },
    body: JSON.stringify({
      telegramUserId: identity.session.user.id,
      ...body,
    }),
    cache: "no-store",
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(responseText || "Access backend request failed.");
  }

  return JSON.parse(responseText) as T;
}

export function createBlockedAccessStatus(message: string): GoatAccessStatus {
  return {
    allowed: false,
    daily: {
      limit: SUBSCRIBER_DAILY_TOTAL_LIMIT,
      remaining: 0,
      used: SUBSCRIBER_DAILY_TOTAL_LIMIT,
    },
    limits: {
      chat: SUBSCRIBER_CHAT_LIMIT,
      search: SUBSCRIBER_SEARCH_LIMIT,
    },
    message,
    reason: "blocked",
    remaining: {
      chat: 0,
      search: 0,
    },
    source: "local",
    tier: "blocked",
    used: {
      chat: 0,
      search: 0,
    },
  };
}

export async function getGoatAccessStatus(identity: AccessIdentity) {
  if (!getAccessBackendConfig() && shouldBlockWithoutRemoteBackend(identity)) {
    return createBlockedAccessStatus(
      "Доступ к Goat временно недоступен: backend проверки подписки не настроен.",
    );
  }

  const remoteStatus = await callRemoteAccessBackend<GoatAccessStatus>({
    identity,
    path: "/status",
  });

  if (remoteStatus) {
    return {
      ...remoteStatus,
      source: "remote" as const,
    };
  }

  return getLocalGoatAccessStatus(identity.userKey);
}

export async function consumeGoatAccess({
  identity,
  messageId,
  usageKind,
}: {
  identity: AccessIdentity;
  messageId: string;
  usageKind: GoatUsageKind;
}) {
  if (!getAccessBackendConfig() && shouldBlockWithoutRemoteBackend(identity)) {
    throw new Error(
      "Доступ к Goat временно недоступен: backend проверки подписки не настроен.",
    );
  }

  const remoteStatus = await callRemoteAccessBackend<GoatAccessStatus>({
    body: {
      messageId,
      usageKind,
    },
    identity,
    path: "/consume",
  });

  if (remoteStatus) {
    return {
      ...remoteStatus,
      source: "remote" as const,
    };
  }

  return consumeLocalGoatAccess(identity.userKey, messageId, usageKind);
}
