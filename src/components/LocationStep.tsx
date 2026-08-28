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

  const [approx, setApprox] = useState(false);

  const verifyMutation = useMutation({
    mutationFn: (code: string) => verify({ data: { countryCode: country.code, postalCode: code } }),
    onSuccess: (res) => {
      if (!res.verified) {
        setFormatError(
          res.reason === "imprecise"
            ? t("imprecise")
            : res.reason === "not_found"
              ? t("notFound")
              : t("unverified"),
        );
        setPin(null);
        return;
      }
      setFormatError(null);
      const coords = { lat: res.lat, lng: res.lng };
      setApprox(res.precision !== "rooftop");
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
        <TabsList className="mx-auto grid w-full max-w-md grid-cols-2 border border-white/15 bg-[oklch(0.2_0.025_60/0.6)] text-white/70 backdrop-blur-md">
          <TabsTrigger value="pincode" disabled={!country.postal} className="data-[state=active]:bg-white/90 data-[state=active]:text-[oklch(0.24_0.03_60)]">
            {t("tabPincode")}
          </TabsTrigger>
          <TabsTrigger value="map" className="data-[state=active]:bg-white/90 data-[state=active]:text-[oklch(0.24_0.03_60)]">{t("tabMap")}</TabsTrigger>
        </TabsList>

        <TabsContent value="pincode" className="mt-5">
          <div className="surface-panel mx-auto max-w-xl p-6">
          {country.postal ? (
            <form onSubmit={submitPostal} className="mx-auto max-w-md space-y-3">
              <label htmlFor="postal" className="block text-sm font-medium on-media">
                {t("pincodeLabel")}
              </label>
              <div className="flex gap-2">
                <Input
                  className="border-white/25 bg-white/95 text-[oklch(0.2_0.02_60)] placeholder:text-[oklch(0.5_0.02_60)]"
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
              <p className="text-xs on-media-muted">
                {t("pincodeHint", { example: country.postalExample ?? "—" })}
              </p>
              {formatError ? (
                <p className="text-sm font-medium text-[oklch(0.82_0.16_35)]">
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
            <p className="text-center text-sm on-media-muted">
              {t("pincodeUnavailable", { country: country.name })}
            </p>
          )}
          </div>
        </TabsContent>

        <TabsContent value="map" className="mt-5">
          <div className="surface-panel p-3 sm:p-4">
          <MapPicker
            center={center}
            pin={pin}
            onPin={(coords) => setPin(coords)}
            preview={preview}
            previewLoading={previewMutation.isPending}
            previewError={previewError}
          />
          </div>
        </TabsContent>
      </Tabs>

      {pin ? (
        <div className="surface-panel animate-fade-up p-5">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold on-media">
            <MapPinned className="size-4 text-sun" aria-hidden />
            {t("confirmTitle")}
          </h3>
          <dl className="space-y-1.5 text-sm on-media">
            {address ? (
              <div className="flex gap-2">
                <dt className="on-media-muted">{t("addressLabel")}:</dt>
                <dd className="font-medium">{address}</dd>
              </div>
            ) : null}
            <div className="flex gap-2">
              <dt className="on-media-muted">{t("coordsLabel")}:</dt>
              <dd className="font-mono text-xs">
                {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
              </dd>
            </div>
          </dl>
          {approx ? (
            <p className="mt-3 rounded-lg border border-[oklch(0.75_0.15_70/0.5)] bg-[oklch(0.75_0.15_70/0.15)] p-3 text-xs on-media">
              {t("approxWarn")}{" "}
              <button type="button" className="underline underline-offset-2" onClick={() => setTab("map")}>
                {t("tabMap")}
              </button>
            </p>
          ) : null}
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
