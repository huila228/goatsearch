import type { UIMessage } from "ai";

const smallTalkPatterns = [
  /^(?:ну\s+)?(?:привет|хай|хеллоу|hello|hi|hey|йо|ку|здарова|здорово|салам)(?:[\s,!?.]+(?:как\s+дела|как\s+жизнь|как\s+сам|че\s+как|чо\s+как|как\s+оно|что\s+делаешь|чем\s+занимаешься))?[!?.\s]*$/i,
  /^(?:как\s+дела|как\s+жизнь|как\s+сам|че\s+как|чо\s+как|как\s+оно|как\s+ты|что\s+делаешь|чо\s+делаешь|чем\s+занимаешься|как\s+настроение)[!?.\s]*$/i,
  /^(?:кто\s+ты|ты\s+кто|что\s+ты\s+умеешь|что\s+умеешь|ты\s+живой|живой\s+ли\s+ты)[!?.\s]*$/i,
  /^(?:спасибо|благодарю|спс|ок|окей|оке|понял|понятно|ясно|ладно|норм|ага|угу|пока|до\s+связи|увидимся|доброе\s+утро|добрый\s+день|добрый\s+вечер|спокойной\s+ночи)[!?.\s]*$/i,
  /^(?:расскажи\s+(?:шутку|анекдот)|пошути(?:-ка)?)[!?.\s]*$/i,
];

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function getLastUserText(messages: UIMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role !== "user") {
      continue;
    }

    return message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ")
      .trim() ?? "";
  }

  return "";
}

export function isSearchIntentText(text: string) {
  const normalized = normalizeText(text);

  if (normalized.length === 0) {
    return false;
  }

  return !smallTalkPatterns.some((pattern) => pattern.test(normalized));
}
