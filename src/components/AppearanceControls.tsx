import { Clapperboard, Contrast, Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppearance } from "@/lib/appearance";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AppearanceControls() {
  const { t } = useI18n();
  const {
    theme, setTheme, intensity, setIntensity, colorBlind, setColorBlind,
    backdrop, setBackdrop,
  } = useAppearance();

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        aria-label={t("themeLabel")}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={cn("rounded-full", backdrop === "classic" && "bg-white/20 ring-1 ring-white/60")}
        aria-label={backdrop === "cinematic" ? "Switch to classic design" : "Switch to cinematic video design"}
        aria-pressed={backdrop === "classic"}
        title={backdrop === "cinematic" ? "Classic design" : "Cinematic video design"}
        onClick={() => setBackdrop(backdrop === "cinematic" ? "classic" : "cinematic")}
      >
        <Clapperboard className="size-4" aria-hidden />
      </Button>


      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("displaySettings")}>
            <Palette className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>{t("paletteLabel")}</DropdownMenuLabel>
          {(["vibrant", "calm"] as const).map((v) => (
            <DropdownMenuItem
              key={v}
              onSelect={() => setIntensity(v)}
              className={cn("justify-between", intensity === v && "font-semibold")}
            >
              {v === "vibrant" ? t("paletteVibrant") : t("paletteCalm")}
              {intensity === v ? <span aria-hidden>✓</span> : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("cbLabel")}</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setColorBlind(!colorBlind);
            }}
            className="items-start gap-2"
          >
            <Contrast className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="flex-1">
              <span className={cn("block text-sm", colorBlind && "font-semibold")}>
                {colorBlind ? "On" : "Off"}
              </span>
              <span className="block text-xs text-muted-foreground">{t("cbHint")}</span>
            </span>
            {colorBlind ? <span aria-hidden>✓</span> : null}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
