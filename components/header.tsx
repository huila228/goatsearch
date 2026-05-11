import { List } from "lucide-react";

export const Header = ({
  onOpenHistory,
  historyOpen = false,
  telegramUserName,
}: {
  onOpenHistory?: () => void;
  historyOpen?: boolean;
  telegramUserName?: string;
}) => {
  void telegramUserName;

  return (
    <div className="pointer-events-none absolute top-0 right-0 left-0 z-30 overflow-hidden border-b border-white/10 bg-white/[0.035] [backdrop-filter:blur(24px)_saturate(180%)]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.045)_26%,rgba(255,255,255,0.015)_62%,rgba(255,255,255,0.005)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/12" />
      <div className="pointer-events-auto relative mx-auto flex h-[68px] w-full max-w-4xl items-center justify-between px-4 sm:h-[70px] sm:px-5">
        <div className="text-[18px] leading-none font-medium tracking-tight text-white/96">
          Goat Search
        </div>

        <button
          type="button"
          aria-label="История диалогов"
          onClick={onOpenHistory}
          className="flex size-11 items-center justify-center rounded-full border border-white/14 bg-white/[0.055] text-white/78 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-colors hover:bg-white/[0.11] hover:text-white"
        >
          <List className={historyOpen ? "size-[18px] text-white" : "size-[18px]"} />
        </button>
      </div>
    </div>
  );
};
