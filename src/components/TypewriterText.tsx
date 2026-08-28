import { useEffect, useState } from "react";

/** Progressively types out AI-generated text. Respects reduced-motion. */
export function TypewriterText({
  text,
  speed = 18,
  className,
}: {
  text: string;
  speed?: number;
  className?: string;
}) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !text) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed]);

  return (
    <p className={className} aria-live="polite">
      {shown}
      {shown.length < text.length ? <span className="ml-0.5 animate-pulse">▍</span> : null}
    </p>
  );
}
