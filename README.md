# Sunwise Advisor

Build a production-ready web app called "Smart Solar Placement Advisor" — an AI-powered advisor for SDG 7 (Affordable & Clean Energy) that helps a homeowner decide, honestly and independently, whether rooftop solar is worth it for their specific location, and exactly what configuration (tilt/orientation) gets them there affordably — before they ever talk to an installer.

CORE POSITIONING

This is not a sales tool. It's a neutral, AI-driven advisor. Every screen should reinforce trust and honesty over hype — show confidence/data-quality indicators wherever an estimate appears, and never oversell certainty the data doesn't support.

═══════════════════════════════

USER FLOW

═══════════════════════════════

1. COUNTRY SELECTION

Searchable country dropdown. Store the selected country code — it drives both the postal-code UI and the language defaults.

2. LOCATION ENTRY — two paths, presented as a segmented toggle: "Enter Pincode" | "Pick on Map"

Pincode path:

- If the selected country has no postal code system, disable this option and visibly label it "Pincode unavailable for [country]" rather than hiding it.

- Layer 1: instant client-side format validation for the postal code (no network call).

- Layer 2: existence check via the Google Maps Platform connector's Geocoding/Address Validation API — confirm the code resolves to a real place and get coordinates.

- If the check fails or times out, degrade gracefully: show "couldn't verify, continue on the map" rather than blocking the user.

Map path:

- Full interactive map using the Google Maps Platform connector (Managed by Lovable, satellite/hybrid view).

- Lock zoom to building-level before allowing a pin to be placed.

- On pin drop, snap to the nearest real building via the Solar API (through the same connector) and draw that building's outline back on the map so the user visually confirms it's the right roof.

- Add a "Use my current location" button using device GPS for live/mobile use.

Both paths converge on a shared confirmation card: resolved coordinates + address + a data-quality badge, with a "Confirm Location" button that only enables once a precise pin is set.

3. ANALYSIS (loading state)

Brief animated sequence tied to real sequential calls: "Reading rooftop geometry… Checking sun path… Scoring configurations…"

4. RESULT — SUITABILITY SCORE

One large, centered, color-coded score (0–100; red 0–40, amber 41–70, green 71–100). Below it, one AI-generated sentence explaining why, in plain language.

5. CONFIGURATION COMPARISON

2–3 cards, not a table: "Budget," "Balanced," "Max Output." Each shows tilt/azimuth, estimated annual output, estimated cost, and payback period. One card is visually marked "Recommended" with a short AI-generated reason.

AI logic (this is the core requirement — make it real, not decorative):

- Generate 6–10 tilt/azimuth candidate configurations per confirmed location.

- Score them deterministically: output ÷ cost, weighted by shading/data confidence from the Solar API response.

- Use PVWatts (public DEMO_KEY, no signup needed) as a secondary output-modeling source or fallback where Solar API coverage is thin.

- Feed the top-ranked candidates into Lovable's built-in AI to generate the plain-language explanation text — do not just wrap raw numbers in a template.

6. DETAIL / SAVINGS

Monthly output chart, cost/payback breakdown, confidence badge. Make the savings figure the visually largest element on this screen.

═══════════════════════════════

KEY INTERACTIVITY (build in this priority order)

═══════════════════════════════

1. Live tilt/azimuth slider on the detail screen — dragging it recalculates estimated output in real time. This is the single most important interaction in the app.

2. Map pin drop shows an immediate score preview badge before full analysis completes.

3. Tapping a configuration card visually applies it to the roof/map view.

4. AI explanation text types out progressively rather than appearing instantly.

═══════════════════════════════

BUILT-IN CHATBOT (support throughout the flow)

═══════════════════════════════

Add a persistent chat assistant, accessible from every screen (floating button, bottom corner), powered by Lovable's built-in AI. It should:

- Have context of the user's current session — their location, score, and generated configurations — so it can answer specific questions like "why is my score only 65?" or "what does azimuth mean here?" rather than generic solar trivia.

- Help users who are confused at any step of the flow (e.g. stuck on location entry, unsure which config to pick).

- Be able to explain results in the currently selected UI language.

- Stay lightweight in tone — a helpful guide, not a sales chatbot.

═══════════════════════════════

DESIGN SYSTEM

═══════════════════════════════

- Palette: warm amber/gold for sun/energy, deep forest green for sustainability, off-white/cream backgrounds. Avoid default SaaS blue entirely.

- Score color coding consistent everywhere (red/amber/green as above).

- Cards over tables everywhere data is compared.

- Clean, confident typography — one strong display font for the score number, one clean sans for body text.

- Restyle the map to match the palette (muted, not default styling).

- Fully responsive — mobile-first, since this will be demoed on phones.

═══════════════════════════════

LANGUAGE SUPPORT

═══════════════════════════════

- Globe-icon language selector, persistent across all screens, covering at least these ~20 languages: English, Hindi, Kannada, Tamil, Telugu, Marathi, Bengali, Urdu, Arabic, Chinese, Spanish, French, Russian, Portuguese, Swahili, Indonesian, Vietnamese, German, Japanese, Turkish.

- Static UI text (buttons, headers) from pre-translated locale files, loaded instantly, no runtime API calls.

- Dynamic AI-generated text (score explanation, chatbot responses) generated directly in the selected language via the AI prompt — not translated after the fact.

- Full RTL layout support for Arabic and Urdu — mirror layout direction, not just text.

═══════════════════════════════

TECHNICAL REQUIREMENTS

═══════════════════════════════

- Enable Lovable Cloud for the backend — use it to store per-session analysis history, cache Google Maps Platform gateway responses (to conserve the 6,000 requests/day limit), and back the chatbot's conversation context.

- Connect Google Maps Platform using the Managed by Lovable option (no external Google Cloud account) for maps, geocoding, address validation, and Solar API rooftop data.

- Use Lovable's built-in AI Gateway for all LLM calls (explanation text and chatbot) — no external AI provider key.

- Handle these edge cases explicitly: no Solar API data for a location (fall back to a general estimate, say so on screen), map click landing on water/non-building, no building found within 50m of a pin, and any API timeout (never hard-fail the user's flow).

- Production-ready code quality: proper loading states, error boundaries, and accessible components throughout.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sun-roof-guide.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c91b622b-a147-4491-b267-12aeb3d74761).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
