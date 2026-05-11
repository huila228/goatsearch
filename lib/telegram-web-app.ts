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
    const root = document.documentElement;
    const handleVisualViewport = () => {
      if (!webApp) {
        handleBrowserViewport();
        return;
      }

      applyTelegramViewport(webApp);
    };

    const handleBrowserViewport = () => {
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
      const stableHeight = window.innerHeight;

      root.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
      root.style.setProperty(
        '--app-stable-height',
        `${Math.round(stableHeight)}px`
      );
      root.style.setProperty(
        '--app-keyboard-offset',
        `${Math.max(0, Math.round(stableHeight - viewportHeight))}px`
      );
    };

    if (!webApp) {
      handleBrowserViewport();
      window.visualViewport?.addEventListener('resize', handleBrowserViewport);
      window.addEventListener('resize', handleBrowserViewport);

      return () => {
        window.visualViewport?.removeEventListener(
          'resize',
          handleBrowserViewport
        );
        window.removeEventListener('resize', handleBrowserViewport);
      };
    }

    webApp.ready();
    webApp.expand();

    try {
      webApp.disableVerticalSwipes?.();
    } catch {
      // Older Telegram clients may not support this.
    }

    const syncTheme = () => applyTelegramTheme(webApp);
    const syncViewport = () => applyTelegramViewport(webApp);

    syncTheme();
    syncViewport();

    webApp.onEvent('themeChanged', syncTheme);
    webApp.onEvent('viewportChanged', syncViewport);
    webApp.onEvent('safeAreaChanged', syncViewport);
    webApp.onEvent('contentSafeAreaChanged', syncViewport);
    window.visualViewport?.addEventListener('resize', handleVisualViewport);

    return () => {
      webApp.offEvent?.('themeChanged', syncTheme);
      webApp.offEvent?.('viewportChanged', syncViewport);
      webApp.offEvent?.('safeAreaChanged', syncViewport);
      webApp.offEvent?.('contentSafeAreaChanged', syncViewport);
      window.visualViewport?.removeEventListener(
        'resize',
        handleVisualViewport
      );
    };
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
    webApp.setBottomBarColor?.(theme.secondary_bg_color || '#101a28');
  } catch {
    // Telegram methods can throw on older clients; visual defaults still work.
  }
}

function applyTelegramViewport(webApp: TelegramWebApp) {
  const root = document.documentElement;
  const telegramViewportHeight =
    webApp.viewportHeight && Number.isFinite(webApp.viewportHeight)
      ? webApp.viewportHeight
      : null;
  const browserViewportHeight =
    window.visualViewport?.height ?? window.innerHeight;
  const viewportHeight =
    telegramViewportHeight != null
      ? Math.min(telegramViewportHeight, browserViewportHeight)
      : browserViewportHeight;
  const stableHeight =
    webApp.viewportStableHeight && Number.isFinite(webApp.viewportStableHeight)
      ? Math.max(webApp.viewportStableHeight, window.innerHeight)
      : window.innerHeight;

  const safeInset = webApp.contentSafeAreaInset;

  setCssVar(root, '--app-height', `${Math.round(viewportHeight)}px`);
  setCssVar(root, '--app-stable-height', `${Math.round(stableHeight)}px`);
  setCssVar(
    root,
    '--app-keyboard-offset',
    `${Math.max(0, Math.round(stableHeight - viewportHeight))}px`
  );
  setCssVar(root, '--app-safe-top', `${Math.round(safeInset?.top ?? 0)}px`);
  setCssVar(root, '--app-safe-right', `${Math.round(safeInset?.right ?? 0)}px`);
  setCssVar(
    root,
    '--app-safe-bottom',
    `${Math.round(safeInset?.bottom ?? 0)}px`
  );
  setCssVar(root, '--app-safe-left', `${Math.round(safeInset?.left ?? 0)}px`);
}

function setCssVar(root: HTMLElement, name: string, value: string) {
  root.style.setProperty(name, value);
}
