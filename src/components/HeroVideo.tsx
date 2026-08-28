import heroVideo from "@/assets/hero-solar.mp4.asset.json";

/**
 * Fixed, full-page background video for the landing page. It sits behind all
 * page content with a scrim so text and cards keep their contrast.
 */
export function HeroVideo() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <video
        className="hero-video-el size-full object-cover"
        src={heroVideo.url}
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
