import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send, X, Loader2 } from "lucide-react";
import botAsset from "@/assets/solar-bot.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAssistant } from "@/lib/advisor.functions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatWidget({ sessionId, context }: { sessionId: string | null; context: string }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const ask = useServerFn(askAssistant);

  const mutation = useMutation({
    mutationFn: (message: string) => ask({ data: { sessionId, message, language: lang, context } }),
    onSuccess: (res) => setMessages((m) => [...m, { role: "assistant", content: res.reply }]),
    onError: () => setMessages((m) => [...m, { role: "assistant", content: t("errorBody") }]),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mutation.isPending, open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || mutation.isPending) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    mutation.mutate(text);
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 end-5 z-40 size-16 overflow-hidden rounded-full border border-white/40 bg-white p-0 shadow-lift transition hover:scale-105 hover:bg-white"
        aria-label={open ? t("chatClose") : t("chatOpen")}
      >
        {open ? (
          <X className="size-6 text-foreground" />
        ) : (
          <img src={botAsset.url} alt="" className="size-full object-contain p-1" />
        )}
      </Button>

      {open ? (
        <div className="fixed bottom-24 end-5 z-40 flex h-[26rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lift">
          <header className="flex items-center gap-2 border-b border-border bg-secondary/60 px-4 py-3">
            <img
              src={botAsset.url}
              alt=""
              className="size-8 rounded-full bg-white object-contain p-0.5 shadow-soft"
            />
            <div className="min-w-0">
              <h2 className="font-brand text-[11px] uppercase text-muted-foreground">Solar Tech</h2>
              <p className="truncate text-sm font-semibold">{t("chatTitle")}</p>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            <p className="rounded-2xl rounded-ss-sm bg-secondary px-3 py-2 text-sm">{t("chatGreeting")}</p>
            {messages.map((m, i) => (
              <p
                key={i}
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap px-3 py-2 text-sm",
                  m.role === "user"
                    ? "ms-auto rounded-2xl rounded-ee-sm bg-forest text-forest-foreground"
                    : "rounded-2xl rounded-ss-sm bg-secondary",
                )}
              >
                {m.content}
              </p>
            ))}
            {mutation.isPending ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> {t("loading")}
              </p>
            ) : null}
          </div>

          <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chatPlaceholder")}
              aria-label={t("chatPlaceholder")}
              maxLength={1000}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || mutation.isPending} aria-label={t("send")}>
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      ) : null}
    </>
  );
}
