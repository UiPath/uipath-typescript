import type { PromoOutcome } from './contract.ts';

/** One entry from the promo-codes Secret asset. */
interface PromoDefinition {
  code: string;
  percentOff: number;
  label?: string;
}

/**
 * Parses the Secret asset's JSON. A malformed asset yields an empty list rather
 * than throwing, so a bad value means "no code is valid" instead of a 500 that
 * leaks how the list is stored.
 */
export function parsePromoCodes(raw: string): PromoDefinition[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is PromoDefinition =>
        typeof entry === 'object' && entry !== null &&
        typeof (entry as PromoDefinition).code === 'string' &&
        typeof (entry as PromoDefinition).percentOff === 'number',
    );
  } catch {
    return [];
  }
}

/**
 * Matches a submitted code, case-insensitively.
 *
 * A rejection says only that the code is not valid. It reveals nothing about
 * how many codes exist, how close a guess was, or what the format is. Leaking
 * any of that would undo the point of hiding the list.
 */
export function matchPromo(submitted: string, definitions: PromoDefinition[]): PromoOutcome {
  const code = submitted.trim();
  if (!code) {
    return { code, applied: false, reason: 'No code entered.' };
  }

  const hit = definitions.find((d) => d.code.toLowerCase() === code.toLowerCase());
  if (!hit) {
    return { code, applied: false, reason: 'That code is not valid.' };
  }

  return { code: hit.code, applied: true, percentOff: hit.percentOff, label: hit.label };
}

/** Rounds to 2dp without the float drift a naive round gives on values like 1.005. */
export function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
