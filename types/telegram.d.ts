export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
};

export type TelegramThemeParams = {
  bg_color?: string;
  secondary_bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  accent_text_color?: string;
};

export type TelegramInitDataUnsafe = {
  user?: TelegramUser;
  start_param?: string;
};

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe: TelegramInitDataUnsafe;
  version?: string;
  platform?: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  viewportHeight?: number;
  viewportStableHeight?: number;
  isVerticalSwipesEnabled?: boolean;
  contentSafeAreaInset?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes?: () => void;
  enableVerticalSwipes?: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  onEvent: (event: string, callback: (payload?: unknown) => void) => void;
  offEvent?: (event: string, callback: (payload?: unknown) => void) => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export {};
