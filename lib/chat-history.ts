import type { UIMessage } from "ai";

export const DAILY_MESSAGE_LIMIT = 5;
export const MONTHLY_MESSAGE_LIMIT = 30;

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
  conversations: ChatConversationSummary[];
};

export type ChatHistoryConversationResponse = {
  conversation: ChatConversation | null;
};

export type ChatHistoryDeleteResponse = {
  deletedConversationId: string;
  ok: true;
};
