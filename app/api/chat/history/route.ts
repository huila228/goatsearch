import { getTelegramSession } from "@/lib/telegram-auth";
import {
  getChatStoreUserKey,
  listChatConversationsForUser,
} from "@/lib/chat-store";
import type { ChatHistoryListResponse } from "@/lib/chat-history";

export async function POST(req: Request) {
  try {
    const { telegramInitData }: { telegramInitData?: string } = await req.json();
    const session = getTelegramSession(telegramInitData);
    const userKey = getChatStoreUserKey({
      source: session.source,
      telegramUserId: session.user?.id,
    });

    const conversations = await listChatConversationsForUser(userKey);
    const response: ChatHistoryListResponse = {
      conversations,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error && error.message.length > 0
        ? error.message
        : "Failed to load history.";

    return new Response(message, {
      status: 400,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }
}
