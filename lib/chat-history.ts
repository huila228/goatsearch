import type { UIMessage } from "ai";

export const SUBSCRIBER_CHAT_LIMIT = 50;
export const SUBSCRIBER_SEARCH_LIMIT = 35;
export const SUBSCRIBER_DAILY_TOTAL_LIMIT = 15;

export type GoatUsageKind = "chat" | "search";
export type GoatAccessTier = "subscriber" | "guest" | "blocked";

export type GoatAccessStatus = {
  allowed: boolean;
  daily: {
    limit: number;
    remaining: number;
    used: number;
  };
  limits: {
    chat: number;
    search: number;
  };
  message?: string;
  reason?: string;
  remaining: {
    chat: number;
    search: number;
  };
  source: "local" | "remote";
  tier: GoatAccessTier;
  used: {
    chat: number;
    search: number;
  };
};

export type ChatConversation = {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  messages: UIMessage[];
};

export type ChatConversationSummary = {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export type ChatHistoryListResponse = {
  access: GoatAccessStatus;
  conversations: ChatConversationSummary[];
};

export type ChatHistoryConversationResponse = {
  conversation: ChatConversation | null;
};

export type ChatHistoryDeleteResponse = {
  deletedConversationId: string;
  ok: true;
};
