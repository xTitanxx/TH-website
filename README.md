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

The site ships with a **Decap CMS** admin at `/admin/`. You can edit section text and upload images through a friendly form UI — no need to touch markdown by hand.

### Local editing (works immediately, no setup)

In two terminals:

```sh
# Terminal 1
npm run cms          # starts the Decap proxy on http://localhost:8081

# Terminal 2
npm run dev          # starts Astro on http://localhost:4321
```

Visit **<http://localhost:4321/admin/>**. No login. Edits write straight to the files in `src/content/sections/en/` and `public/images/uploads/`, visible live in the other browser tab. Commit and push when happy.

### Editing on the deployed site (optional, one-time setup)

GitHub's OAuth flow requires a small server to exchange the auth code — so editing on a plain GitHub Pages deployment needs a tiny proxy. Free, ~5 minutes:

1. **Create a GitHub OAuth App** at <https://github.com/settings/developers> → *OAuth Apps* → *New OAuth App*.
   - Homepage URL: your site URL
   - Authorization callback URL: `https://<your-worker-subdomain>.workers.dev/callback` (you'll set the subdomain in step 2)
   - Note the **Client ID** and generate a **Client Secret**.

2. **Deploy a Cloudflare Worker** as the OAuth proxy. Any maintained Decap OAuth worker will do; Sterling Wise's is a common pick:
   ```sh
   npx wrangler deploy \
     --name decap-oauth \
     --var GITHUB_CLIENT_ID:<...> \
     --var GITHUB_CLIENT_SECRET:<...>
   ```
   (See <https://github.com/sterlingwes/decap-proxy> for the exact template.)

3. **Wire the config** in `public/admin/config.yml`:
   ```yaml
   backend:
     name: github
     repo: <your-github-user>/<your-repo-name>
     branch: main
     base_url: https://decap-oauth.<your-subdomain>.workers.dev
   ```

4. Push, and `/admin/` on the deployed site will prompt you to sign in with GitHub. All edits become real commits on `main` — which means GitHub Actions rebuilds and redeploys automatically.

Until step 4, `/admin/` on the live site will load but authentication won't complete. Use local editing in the meantime.

## Environment variables

Copy `.env.example` to `.env` and fill in:

- `PUBLIC_FORMSPREE_ENDPOINT` — Formspree form action URL
- `PUBLIC_WHATSAPP_NUMBER` — digits only, international format (e.g. `351912345678`)
- `PUBLIC_CONTACT_EMAIL` — owner email for the mailto fallback

For CI, set these as GitHub Actions secrets / variables (see `.github/workflows/deploy.yml`).

## Deployment

Push to `main` and GitHub Actions builds and deploys to GitHub Pages.

Enable GitHub Pages in repo settings → **Pages** → Build and deployment · Source: **GitHub Actions**.

If the repo is hosted at `https://<user>.github.io/<repo>/`, set the repository **variable** `BASE_PATH` to `/<repo>/`.
For a custom domain or user/org root site, leave it unset (defaults to `/`).

## Repo layout

```
src/
  content/sections/en/         markdown source for every page section
  content.config.ts            schema for the content collection
  pages/index.astro            EN homepage — composes sections from markdown
  pages/[locale]/index.astro   PT/FR/DE/ES "translation in progress" pages
  pages/admin/index.astro      loads Decap CMS
  pages/privacy.astro
  components/                  PlaceholderImage, Gallery, Header, Footer, Section, ContactForm, LanguageSwitcher
  i18n/ui.ts, utils.ts         UI strings + helpers
  layouts/BaseLayout.astro
  styles/global.css            Tailwind v4 theme tokens
public/
  admin/config.yml             Decap CMS schema
  images/                      section photos (live files replace placeholders on sight)
  images/uploads/              CMS-uploaded media
  favicon.svg, robots.txt, .nojekyll
.github/workflows/deploy.yml   build + deploy to GitHub Pages
```
