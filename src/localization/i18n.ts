import tr from './tr/common.json';
import en from './en/common.json';
import de from './de/common.json';
import es from './es/common.json';

export type Locale = 'tr' | 'en' | 'de' | 'es';

const catalogs: Record<Locale, Record<string, string>> = { tr, en, de, es };

/**
 * All user-facing strings are translated. Slash/prefix command NAMES stay
 * Turkish everywhere (per spec) - only this catalog (labels, embeds, errors)
 * is localized.
 */
export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const catalog = catalogs[locale] ?? catalogs.tr;
  let str = catalog[key] ?? catalogs.tr[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{{${k}}}`, String(v));
    }
  }
  return str;
}
