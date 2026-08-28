import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPicker, type PinPreview } from "./MapPicker";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { getPinPreview, verifyPostalCode } from "@/lib/advisor.functions";
import type { Country } from "@/lib/countries";
import { useI18n } from "@/lib/i18n";

export function LocationStep({
  country,
  onConfirm,
}: {
  country: Country;
  onConfirm: (loc: { lat: number; lng: number; address: string | null }) => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState(country.postal ? "pincode" : "map");
  const [postal, setPostal] = useState("");
  const [formatError, setFormatError] = useState<string | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [preview, setPreview] = useState<PinPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const reqId = useRef(0);

  const verify = useServerFn(verifyPostalCode);
  const previewFn = useServerFn(getPinPreview);

  const verifyMutation = useMutation({
    mutationFn: (code: string) => verify({ data: { countryCode: country.code, postalCode: code } }),
    onSuccess: (res) => {
      if (!res.verified) {
        setFormatError(res.reason === "not_found" ? t("notFound") : t("unverified"));
        return;
      }
      setFormatError(null);
      const coords = { lat: res.lat, lng: res.lng };
      setCenter(coords);
      setAddress(res.address ?? null);
      setPin(coords);
    },
    onError: () => {
      setFormatError(t("unverified"));
    },
  });

  const previewMutation = useMutation({
    mutationFn: (coords: { lat: number; lng: number }) =>
      previewFn({ data: { lat: coords.lat, lng: coords.lng, countryCode: country.code } }),
  });

  // Debounced preview whenever the pin moves.
  useEffect(() => {
    if (!pin) return;
    const id = ++reqId.current;
    setPreviewError(null);
    const timer = window.setTimeout(() => {
      previewMutation
        .mutateAsync(pin)
        .then((res) => {
          if (id === reqId.current) setPreview(res as PinPreview);
        })
        .catch(() => {
          if (id === reqId.current) {
            setPreview(null);
            setPreviewError(t("unverified"));
          }
        });
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.lat, pin?.lng]);

  const submitPostal = (e: React.FormEvent) => {
    e.preventDefault();
    const code = postal.trim();
    if (country.postal && !country.postal.test(code)) {
      setFormatError(t("invalidFormat"));
      return;
    }
    setFormatError(null);
    verifyMutation.mutate(code);
  };

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mx-auto grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pincode" disabled={!country.postal}>
            {t("tabPincode")}
          </TabsTrigger>
          <TabsTrigger value="map">{t("tabMap")}</TabsTrigger>
        </TabsList>

        <TabsContent value="pincode" className="mt-5">
          {country.postal ? (
            <form onSubmit={submitPostal} className="mx-auto max-w-md space-y-3">
              <label htmlFor="postal" className="block text-sm font-medium">
                {t("pincodeLabel")}
              </label>
              <div className="flex gap-2">
                <Input
                  id="postal"
                  value={postal}
                  onChange={(e) => {
                    setPostal(e.target.value);
                    setPin(null);
                    setPreview(null);
                    setFormatError(null);
                  }}
                  placeholder={country.postalExample ?? ""}
                  inputMode="text"
                  autoComplete="postal-code"
                />
                <Button type="submit" disabled={verifyMutation.isPending || postal.trim().length < 2}>
                  {verifyMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("verifyBtn")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("pincodeHint", { example: country.postalExample ?? "—" })}
              </p>
              {formatError ? (
                <p className="text-sm text-destructive">
                  {formatError}{" "}
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => setTab("map")}
                  >
                    {t("tabMap")}
                  </button>
                </p>
              ) : null}
            </form>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              {t("pincodeUnavailable", { country: country.name })}
            </p>
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-5">
          <MapPicker
            center={center}
            pin={pin}
            onPin={(coords) => setPin(coords)}
            preview={preview}
            previewLoading={previewMutation.isPending}
            previewError={previewError}
          />
        </TabsContent>
      </Tabs>

      {pin ? (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <MapPinned className="size-4 text-sun" aria-hidden />
            {t("confirmTitle")}
          </h3>
          <dl className="space-y-1.5 text-sm">
            {address ? (
              <div className="flex gap-2">
                <dt className="text-muted-foreground">{t("addressLabel")}:</dt>
                <dd className="font-medium">{address}</dd>
              </div>
            ) : null}
            <div className="flex gap-2">
              <dt className="text-muted-foreground">{t("coordsLabel")}:</dt>
              <dd className="font-mono text-xs">
                {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {preview ? <ConfidenceBadge quality={preview.dataQuality} /> : null}
            <Button className="ms-auto" onClick={() => onConfirm({ ...pin, address })}>
              {t("confirmBtn")}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
