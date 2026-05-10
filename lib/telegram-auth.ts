import { createHmac, timingSafeEqual } from 'node:crypto';

import type { TelegramUser } from '@/types/telegram';

type TelegramSession = {
  source: 'telegram' | 'development';
  user: TelegramUser | null;
};

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24;

export function getTelegramSession(initDataRaw?: string): TelegramSession {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!initDataRaw) {
    if (nodeEnv !== 'production') {
      return {
        source: 'development',
        user: null
      };
    }

    throw new Error('Missing Telegram initData.');
  }

  if (!botToken) {
    if (nodeEnv !== 'production') {
      return {
        source: 'development',
        user: null
      };
    }

    throw new Error('Missing TELEGRAM_BOT_TOKEN.');
  }

  validateTelegramInitData(initDataRaw, botToken);

  const params = new URLSearchParams(initDataRaw);
  const rawUser = params.get('user');

  return {
    source: 'telegram',
    user: rawUser ? (JSON.parse(rawUser) as TelegramUser) : null
  };
}

function validateTelegramInitData(initDataRaw: string, botToken: string) {
  const params = new URLSearchParams(initDataRaw);
  const receivedHash = params.get('hash');

  if (!receivedHash) {
    throw new Error('Telegram initData hash is missing.');
  }

  const authDate = Number(params.get('auth_date'));
  const maxAgeSeconds = Number(
    process.env.TELEGRAM_INIT_MAX_AGE_SEC ?? DEFAULT_MAX_AGE_SECONDS
  );

  if (!Number.isFinite(authDate)) {
    throw new Error('Telegram initData auth_date is invalid.');
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (ageSeconds > maxAgeSeconds) {
    throw new Error('Telegram initData is too old.');
  }

  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const generatedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const receivedBuffer = Buffer.from(receivedHash, 'hex');
  const generatedBuffer = Buffer.from(generatedHash, 'hex');

  if (
    receivedBuffer.length !== generatedBuffer.length ||
    !timingSafeEqual(receivedBuffer, generatedBuffer)
  ) {
    throw new Error('Telegram initData validation failed.');
  }
}
