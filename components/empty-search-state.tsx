import { cn } from "@/lib/utils";
import Image from "next/image";

export const EmptySearchState = ({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) => {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col pb-4 transition-all duration-300 ease-out",
        compact ? "pt-3" : undefined,
      )}
    >
      <div
        className={cn(
          "flex px-8 transition-all duration-300 ease-out",
          compact
            ? "flex-none items-start justify-center pb-4 pt-1"
            : "flex-1 items-center justify-center",
        )}
      >
        <div
          className={cn(
            "flex max-w-[420px] flex-col items-center text-center transition-all duration-300 ease-out",
            compact ? "scale-[0.72] opacity-45 sm:scale-[0.76]" : undefined,
          )}
        >
          <div className="pointer-events-none select-none opacity-[0.62] [filter:brightness(1.08)_contrast(1.04)_drop-shadow(0_0_24px_rgba(255,255,255,0.14))]">
            <Image
              src="/goat-icon.png"
              alt=""
              width={260}
              height={260}
              className="h-auto w-[220px] rounded-full sm:w-[260px]"
            />
          </div>

          <div
            className={cn(
              "mt-5 space-y-2 text-balance transition-opacity duration-200",
              compact ? "opacity-55" : undefined,
            )}
          >
            <p className="text-[14px] leading-6 text-white/62 sm:text-[15px]">
              Мы не храним ваши диалоги.
            </p>
            <p className="text-[13px] leading-5 text-white/38 sm:text-[14px]">
              Goat Search всего лишь поисковик и не несет ответственности за
              использование найденной информации.
            </p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "w-full transition-all duration-300 ease-out",
          compact ? "mt-auto pb-2" : undefined,
        )}
      >
        {children}
      </div>
    </div>
  );
};
