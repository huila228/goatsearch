import Image from "next/image";

export const EmptySearchState = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex flex-1 flex-col pb-4">
      <div className="flex flex-1 items-center justify-center px-8">
        <div className="flex max-w-[420px] flex-col items-center text-center">
          <div className="pointer-events-none select-none opacity-[0.62] [filter:brightness(1.08)_contrast(1.04)_drop-shadow(0_0_24px_rgba(255,255,255,0.14))]">
            <Image
              src="/goat-icon.png"
              alt=""
              width={260}
              height={260}
              className="h-auto w-[220px] rounded-full sm:w-[260px]"
            />
          </div>

          <div className="mt-5 space-y-2 text-balance">
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

      <div className="w-full">{children}</div>
    </div>
  );
};
