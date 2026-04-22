// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// TODO: set `site` to the real deployment URL (e.g. https://<user>.github.io or a custom domain).
// TODO: set `base` to '/<repo-name>/' when deploying to project GitHub Pages; keep '/' for a custom domain or user/org site.
const site = process.env.SITE_URL ?? 'https://example.github.io';
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt', 'fr', 'de', 'es'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
