import homeVideo from "@/assets/hero-solar.mp4.asset.json";
import locationVideo from "@/assets/location-bg.mp4.asset.json";

const SOURCES = {
  home: homeVideo.url,
  location: locationVideo.url,
} as const;

/**
 * Fixed, full-page background video. It sits behind all page content with a
 * scrim so text and cards keep their contrast.
 */
export function HeroVideo({ variant = "home" }: { variant?: keyof typeof SOURCES }) {
  const src = SOURCES[variant];
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <video
        key={src}
        className="hero-video-el size-full object-cover"
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        tabIndex={-1}
      />
      <div className="absolute inset-0 hero-video-scrim" />
    </div>
  );
}
