import homeVideo from "@/assets/hero-solar.mp4.asset.json";
import { useAppearance } from "@/lib/appearance";

/**
 * Fixed, full-page background video. It sits behind all page content with a
 * scrim so text and cards keep their contrast. In "classic" backdrop mode it
 * unmounts entirely, revealing the ambient gradient background instead.
 */
export function HeroVideo() {
  const { backdrop } = useAppearance();
  if (backdrop === "classic") return null;
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <video
        className="hero-video-el size-full object-cover"
        src={homeVideo.url}
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
