'use client';

import { useEffect } from 'react';

import type { TelegramWebApp } from '@/types/telegram';

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.Telegram?.WebApp ?? null;
}

export function useTelegramThemeSync() {
  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp) {
      return;
    }

    webApp.ready();
    webApp.expand();

    applyTelegramTheme(webApp);
    webApp.onEvent('themeChanged', () => applyTelegramTheme(webApp));
  }, []);
}

function applyTelegramTheme(webApp: TelegramWebApp) {
  const root = document.documentElement;
  const theme = webApp.themeParams;

  root.dataset.colorScheme = webApp.colorScheme || 'dark';
  root.classList.toggle('dark', webApp.colorScheme !== 'light');

  setCssVar(root, '--tg-bg-color', theme.bg_color || '#0e1621');
  setCssVar(
    root,
    '--tg-secondary-bg-color',
    theme.secondary_bg_color || '#101a28'
  );
  setCssVar(root, '--tg-text-color', theme.text_color || '#f4f7fb');
  setCssVar(root, '--tg-hint-color', theme.hint_color || '#91a1b6');
  setCssVar(root, '--tg-link-color', theme.link_color || '#6ab8ff');
  setCssVar(root, '--tg-button-color', theme.button_color || '#2ea6ff');
  setCssVar(
    root,
    '--tg-button-text-color',
    theme.button_text_color || '#03131d'
  );
  setCssVar(
    root,
    '--tg-accent-text-color',
    theme.accent_text_color || '#86d5ff'
  );
  setCssVar(root, '--background', theme.bg_color || '#0e1621');
  setCssVar(root, '--foreground', theme.text_color || '#f4f7fb');
  setCssVar(root, '--secondary', theme.secondary_bg_color || '#101a28');
  setCssVar(root, '--muted-foreground', theme.hint_color || '#91a1b6');
  setCssVar(root, '--primary', theme.button_color || '#2ea6ff');
  setCssVar(
    root,
    '--primary-foreground',
    theme.button_text_color || '#03131d'
  );

  try {
    webApp.setHeaderColor('secondary_bg_color');
    webApp.setBackgroundColor('bg_color');
  } catch {
    // Telegram methods can throw on older clients; visual defaults still work.
  }
}

function setCssVar(root: HTMLElement, name: string, value: string) {
  root.style.setProperty(name, value);
}
