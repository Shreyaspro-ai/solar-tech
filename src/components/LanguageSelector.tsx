import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LANGUAGES, type LangCode } from "@/lib/locales";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function LanguageSelector() {
  const { lang, setLang, t } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 rounded-full border border-border bg-card/70">
          <Globe className="size-4" aria-hidden />
          <span className="text-xs font-medium">{current?.native ?? "English"}</span>
          <span className="sr-only">{t("languageLabel")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-52 overflow-y-auto">
        <DropdownMenuLabel>{t("languageLabel")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => setLang(l.code as LangCode)}
            className={l.code === lang ? "bg-accent/60 font-medium" : ""}
          >
            <span className="flex-1">{l.native}</span>
            <span className="text-xs text-muted-foreground">{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
