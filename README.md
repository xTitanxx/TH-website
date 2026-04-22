# Casa & Studio Indigo — website

Static site for a townhouse in Aljezur (Algarve, Portugal). See `CLAUDE.md` for the full project brief.

## Local development

```sh
npm install
npm run dev          # http://localhost:4321
npm run build        # static build → ./dist
npm run preview      # serve the built site
```

## Editing content at `/admin`

The admin is a **mirror of the live homepage** — same layout, same content — with edit affordances that appear when you're signed in:

- **Pencil / click-to-edit** on every title, eyebrow, tagline, image alt, and markdown body.
- **"Replace image"** button on hover over every image — file picker → upload → immediate swap.
- Each save becomes a real commit on `main` authored by you. GitHub Actions rebuilds the site and your change appears live in about a minute.

### One-time setup: your Personal Access Token

The admin talks to the GitHub Contents API directly from the browser. No proxy, no backend — you sign in with a **fine-grained PAT**:

1. Go to <https://github.com/settings/personal-access-tokens/new>
2. **Resource owner**: `xTitanxx`
3. **Repository access**: only `xTitanxx/TH-website`
4. **Permissions → Repository permissions → Contents**: **Read and write**
5. Generate, copy the `github_pat_...` token
6. Visit `/admin/` on the deployed site → click **Unlock editing** → paste the token

The token is stored in your browser's `localStorage` for this origin only. Sign out wipes it.

### Editing flow

- Click a title, eyebrow, or tagline → it becomes editable in place. Press `Enter` to save, `Esc` to cancel.
- Hover over a section body → a pencil button appears in the corner. Click → raw Markdown in a textarea → **Save**.
- Hover over an image → **Replace image** overlay. Click → pick a file → uploads to `public/images/uploads/` and commits.
- Top-right toggle switches the locale you're editing: `EN · PT · FR · DE · ES`.
- A toast confirms every save; a banner shows sign-in state and save status.

## Environment variables

Copy `.env.example` to `.env` and fill in:

- `PUBLIC_FORMSPREE_ENDPOINT` — Formspree form action URL
- `PUBLIC_WHATSAPP_NUMBER` — digits only, international format (e.g. `351912345678`)
- `PUBLIC_CONTACT_EMAIL` — owner email for the mailto fallback

For CI, set these as GitHub Actions secrets / variables (see `.github/workflows/deploy.yml`).

## Deployment

Push to `main` and GitHub Actions builds and deploys to GitHub Pages.

- Repo: <https://github.com/xTitanxx/TH-website>
- Live site: <https://xtitanxx.github.io/TH-website/>
- Admin: <https://xtitanxx.github.io/TH-website/admin/>

`BASE_PATH` is set as a repo variable to `/TH-website/` so Astro emits the correct asset URLs on GitHub Pages.

## Repo layout

```
src/
  content/sections/{en,pt,fr,de,es}/    markdown source for every page section
  content.config.ts                     schema for the content collection
  components/
    Homepage.astro                      composes the 8 sections; accepts edit prop
    EditableText/Markdown/Image.astro   wrap fields with data-attributes used by the admin JS
    AdminBar.astro                      top bar rendered only in edit mode
    PlaceholderImage / Gallery / Section / ContactForm / Header / Footer / LanguageSwitcher
  pages/
    index.astro                         EN homepage
    [locale]/index.astro                PT/FR/DE/ES homepages
    admin/index.astro                   EN admin (Homepage with edit=true)
    admin/[locale]/index.astro          PT/FR/DE/ES admin
    privacy.astro
  layouts/BaseLayout.astro
  i18n/ui.ts, utils.ts
  styles/global.css                     Tailwind v4 theme tokens
public/
  admin/admin.js                        client-side admin logic (browser ESM, no build)
  images/                               section photos; uploads/ holds CMS-uploaded media
  favicon.svg, robots.txt, .nojekyll
.github/workflows/deploy.yml            build + deploy to GitHub Pages
```
