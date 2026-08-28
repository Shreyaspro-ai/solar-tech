import { cn } from "@/lib/utils";

/**
 * Country flag rendered as an image (flagcdn) instead of an emoji, so it looks
 * the same on Windows, Android and Linux where flag emoji are not supported.
 */
export function Flag({ code, className }: { code: string; className?: string }) {
  const cc = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/w40/${cc}.png`}
      srcSet={`https://flagcdn.com/w80/${cc}.png 2x`}
      width={28}
      height={21}
      loading="lazy"
      decoding="async"
      alt=""
      aria-hidden
      className={cn("h-5 w-7 shrink-0 rounded-[3px] object-cover ring-1 ring-border", className)}
    />
  );
}
