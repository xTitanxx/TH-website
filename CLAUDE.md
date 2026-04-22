# Casa Indigo & Studio Indigo — project brief

This file is the standing brief for any Claude session working in this repo. Read it before making changes.

## 1. Project

A small, design-led static website for a townhouse on a pedestrianised street in the new part of **Aljezur** (Algarve, south-west Portugal). The building holds three things under one roof:

- **Casa Indigo** — the upper two floors. A 3-bedroom apartment, recently renovated, with abundant natural light, 4 balconies (two per floor, one facing each direction), a fully equipped modern kitchen, two living spaces, three full bathrooms and one half bath. Spread over two floors — stairs throughout.
- **Studio Indigo** — a ground-floor studio, recently renovated, with a bathroom (sliding door), small kitchen and a bed. Self-contained and **step-free**: accessible from the street with no stairs.
- **Valerie's shop** — also on the ground floor. Valerie makes and sells handmade textiles alongside curated vintage finds.

Both rental spaces are put together with meticulous attention to detail, layered with handmade textiles and vintage pieces. The interiors carry Valerie's eye throughout — the site should communicate that quietly rather than stating it.

**Positioning.** The aspiration is to be listed on **iEscape** in the future; the site should already feel that way: editorial, photography-forward, understated. Not a booking portal, not a hard sell.

**Voice.** Warm, sensory, short sentences. Let photography carry the weight. No marketing superlatives, no emoji, no "nestled in the heart of…" clichés. Never describe the place as "like an interior design magazine" even though it could be — show, don't claim.

## 2. Stack & hosting

- **Framework**: [Astro](https://astro.build) with static output (`output: 'static'`).
- **Styling**: Tailwind CSS via the official Astro integration.
- **Images**: Astro's built-in `<Image>` / `<Picture>` components for AVIF/WebP + responsive `srcset`.
- **Package manager**: `npm` (committed lockfile).
- **Node version**: pinned in `.nvmrc` (Node 22 LTS or later).
- **Hosting**: **GitHub Pages** via GitHub Actions (`actions/deploy-pages@v4` + `actions/upload-pages-artifact@v3`). Build on push to `main`, deploy the `dist/` artifact.
- **Why Astro?** GitHub Pages needs static output; Astro gives us component reuse, proper i18n routing, and image optimization without shipping a JS framework to the browser.

## 3. Site structure

Single landing page, anchor-linked sections, in this order:

1. **Hero** — one striking photograph, wordmark, one-line tagline, language switcher, anchor nav.
2. **The House** — the building itself, the street, the three spaces at a glance.
3. **Casa Indigo** — rooms, balconies, kitchen, light, layout. Short gallery. Mention the two-floor layout naturally (stairs) — informational, not apologetic.
4. **Studio Indigo** — the ground-floor studio as a self-contained retreat. Lead with **step-free access** and the sliding bathroom door — a real feature, not a footnote. It makes Studio Indigo the right choice for guests who can't manage stairs.
5. **Valerie's Shop** — what she makes and curates, opening hours, a few product shots.
6. **Aljezur & Surroundings** — the village (old town across the river, castle, Saturday market), nature (Costa Vicentina, Rota Vicentina trails), beaches (Arrifana, Amoreira, Monte Clérigo, Bordeira), restaurants, nearby towns (Lagos ~45 min, Sagres, Odeceixe), surf, flora in spring.
7. **Location** — static AI-generated illustrative map of Aljezur with a pin on the house, followed by explicit deep links to **Google Maps** and **Apple Maps**. Short "how to get here" block (Faro airport ~1h30 by car, Lisbon ~3h).
8. **Contact / Enquire** — Formspree form (name, email, phone, dates optional, message) + prominent **WhatsApp** click-to-chat button + `mailto:` fallback.
9. **Footer** — AL registration number, privacy link, social links, copyright.

No secondary pages for the MVP; the privacy notice can live at `/privacy/` as the only other route.

## 4. Languages & routing

Supported locales: **English (default), Portuguese, French, German, Spanish**.

- Routes: `/` (EN), `/pt/`, `/fr/`, `/de/`, `/es/`.
- Configure Astro's built-in i18n (`i18n: { defaultLocale: 'en', locales: ['en','pt','fr','de','es'] }`).
- Copy lives in locale-scoped Markdown under `src/content/sections/<locale>/*.md` using Astro Content Collections (schema in `src/content.config.ts`). One file per section. **No hard-coded copy in `.astro` components** — the homepage (`src/pages/index.astro`) reads each section via `getEntry()` and renders body + images.
- Language switcher in the header; preserves the current section anchor when switching.
- `<html lang="…">`, `hreflang` alternates, and per-locale OG metadata must be set on every page.

## 5. Contact & booking

- **Form backend**: [Formspree](https://formspree.io). Endpoint stored in `PUBLIC_FORMSPREE_ENDPOINT` (env var, committed `.env.example`, real value only in local `.env` and the deploy action's secrets).
- **Fields**: name, email, phone, optional dates, message. Honeypot field + Formspree spam filtering. Client-side validation is progressive enhancement only — the form must work without JS.
- **WhatsApp**: `https://wa.me/<international-number>?text=<prefilled-enquiry>` button next to the form. Number lives in a single config file, not sprinkled through templates.
- **Email fallback**: `mailto:` link alongside WhatsApp.
- **Payments**: not in scope for MVP. Roadmap: Stripe Payment Links once pricing model is decided — can be dropped in without touching the rest of the site.

## 6. Map

- Store the AI-generated illustrative map as SVG (preferred) or high-resolution PNG at `public/map/aljezur.<ext>`. Include a 2× version for retina if PNG.
- Beneath the map, two text links: **Open in Google Maps** (`https://maps.google.com/?q=<lat>,<lng>`) and **Open in Apple Maps** (`https://maps.apple.com/?ll=<lat>,<lng>&q=Casa+Indigo`).
- Do not embed an iframe map — it hurts performance, privacy, and the editorial feel.

## 7. Photography & assets

- Section images live in `public/images/<section>/` (e.g. `casa-indigo/01-living.jpg`). Filenames are referenced from each section's markdown frontmatter `images:` list.
- CMS uploads go to `public/images/uploads/` (configured in `public/admin/config.yml`).
- `src/components/PlaceholderImage.astro` checks at build time whether the referenced file exists. If not, it renders a labelled dashed box showing the expected path, so the owner can see exactly what to drop in. As soon as a real file lands at that path, the placeholder disappears.
- `alt` text is mandatory and descriptive; decorative images use `alt=""` with `role="presentation"`.
- Favicon set + a single 1200×630 OG share image must exist before launch.

## 8. Content conventions

- One Markdown file per section per locale under `src/content/sections/<locale>/`.
- Frontmatter schema (see `src/content.config.ts`): `title` (required), `eyebrow`, `tagline` (hero only), `images: [{ src, alt, caption }]`, `gmaps`/`amaps` (location only).
- Copy is sensory and short — prefer one good sentence to three adequate ones.
- Drafts exist in all five locales (EN, PT, FR, DE, ES). Translations were produced in one pass and **should be reviewed by a native speaker before launch** — flagged in CLAUDE.md because drifting / stale translations are a quiet failure mode.
- `src/pages/index.astro` and `src/pages/[locale]/index.astro` both delegate to `src/components/Homepage.astro`, which loads all 8 sections from `src/content/sections/<locale>/*.md`. Adding a new locale = add the folder + update `src/i18n/ui.ts`.
- Numbers, dates, phone format: locale-appropriate.

## 8b. Admin UI (Decap CMS at `/admin`)

- `src/pages/admin/index.astro` loads Decap CMS from a CDN; the schema is in `public/admin/config.yml`.
- **Local editing** (works today): `npm run cms` in one terminal + `npm run dev` in another, then visit `http://localhost:4321/admin/`. No login required — edits go straight to the filesystem. Local mode is enabled via `local_backend: true` and only activates when Decap can reach `http://localhost:8081`.
- **Editing on the live site** (optional, one-time setup): requires a tiny OAuth proxy because GitHub's OAuth flow needs a server-side code exchange. Free Cloudflare Worker setup documented in `README.md`. Once the worker is deployed, uncomment `base_url` in `public/admin/config.yml` and set `backend.repo` to `<user>/<repo>`. Until then, editing on the live site won't authenticate.
- CMS-uploaded images go to `public/images/uploads/`. The section-specific placeholder paths (e.g. `public/images/casa-indigo/01-living.jpg`) are just the defaults set in the drafted markdown — when the owner uploads a different image via the CMS, it goes to `uploads/` and the frontmatter `src` updates automatically.

## 9. Design principles

- Editorial whitespace. Generous margins. Photos are the hero.
- Type palette: one serif (headings) + one sans (body). Limit to two weights per family.
- Indigo accent drawn from Valerie's actual palette — confirm with her before locking hex values.
- Mobile-first. Design every section for a narrow viewport first, then let it breathe on desktop.
- **Performance budget**: Lighthouse ≥95 across Performance / Accessibility / Best Practices / SEO on mobile. No analytics, no third-party scripts by default. If something threatens the budget, push back.
- **Accessibility**: WCAG 2.1 AA. Real focus states, semantic landmarks, sufficient contrast, reduced-motion respected.

## 10. Pre-launch checklist

- [ ] AL number in the footer (owner has it — just needs pasting in).
- [ ] `/privacy/` page covering what the contact form collects and where it goes.
- [ ] Accessibility info correctly split: Studio Indigo is step-free; Casa Indigo has stairs.
- [ ] No analytics, no cookies on launch. If analytics are added later, add a consent banner at the same time.
- [ ] Alt text on every meaningful image.
- [ ] **Native-speaker review of the PT / FR / DE / ES drafts** before those locales are shared with guests. Drafts are working copy, not publishable as-is.

## 11. Still needed from the owner (not blockers for scaffolding, just for launch)

1. **AL number** — owner has it, needs pasting into the footer.
2. **Phone number** for WhatsApp + contact block (international format).
3. **Email destination** for Formspree submissions.
4. **Domain** — default is `<user>.github.io`; custom domain if/when the owner wants one.
5. **Photos** — owner will provide.
6. **Logo / wordmark** — owner will provide.
7. **Brand palette** — exact indigo + neutrals to be pulled from Valerie's interior palette.
8. **Reviews** — the owner has existing Airbnb and Booking.com reviews that could be repurposed as a small testimonials block. Ask before going live.

Settled already: **enquiry-only, no calendar** for MVP. **Instagram** feed embed is deferred — no active feed yet; footer link can be added later if/when one exists.

## 12. Roadmap (non-blocking, post-launch)

- Stripe Payment Links for deposits.
- Availability calendar (iCal sync with Airbnb / Booking.com).
- Testimonials block seeded from Airbnb / Booking.com reviews.
- Instagram feed embed once there's an active feed.
- Journal / blog for Aljezur recommendations by season.
- Guest welcome pack (PDF) linked from a confirmation email.

## 13. Local dev

```
npm install
npm run dev        # Astro dev server at http://localhost:4321
npm run cms        # Decap local proxy at http://localhost:8081 (needed for /admin editing)
npm run build      # static build to ./dist
npm run preview    # serve the built site
```

Deploys happen automatically on push to `main` via GitHub Actions. No manual deploy step.

## 14. How to work in this repo (future Claude sessions)

- Prefer small, focused edits; one concern per commit.
- **Never** hard-code user-facing copy in `.astro` components — it goes in the content collection so every locale stays in sync.
- **Always** render photos through `<PlaceholderImage>` (at `src/components/PlaceholderImage.astro`). It already handles the missing-file → placeholder fallback. Don't introduce raw `<img>` tags pointing at un-optimised uploads.
- Respect the Lighthouse budget. If a change threatens it, call it out before merging.
- Ask before adding a new dependency, a third-party script, or anything that sets cookies.
- If a decision is blocked on one of the **Open questions** above, flag it rather than guessing.
- Keep the voice (section 1) — short, sensory, unshowy.
