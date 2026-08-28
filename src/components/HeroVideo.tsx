import heroVideo from "@/assets/hero-solar.mp4.asset.json";

/**
 * Full-bleed background video for the landing hero. Sits behind the hero copy
 * with a scrim so foreground text keeps its contrast in every theme.
 */
export function HeroVideo({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative isolate -mx-4 -mt-10 overflow-hidden px-4 pb-14 pt-16 sm:-mx-6 sm:px-6 lg:-mx-[calc((100vw-64rem)/2)] lg:px-[calc((100vw-64rem)/2)]">
      <video
        className="hero-video-el absolute inset-0 -z-20 size-full object-cover"
        src={heroVideo.url}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
        tabIndex={-1}
      />
      <div className="absolute inset-0 -z-10 hero-video-scrim" aria-hidden />
      <div className="relative mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}
