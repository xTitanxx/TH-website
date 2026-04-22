import { defaultLocale, locales, ui, type Locale } from './ui';

const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function localeFromPath(path: string): Locale {
  const stripped = path.startsWith(BASE) ? path.slice(BASE.length) : path;
  const segment = stripped.split('/').filter(Boolean)[0];
  return segment && isLocale(segment) ? segment : defaultLocale;
}

/** Prefix a path with the deployment base (e.g. "/TH-website/"). */
export function withBase(path: string): string {
  const clean = path.replace(/^\/+/, '');
  return `${BASE}${clean}`.replace(/\/\/+/g, '/');
}

/** Build a URL path for a given locale, always including the deployment base. */
export function localePath(locale: Locale, subpath: string = ''): string {
  const clean = subpath.replace(/^\/|\/$/g, '');
  const localePart = locale === defaultLocale ? '' : `${locale}/`;
  const sub = clean ? `${clean}/` : '';
  return `${BASE}${localePart}${sub}`.replace(/\/\/+/g, '/');
}

/** Build an admin path for a given locale. */
export function adminPath(locale: Locale): string {
  return locale === defaultLocale ? withBase('/admin/') : withBase(`/admin/${locale}/`);
}

export function t(locale: Locale) {
  return ui[locale];
}
