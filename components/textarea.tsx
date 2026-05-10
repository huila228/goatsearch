import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

const animatedQueries = [
  "Сколько варить рис",
  "Какая актриса в фулле 18+ клэш рояль из тиктока",
  "Как обойти белые списки",
  "мем бурмолдим за гаражами",
];

interface InputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
  landing?: boolean;
  status: string;
  stop: () => void;
}

export const Textarea = ({
  input,
  handleInputChange,
  isLoading,
  landing = false,
  status,
  stop,
}: InputProps) => {
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState("");
  const [animatedQueryIndex, setAnimatedQueryIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!landing || input.trim().length > 0 || isFocused) {
      return;
    }

    const currentQuery = animatedQueries[animatedQueryIndex];
    const isPhraseComplete = animatedPlaceholder === currentQuery;
    const isPhraseEmpty = animatedPlaceholder.length === 0;

    const timeout = window.setTimeout(() => {
      if (isDeleting) {
        if (isPhraseEmpty) {
          setIsDeleting(false);
          setAnimatedQueryIndex((currentIndex) =>
            (currentIndex + 1) % animatedQueries.length,
          );
          return;
        }

        setAnimatedPlaceholder(currentQuery.slice(0, -1 + animatedPlaceholder.length));
        return;
      }

      if (isPhraseComplete) {
        setIsDeleting(true);
        return;
      }

      setAnimatedPlaceholder(
        currentQuery.slice(0, animatedPlaceholder.length + 1),
      );
    }, isDeleting ? 28 : isPhraseComplete ? 1300 : 68);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [animatedPlaceholder, animatedQueryIndex, input, isDeleting, isFocused, landing]);

  if (landing) {
    return (
      <div className="relative w-full rounded-[30px] border border-white/10 bg-[#121212] px-5 pt-5 pb-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_-10px_40px_rgba(0,0,0,0.45)]">
        {input.trim().length === 0 && !isFocused ? (
          <div className="pointer-events-none absolute top-5 left-5 right-5 text-[17px] leading-7 text-white/40">
            {animatedPlaceholder}
            <span className="ml-0.5 inline-block h-[1.1em] w-px animate-pulse bg-white/55 align-middle" />
          </div>
        ) : null}
        <ShadcnTextarea
          className="min-h-[56px] resize-none border-0 bg-transparent px-0 py-0 text-[17px] leading-7 text-white shadow-none placeholder:text-white/40 focus-visible:border-0 focus-visible:bg-transparent focus-visible:ring-0"
          value={input}
          autoFocus
          rows={1}
          placeholder=""
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (input.trim() && !isLoading) {
                const form = e.currentTarget.closest("form");
                if (form) form.requestSubmit();
              }
            }
          }}
        />

        <div className="mt-4 flex items-center justify-end gap-3">
          {status === "streaming" || status === "submitted" ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-full bg-white px-5 py-2.5 text-[15px] font-medium text-black transition-colors hover:bg-white/90"
            >
              Стоп
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-full bg-white px-5 py-2.5 text-[15px] font-medium text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/30"
            >
              Искать
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full pt-1">
      <ShadcnTextarea
        className="min-h-[96px] w-full resize-none rounded-[28px] border border-white/10 bg-[#121212] pr-16 pt-4 pb-4 text-[15px] leading-6 text-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] placeholder:text-white/40 transition-colors focus-visible:border-white/15 focus-visible:bg-[#151515] focus-visible:ring-0"
        value={input}
        autoFocus
        rows={3}
        placeholder={"Спрашивай что угодно"}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() && !isLoading) {
              const form = e.currentTarget.closest("form");
              if (form) form.requestSubmit();
            }
          }
        }}
      />

      {status === "streaming" || status === "submitted" ? (
        <button
          type="button"
          onClick={stop}
          className="absolute right-3 bottom-3 cursor-pointer rounded-full bg-white px-4 py-2 text-[14px] font-medium text-black transition-colors hover:bg-white/90"
        >
          Стоп
        </button>
      ) : (
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="absolute right-3 bottom-3 rounded-full bg-white px-4 py-2 text-[14px] font-medium text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/30"
        >
          <ArrowUp className="h-4 w-4 text-current" />
        </button>
      )}
    </div>
  );
};
