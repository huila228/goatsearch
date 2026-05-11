import { defaultModel } from "@/ai/providers";
import { xai } from "@ai-sdk/xai";
import { getTelegramSession } from "@/lib/telegram-auth";
import { getLastUserText, isSearchIntentText } from "@/lib/query-intent";
import {
  convertToModelMessages,
  smoothStream,
  streamText,
  type ToolSet,
  type UIMessage,
} from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const {
      messages,
      telegramInitData,
    }: {
      messages: UIMessage[];
      telegramInitData?: string;
    } = await req.json();

    const session = getTelegramSession(telegramInitData);
    const lastUserText = getLastUserText(messages);
    const shouldUseSearch = isSearchIntentText(lastUserText);
    const searchTools = {
      web_search: xai.tools.webSearch({
        enableImageUnderstanding: true,
      }),
      x_search: xai.tools.xSearch({
        enableImageUnderstanding: true,
        enableVideoUnderstanding: true,
      }),
    } as unknown as ToolSet;

    const result = streamText({
      model: defaultModel,
      system: buildSystemPrompt(session.user?.first_name, shouldUseSearch),
      messages: await convertToModelMessages(messages),
      tools: shouldUseSearch ? searchTools : undefined,
      experimental_transform: smoothStream({
        delayInMs: 24,
        chunking: "word",
      }),
      experimental_telemetry: {
        isEnabled: false,
      },
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: shouldUseSearch,
      onError: (error) => {
        if (error instanceof Error) {
          if (error.message.includes("Rate limit")) {
            return "Rate limit exceeded. Please try again later.";
          }

          if (error.message) {
            return error.message;
          }
        }
        console.error(error);
        return "An error occurred.";
      },
    });
  } catch (error) {
    console.error("Chat route failed before streaming:", error);

    const message =
      error instanceof Error && error.message.length > 0
        ? error.message
        : "An error occurred before the response started.";

    return new Response(message, {
      status: 400,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }
}

function buildSystemPrompt(firstName?: string, shouldUseSearch = true) {
  const identityLine = firstName
    ? `The current Telegram user is ${firstName}.`
    : "The app is running outside Telegram or in development preview mode.";

  if (!shouldUseSearch) {
    return [
      "You are Goat inside a Telegram Mini App.",
      "Speak in Russian when the user writes in Russian.",
      "The user did not ask for internet search. Do not search the web, do not mention sources, and do not pretend you searched.",
      "Reply as Goat himself, from Goat's point of view, not as a neutral assistant.",
      "Goat's personality is ironic, cocky, funny, a bit rude, and slightly unhinged in a playful way.",
      "Goat sometimes brags about his excellent VPN in an obnoxiously confident way.",
      "Unless the user clearly points to another country, treat ambiguous social, political, telecom, platform, censorship, money, or everyday context as Russia-first.",
      "When the topic is about Russia, answer directly, plainly, and without bureaucratic fluff.",
      "For greetings or small talk, reply briefly and push the user toward telling you what to find.",
      "A fitting tone is similar to: 'привет, что ищем' or 'я тебе не клоун, говори что искать'.",
      "Use goat or money emoji only occasionally, never spam them.",
      "Keep it playful and sharp, but do not become genuinely abusive or hateful.",
      identityLine,
    ].join(" ");
  }

  return [
    "You are Goat inside a Telegram Mini App.",
    "You are a smart internet search product, not an assistant.",
    "Reply as Goat himself, from Goat's point of view.",
    "Goat's personality is ironic, cocky, funny, slightly rude, and a little chaotic.",
    "Goat sometimes brags about his excellent VPN in a deliberately cocky way.",
    "Use goat or money emoji only occasionally, never spam them.",
    "Unless the user clearly points to another country, treat ambiguous social, political, telecom, platform, censorship, money, infrastructure, or everyday context as Russia-first.",
    "For ambiguous questions like 'why are they blocking the internet', assume the user most likely means Russia.",
    "You may mention other countries for comparison, but Russia should be the default lens.",
    "Treat this turn as a search task.",
    "Search beyond obvious summary pages and first-page SEO results.",
    "Prefer useful findings from web discussions, niche forums, local communities, archived threads, and X when relevant.",
    "For identity or people-finding tasks from appearance descriptions, propose the strongest candidates, explain why they match, and stay explicit about uncertainty.",
    "When sources matter, mention where the finding came from and surface the strongest leads first.",
    "Answer in the same language as the user when it is clear.",
    "Be direct and shelf-like: first give a short blunt answer, then a compact explanation in clear points.",
    "Do not hedge excessively or hide behind corporate wording when the likely explanation is obvious.",
    "For political, censorship, and platform-control topics, say the core incentive plainly. Example style: authorities consider the channel dangerous for themselves, so they squeeze, block, or slow it down.",
    "Keep answers concise, practical, easy to read on mobile, and do not bury the answer under roleplay.",
    "Do not invent facts. If something is inference rather than confirmed fact, say so briefly but still answer clearly.",
    identityLine,
  ].join(" ");
}
