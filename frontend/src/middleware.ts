import { defineMiddleware } from 'astro:middleware';

const SUPPORTED_LOCALES = ['en', 'es', 'ht'];

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  // Only intercept the root path — let all other routes pass through
  if (url.pathname !== '/') {
    return next();
  }

  // 1. Check cookie (set by LanguageSwitcher)
  const cookieHeader = context.request.headers.get('cookie') || '';
  const match = cookieHeader.match(/preferredLocale=(en|es|ht)/);
  if (match) {
    return context.redirect(`/${match[1]}/`, 302);
  }

  // 2. Check Accept-Language header for first-time visitors
  const acceptLang = context.request.headers.get('accept-language') || '';
  const preferred = parseAcceptLanguage(acceptLang);
  const locale = preferred || 'en';

  return context.redirect(`/${locale}/`, 302);
});

function parseAcceptLanguage(header: string): string | null {
  // Parse "es-MX,es;q=0.9,en;q=0.8,ht;q=0.7" → best match
  const entries = header.split(',').map(part => {
    const [lang, qPart] = part.trim().split(';');
    const q = qPart ? parseFloat(qPart.replace('q=', '')) : 1;
    return { lang: lang.trim().split('-')[0].toLowerCase(), q };
  });

  entries.sort((a, b) => b.q - a.q);

  for (const { lang } of entries) {
    if (SUPPORTED_LOCALES.includes(lang)) return lang;
  }

  return null;
}
