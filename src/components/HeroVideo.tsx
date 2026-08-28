import heroVideo from "@/assets/hero-solar.mp4.asset.json";

/**
 * Full-bleed background video for the landing hero. Sits behind the hero copy
 * with a scrim so foreground text keeps its contrast in every theme.
 */
export function HeroVideo({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative isolate -mt-10 mb-[-1.5rem] left-1/2 w-screen -translate-x-1/2 overflow-hidden px-4 pb-16 pt-16">
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
