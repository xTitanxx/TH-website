import { defaultLocale, locales, ui, type Locale } from './ui';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function localeFromPath(path: string): Locale {
  const segment = path.split('/').filter(Boolean)[0];
  return segment && isLocale(segment) ? segment : defaultLocale;
}

/** Build a URL path for a given locale. Homepage for the default locale is '/'. */
export function localePath(locale: Locale, subpath: string = ''): string {
  const clean = subpath.replace(/^\/|\/$/g, '');
  if (locale === defaultLocale) {
    return clean ? `/${clean}/` : '/';
  }
  return clean ? `/${locale}/${clean}/` : `/${locale}/`;
}

export function t(locale: Locale) {
  return ui[locale];
}
