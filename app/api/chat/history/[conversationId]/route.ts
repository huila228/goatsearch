import { getTelegramSession } from "@/lib/telegram-auth";
import {
  deleteChatConversationForUser,
  getChatConversationForUser,
  getChatStoreUserKey,
} from "@/lib/chat-store";
import type {
  ChatHistoryConversationResponse,
  ChatHistoryDeleteResponse,
} from "@/lib/chat-history";

export async function POST(
  req: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { conversationId } = await context.params;
    const { telegramInitData }: { telegramInitData?: string } = await req.json();
    const session = getTelegramSession(telegramInitData);
    const userKey = getChatStoreUserKey({
      source: session.source,
      telegramUserId: session.user?.id,
    });

    const conversation = await getChatConversationForUser(userKey, conversationId);
    const response: ChatHistoryConversationResponse = {
      conversation,
    };

    if (!conversation) {
      return new Response("Диалог не найден.", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      });
    }

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error && error.message.length > 0
        ? error.message
        : "Failed to load conversation.";

    return new Response(message, {
      status: 400,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { conversationId } = await context.params;
    const { telegramInitData }: { telegramInitData?: string } = await req.json();
    const session = getTelegramSession(telegramInitData);
    const userKey = getChatStoreUserKey({
      source: session.source,
      telegramUserId: session.user?.id,
    });

    const deleted = await deleteChatConversationForUser(userKey, conversationId);

    if (!deleted) {
      return new Response("Диалог не найден.", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      });
    }

    const response: ChatHistoryDeleteResponse = {
      deletedConversationId: conversationId,
      ok: true,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error && error.message.length > 0
        ? error.message
        : "Failed to delete conversation.";

    return new Response(message, {
      status: 400,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }
}
