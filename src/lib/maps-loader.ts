export type MapsNS = typeof globalThis & { google?: any };

let loaderPromise: Promise<void> | null = null;

/** Loads the Google Maps JS SDK once for the whole app. */
export function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as MapsNS;
  if (w.google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as string | undefined;
  const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as string | undefined;
  loaderPromise = new Promise<void>((resolve, reject) => {
    if (!key) {
      reject(new Error("Maps key missing"));
      return;
    }
    (window as any).__ssaInitMap = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__ssaInitMap${
      channel ? `&channel=${channel}` : ""
    }`;
    s.async = true;
    s.onerror = () => reject(new Error("Maps failed to load"));
    document.head.appendChild(s);
  });
  return loaderPromise;
}
