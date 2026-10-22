/**
 * Helpers that keep the converted expressions behaving like the original app.
 *
 * Ordinary TypeScript — read it, keep it, or delete what your data model makes
 * unnecessary. Each function documents the behaviour it preserves.
 */

/** One property's value, or nothing when evaluating it failed. */
export function attempt<T>(evaluate: () => T): T | undefined {
  try {
    return evaluate();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[uiapp-convert] a property expression failed; it is left unset', err);
    return undefined;
  }
}

/** A Boolean rendered the way .NET does — `True` / `False`, capitalised. */
export function boolText(value: unknown): string {
  // Text passes through: `"x" & CStr(B)` reaches this twice, and "False" is truthy.
  if (typeof value === 'string') return value;
  return value ? 'True' : 'False';
}

/** .NET's `DateTime.MinValue` — 0001-01-01. */
export function dateMin(): Date {
  return new Date('0001-01-01T00:00:00Z');
}

/**
 * A dictionary, as the `Map` its members read — `d(k)`, `ContainsKey`, `Count`, `Keys`.
 *
 * `ToDictionary` builds a Map, but a `New Dictionary From {…}` initializer is a plain
 * object (headers, process arguments and field maps are objects on the TypeScript side),
 * and `.get` on one threw. A plain object is READ in place — a Map built from it on every
 * lookup made a lookup inside a loop quadratic. Values are `any`, as the JSON helpers'
 * are: `unknown` made `d("a") + 1` fail to compile. Nothing is an error, as in VB.
 */
export function dictOf(dictionary: unknown): {
  get(key: unknown): any; has(key: unknown): boolean; readonly size: number;
  keys(): Iterable<unknown>; values(): Iterable<any>;
} {
  if (dictionary instanceof Map) return dictionary;
  if (dictionary === null || dictionary === undefined || typeof dictionary !== 'object') {
    throw new TypeError('the dictionary is not set');
  }
  const entries = dictionary as Record<string, unknown>;
  return {
    get: (key) => (Object.hasOwn(entries, String(key)) ? entries[String(key)] : undefined),
    has: (key) => Object.hasOwn(entries, String(key)),
    get size() { return Object.keys(entries).length; },
    keys: () => Object.keys(entries),
    values: () => Object.values(entries),
  };
}


/** Case-insensitive, culture-aware string equality. */
export function eqIgnoreCase(a: unknown, b: unknown): boolean {
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'accent' }) === 0;
}

/**
 * .NET date format strings (`dd/MM/yyyy`, `HH:mm`, the one-letter standard forms such as
 * `s` and `u`) have no JavaScript equivalent, so they are translated here. Invariant
 * culture throughout, which is what Apps' VB engine uses.
 */
export function formatDate(value: unknown, netFormat: string): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '';
  const p2 = (n: number) => String(n).padStart(2, '0');
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  /*
   * A STANDARD format string is one letter naming a whole pattern. Apps evaluates VB with
   * the invariant culture, so these are .NET's invariant patterns, spelled as the custom
   * tokens below (quoted parts are literal). `u`, `s` and `o` are the ones apps reach for
   * to build a sortable or wire-safe text; each threw "unsupported specifier" before.
   */
  const STANDARD: Record<string, string> = {
    d: 'MM/dd/yyyy', D: 'dddd, dd MMMM yyyy',
    f: 'dddd, dd MMMM yyyy HH:mm', F: 'dddd, dd MMMM yyyy HH:mm:ss',
    g: 'MM/dd/yyyy HH:mm', G: 'MM/dd/yyyy HH:mm:ss',
    m: 'MMMM dd', M: 'MMMM dd',
    o: "yyyy'-'MM'-'dd'T'HH':'mm':'ss'.'fffffff", O: "yyyy'-'MM'-'dd'T'HH':'mm':'ss'.'fffffff",
    r: "ddd, dd MMM yyyy HH':'mm':'ss 'GMT'", R: "ddd, dd MMM yyyy HH':'mm':'ss 'GMT'",
    s: "yyyy'-'MM'-'dd'T'HH':'mm':'ss",
    t: 'HH:mm', T: 'HH:mm:ss',
    u: "yyyy'-'MM'-'dd HH':'mm':'ss'Z'",
    y: 'yyyy MMMM', Y: 'yyyy MMMM',
  };
  let format = netFormat.length === 1 ? (STANDARD[netFormat] ?? netFormat) : netFormat;
  // `%d` is .NET's way of writing a one-letter CUSTOM pattern; the `%` itself prints nothing.
  if (format.length === 2 && format[0] === '%') format = format.slice(1);
  const ms = d.getMilliseconds();
  const fraction = (digits: number) => String(ms).padStart(3, '0').padEnd(7, '0').slice(0, digits);
  const offset = -d.getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  const oh = Math.floor(Math.abs(offset) / 60);
  const om = Math.abs(offset) % 60;
  const parts: Record<string, string> = {
    yyyy: String(d.getFullYear()), yy: p2(d.getFullYear() % 100), y: String(d.getFullYear() % 100),
    MMMM: MONTHS[d.getMonth()]!, MMM: MONTHS[d.getMonth()]!.slice(0, 3),
    MM: p2(d.getMonth() + 1), M: String(d.getMonth() + 1),
    dddd: DAYS[d.getDay()]!, ddd: DAYS[d.getDay()]!.slice(0, 3),
    dd: p2(d.getDate()), d: String(d.getDate()),
    HH: p2(d.getHours()), H: String(d.getHours()),
    hh: p2(d.getHours() % 12 || 12), h: String(d.getHours() % 12 || 12),
    mm: p2(d.getMinutes()), m: String(d.getMinutes()),
    ss: p2(d.getSeconds()), s: String(d.getSeconds()),
    fffffff: fraction(7), ffffff: fraction(6), fffff: fraction(5), ffff: fraction(4),
    fff: fraction(3), ff: fraction(2), f: fraction(1),
    tt: d.getHours() < 12 ? 'AM' : 'PM', t: d.getHours() < 12 ? 'A' : 'P',
    zzz: sign + p2(oh) + ':' + p2(om), zz: sign + p2(oh), z: sign + String(oh),
    // A JS Date is local time, which .NET calls Kind=Local: `K` prints the offset.
    K: sign + p2(oh) + ':' + p2(om),
  };
  const tokens = Object.keys(parts).sort((a, b) => b.length - a.length);
  let out = '';
  let i = 0;
  while (i < format.length) {
    const ch = format[i]!;
    // 'text' and "text" are literals; \x escapes one character.
    if (ch === "'" || ch === '"') {
      const end = format.indexOf(ch, i + 1);
      if (end < 0) throw new Error('formatDate: unterminated quote in "' + netFormat + '"');
      out += format.slice(i + 1, end);
      i = end + 1;
      continue;
    }
    if (ch === '\\') {
      out += format[i + 1] ?? '';
      i += 2;
      continue;
    }
    const tok = tokens.find((t) => format.startsWith(t, i));
    if (tok) { out += parts[tok]; i += tok.length; continue; }
    // Separators pass through; an unknown letter is refused rather than printed as-is.
    if (/[A-Za-z]/.test(ch)) {
      throw new Error('formatDate: unsupported .NET format specifier "' + ch + '" in "' + netFormat + '"');
    }
    out += ch;
    i++;
  }
  return out;
}

/**
 * A .NET numeric format string — the standard specifiers (`C`, `D3`, `E`, `F2`, `G`,
 * `N2`, `P1`, `X`) and the custom patterns (`000`, `#,##0.00`). Invariant culture
 * throughout, which is what Apps' VB engine uses, so every viewer sees the same digits.
 */
export function formatNumber(value: unknown, format: unknown): string {
  const spec = String(format ?? '');
  const n = value === null || value === undefined || value === '' ? 0 : Number(value);
  if (Number.isNaN(n)) return '';
  if (spec === '') return String(n);
  /*
   * A STANDARD specifier is one letter and an optional precision. The invariant culture
   * decides the rest, which is the culture Apps' VB engine runs in: `,` groups, `.`
   * separates, the currency symbol is `¤` and a percent carries a space.
   */
  const std = /^([a-zA-Z])(\d*)$/.exec(spec);
  if (std) {
    const kind = std[1]!.toLowerCase();
    const given = std[2] === '' ? undefined : Number(std[2]);
    // `Object.is` because .NET prints negative zero with its sign: `{0:n2}` of -0 is "-0.00".
    const sign = n < 0 || Object.is(n, -0) ? '-' : '';
    const abs = Math.abs(n);
    switch (kind) {
      case 'n': case 'f': case 'c': case 'p': {
        const digits = given ?? 2;
        const scaled = kind === 'p' ? abs * 100 : abs;
        /*
         * `toFixed` switches to exponential notation at 1e21 and .NET never does, so a
         * magnitude that large is printed digit by digit instead.
         */
        const fixed = Number.isFinite(scaled) && scaled >= 1e21
          ? BigInt(scaled).toString() + (digits > 0 ? '.' + '0'.repeat(digits) : '')
          : roundAway(scaled, digits).toFixed(digits);
        const body = groupThousands(fixed, kind !== 'f');
        if (kind === 'p') return sign + body + ' %';
        // Invariant currency: the symbol leads, and a negative amount is bracketed.
        if (kind === 'c') return sign === '-' ? '(¤' + body + ')' : '¤' + body;
        return sign + body;
      }
      case 'd': {
        // "at least N digits", zero-padded — NOT N decimal places.
        const whole = String(Math.trunc(abs));
        return sign + (given ? whole.padStart(given, '0') : whole);
      }
      case 'x': {
        const hex = Math.trunc(abs).toString(16);
        const padded = given ? hex.padStart(given, '0') : hex;
        return sign + (std[1] === 'X' ? padded.toUpperCase() : padded);
      }
      case 'e': {
        const digits = given ?? 6;
        // .NET writes at least a three-digit exponent; JavaScript writes the fewest.
        const [mantissa, exponent] = abs.toExponential(digits).split('e');
        const e = Number(exponent);
        const body = mantissa + (std[1] === 'E' ? 'E' : 'e')
          + (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(3, '0');
        return sign + body;
      }
      case 'g': case 'r':
        // Shortest round-trippable, which is what both .NET Core and JavaScript print.
        return String(n);
      default:
        break;
    }
  }
  /*
   * A CUSTOM pattern: `0` is a digit or a zero, `#` a digit or nothing, `,` asks for
   * grouping and everything else is a literal. Leading zeros set the MINIMUM width of
   * the whole part — `varInt.ToString("000")` is 42 -> "042", which read as "42" while
   * this only looked at the decimals.
   */
  const m = /^([^#0]*)([#,0]*)(?:\.([#0]*))?([^#0]*)$/.exec(spec);
  if (!m) return String(n);
  const decimals = (m[3] ?? '').replace(/[^#0]/g, '').length;
  const grouped = (m[2] ?? '').includes(',');
  const minWhole = (m[2] ?? '').replace(/[^0]/g, '').length;
  const sign = n < 0 ? '-' : '';
  const fixed = roundAway(Math.abs(n), decimals).toFixed(decimals);
  const dot = fixed.indexOf('.');
  const whole = dot < 0 ? fixed : fixed.slice(0, dot);
  const frac = dot < 0 ? '' : fixed.slice(dot);
  const padded = minWhole > whole.length ? whole.padStart(minWhole, '0') : whole;
  return (m[1] ?? '') + sign + groupThousands(padded + frac, grouped) + (m[4] ?? '');
}

/** Half away from zero, which is what .NET's number formatting does. */
function roundAway(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.sign(n) * Math.round(Math.abs(n) * f + Number.EPSILON) / f;
}

/** Thousands separators on the integer part only. */
function groupThousands(text: string, on: boolean): string {
  if (!on) return text;
  const [whole, frac] = text.split('.');
  const sign = whole!.startsWith('-') ? '-' : '';
  const digits = sign ? whole!.slice(1) : whole!;
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (frac ? '.' + frac : '');
}


/**
 * .NET `String.Format`: `{0}`, `{1:N2}`, `{{` for a literal brace. Each value is
 * rendered the way VB renders it — a Boolean as True/False, a date and a number through
 * the same helpers `ToString(format)` uses, so one vocabulary cannot drift into two.
 */
export function formatString(template: string, ...values: unknown[]): string {
  return String(template).replace(
    /\{\{|\}\}|\{(\d+)(?::([^}]+))?\}/g,
    (whole, index: string | undefined, spec: string | undefined) => {
      if (whole === '{{') return '{';
      if (whole === '}}') return '}';
      const value = values[Number(index)];
      if (value === null || value === undefined) return '';
      // VB renders a Boolean as True/False, whatever the placeholder asks for.
      if (typeof value === 'boolean') return boolText(value);
      if (!spec) return value instanceof Date ? formatDate(value, 'MM/dd/yyyy HH:mm:ss') : String(value);
      if (value instanceof Date) return formatDate(value, spec);
      /*
       * Numbers go through `formatNumber`, which is the same function `x.ToString(spec)`
       * uses. Two implementations of one .NET vocabulary had already drifted: this one
       * read `D3` as three DECIMALS and printed "42.000" where .NET pads to "042".
       */
      if (typeof value === 'number' || typeof value === 'bigint'
          || (typeof value === 'object' && value !== null && 'toFixed' in (value as object))) {
        return formatNumber(Number(value), spec);
      }
      return String(value);
    },
  );
}

/**
 * `TimeSpan.ToString()` / `ToString(format)`: the constant format `[-][d.]hh:mm:ss[.fffffff]`, or a
 * custom one with d/h/m/s/f runs and escaped separators (`hh\:mm\:ss`), as .NET renders it.
 */
export function formatTimeSpan(value: unknown, format?: unknown): string {
  const total = Math.trunc(Number(value ?? 0));
  const neg = total < 0;
  let rest = Math.abs(total);
  const ms = rest % 1000; rest = (rest - ms) / 1000;
  const s = rest % 60; rest = (rest - s) / 60;
  const m = rest % 60; rest = (rest - m) / 60;
  const h = rest % 24; const d = (rest - h) / 24;
  const pad = (n: number, w: number) => String(n).padStart(w, '0');
  const fmt = format === undefined || format === null ? '' : String(format);
  if (fmt === '' || fmt === 'c' || fmt === 't' || fmt === 'T') {
    const frac = ms ? '.' + pad(ms, 3) + '0000' : '';
    return (neg ? '-' : '') + (d ? d + '.' : '') + pad(h, 2) + ':' + pad(m, 2) + ':' + pad(s, 2) + frac;
  }
  // A custom format: runs of d/h/m/s/f/F, `\x` and 'quoted' literals; anything else is itself.
  let out = '';
  for (let i = 0; i < fmt.length;) {
    const c = fmt[i]!;
    if (c === '\\') { out += fmt[i + 1] ?? ''; i += 2; continue; }
    if (c === "'" || c === '"') { const j = fmt.indexOf(c, i + 1); out += fmt.slice(i + 1, j < 0 ? fmt.length : j); i = j < 0 ? fmt.length : j + 1; continue; }
    let j = i; while (j < fmt.length && fmt[j] === c) j++;
    const run = j - i;
    switch (c) {
      case 'd': out += pad(d, run); break;
      case 'h': out += pad(h, run); break;
      case 'm': out += pad(m, run); break;
      case 's': out += pad(s, run); break;
      case 'f': out += pad(ms, 3).padEnd(run, '0').slice(0, run); break;
      case 'F': out += pad(ms, 3).padEnd(run, '0').slice(0, run).replace(/0+$/, ''); break;
      default: out += fmt.slice(i, j);
    }
    i = j;
  }
  return (neg ? '-' : '') + out;
}


/**
 * `Value(Of Boolean)` / `ToObject(Of Boolean)` — Newtonsoft PARSES the token: a JSON boolean
 * is itself, a string is `Convert.ToBoolean` ("true"/"false", any case, trimmed), a number is
 * non-zero, a null token is False, and anything else throws, as .NET does.
 */
export function jsonBool(token: unknown): boolean {
  if (token === null || token === undefined) return false;
  if (typeof token === 'boolean') return token;
  if (typeof token === 'number') return token !== 0;
  if (typeof token === 'string') {
    const text = token.trim().toLowerCase();
    if (text === 'true') return true;
    if (text === 'false') return false;
    throw new Error('Value(Of Boolean): "' + token + '" is not a Boolean (String was not recognized as a valid Boolean)');
  }
  throw new Error('Value(Of Boolean): a JSON object or array is not a Boolean');
}


/**
 * A token's indexer — `obj("key")` and `arr(0)`.
 *
 * OWN properties only: a bare `token[key]` reaches inherited members, so
 * `obj("toString")` gave a function and `arr("length")` the element count. An array
 * takes only a numeric index, because Newtonsoft throws on a string key. A miss is
 * `null`, not `undefined`, so the two spellings stringify alike.
 */
export function jsonGet(token: unknown, key: unknown): any {
  if (token === null || typeof token !== 'object') return null;
  const k = String(key);
  if (Array.isArray(token)) {
    if (!/^\d+$/.test(k)) return null;
    const hit = token[Number(k)];
    return hit === undefined ? null : hit;
  }
  if (!Object.prototype.hasOwnProperty.call(token, k)) return null;
  const hit = (token as Record<string, unknown>)[k];
  return hit === undefined ? null : hit;
}


/**
 * `JObject.Parse(text)` / `JToken.Parse(text)`.
 *
 * Throws on malformed input, as Newtonsoft does. Apps contains that throw per
 * control property; here the page wraps a throwing read in `attempt`, which is
 * why this helper is registered as one that throws on purpose.
 */
export function jsonParse(text: unknown): any {
  return JSON.parse(String(text ?? ''));
}


/**
 * `JsonConvert.SerializeObject(value)`.
 *
 * COMPACT, unlike `jsonText`: `SerializeObject` defaults to `Formatting.None`
 * while `JToken.ToString()` defaults to `Formatting.Indented`. Same operation,
 * different default — verified against 13.0.3 — so they cannot share a helper.
 */
export function jsonStringify(value: unknown): string {
  return JSON.stringify(value ?? null);
}


/**
 * `JToken.ToString()`, split by token kind as Newtonsoft does: a SCALAR renders as its
 * value, a CONTAINER as JSON indented two spaces (`Formatting.Indented`, its default).
 * Booleans render `True`/`False` — the value is a .NET Boolean, and `String(true)`
 * would give `"true"` and fail a comparison against the app's own text.
 *
 * A JSON FRACTION is a .NET Double, which writes its exponent from 1E+17 up and below
 * 1E-04 — `1E+20`, `1.5E-05` — where JavaScript switches at 1e21 and 1e-7. A JSON
 * INTEGER — an Int64 to Newtonsoft — always prints its digits. Parsed, the two are
 * indistinguishable, so a whole number within Int64 is read as the integer: an id or a
 * timestamp is far likelier than `1e17` written as a fraction. Recorded against 13.0.3
 * (json-text.test.ts).
 */
export function jsonText(token: unknown): string {
  if (token === null || token === undefined) return '';
  if (typeof token === 'boolean') return token ? 'True' : 'False';
  // A JProperty prints as `"name": value`, the way Newtonsoft writes one.
  if ((token as { __jsonProperty?: boolean }).__jsonProperty === true) {
    const pair = token as { Name: string; Value: unknown };
    return JSON.stringify(pair.Name) + ': ' + JSON.stringify(pair.Value ?? null, null, 2);
  }
  /*
   * Newtonsoft reads an ISO-8601 string INTO a DateTime as it parses (`DateParseHandling.DateTime`,
   * its default), so `ToString()` on that token is `DateTime.ToString()` — `MM/dd/yyyy HH:mm:ss`
   * under the invariant culture Apps' engine runs — not the ISO text that was in the JSON.
   * `jsonParse` leaves the string alone (reviving would change what every `.Value` read
   * returns), so the conversion Newtonsoft did at parse time is done here, at the one call
   * that shows it. Same ISO shape Newtonsoft recognises; a Date arriving directly renders alike.
   */
  if (token instanceof Date || (typeof token === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(token))) {
    return formatDate(token, 'MM/dd/yyyy HH:mm:ss');
  }
  if (typeof token === 'object') return JSON.stringify(token, null, 2);
  // A whole number within Int64 — both ends, which a double rounds to ±2 ** 63 — is its
  // digits; past 2 ** 53 through BigInt, since String() pads a double's digits with zeros.
  if (typeof token === 'number' && Number.isInteger(token) && token >= -(2 ** 63) && token <= 2 ** 63) {
    return Number.isSafeInteger(token) ? String(token) : BigInt(token).toString();
  }
  if (typeof token === 'number' && Number.isFinite(token)) {
    const [mantissa, exponent] = token.toExponential().split('e');
    const e = Number(exponent);
    if (e >= 17 || e < -4) return mantissa + 'E' + (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(2, '0');
  }
  return String(token);
}


/**
 * `token.Values(Of T)()` — a JSON ARRAY's elements, each converted to T the way
 * Newtonsoft's `Convert.ChangeType` does.
 *
 * Every rule here was recorded against Newtonsoft 13.0.3 (see json-values.test.ts):
 * - the CONTAINER: a missing token, a single value, an object with properties (its
 *   children are properties) and a nested object or array element all throw; an empty
 *   object has no children, so it gives the empty sequence;
 * - an INTEGER target rounds a JSON number half to even, takes text only as whole digits,
 *   and throws outside its width;
 * - DOUBLE text may carry thousands separators, an exponent, Infinity or NaN;
 * - DECIMAL text may carry separators but no exponent, and a JSON fraction — a double to
 *   Newtonsoft — keeps 15 significant digits. It comes back as TEXT, for `dec`;
 * - a boolean is 1 or 0, and a null throws for every number target.
 * String elements come back untouched, for `jsonText`.
 */
export function jsonValues(token: unknown, target: string): any[] {
  if (token === null || token === undefined) throw new TypeError('Values(): the JSON token is missing');
  if (typeof token !== 'object') throw new TypeError('Values(): a single JSON value has no child values');
  // A JProperty's one child is its value.
  const property = (token as { __jsonProperty?: boolean }).__jsonProperty === true;
  const items: unknown[] | null = property ? [(token as { Value: unknown }).Value]
    : Array.isArray(token) ? token : Object.keys(token).length === 0 ? [] : null;
  if (items === null) throw new TypeError('Values(): the children of a JSON object are properties, not values');
  // In BigInt: `2 ** 63 - 1` as a double IS 2 ** 63, which let the first overflow through.
  const ranges: Record<string, [bigint, bigint]> = {
    Int16: [-32768n, 32767n], Int32: [-2147483648n, 2147483647n],
    Int64: [-(2n ** 63n), 2n ** 63n - 1n], Byte: [0n, 255n], SByte: [-128n, 127n],
    UInt16: [0n, 65535n], UInt32: [0n, 4294967295n], UInt64: [0n, 2n ** 64n - 1n],
  };
  const range = ranges[target];
  const format = (v: unknown) => new TypeError('Values(): "' + String(v) + '" is not a ' + target);
  const overflow = (v: unknown) => new RangeError('Values(): ' + String(v) + ' is outside the range of ' + target);
  return items.map((v) => {
    if (v !== null && typeof v === 'object') throw new TypeError('Values(): a nested JSON object or array is not a value');
    if (target === 'String') return v;
    if (v === null) throw new TypeError('Values(): a JSON null cannot become a number');
    if (typeof v === 'boolean') return target === 'Decimal' ? (v ? '1' : '0') : v ? 1 : 0;
    const text = typeof v === 'string' ? v.replace(/^[\t-\r ]+|[\t-\r ]+$/g, '') : null;
    if (range) {
      let n: number;
      if (text !== null) {
        if (!/^[+-]?\d+$/.test(text)) throw format(v);
        n = Number(text);
      } else {
        const x = Number(v);
        const low = Math.floor(x);
        const rest = x - low;
        n = rest > 0.5 || (rest === 0.5 && low % 2 !== 0) ? low + 1 : low;
      }
      // Text is checked EXACTLY. A JSON number is already a double, which cannot tell
      // Int64.MaxValue from 2 ** 63 — so it is checked as one, or the maximum itself threw.
      const inRange = text !== null
        ? BigInt(text) >= range[0] && BigInt(text) <= range[1]
        : Number.isFinite(n) && n >= Number(range[0]) && n <= Number(range[1]);
      if (!inRange) throw overflow(v);
      return n === 0 ? 0 : n;
    }
    if (target === 'Double' || target === 'Single') {
      if (text === null) return v;
      if (/^[+-]?infinity$/i.test(text)) return text.startsWith('-') ? -Infinity : Infinity;
      if (/^[+-]?nan$/i.test(text)) return NaN;
      if (!/^[+-]?(\d[\d,]*(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(text)) throw format(v);
      return Number(text.replace(/,/g, ''));
    }
    if (target === 'Decimal') {
      // NumberStyles.Number: a sign may TRAIL the digits instead ("5-" is -5), not both.
      const parts = text === null ? null
        : /^([+-]?)(\d[\d,]*(?:\.\d*)?|\.\d+)(?:[\t-\r ]*([+-]))?$/.exec(text);
      if (text !== null && (!parts || (parts[1] && parts[3]))) throw format(v);
      const decimalText = parts ? ((parts[1] || parts[3]) === '-' ? '-' : '') + parts[2]!.replace(/,/g, '') : null;
      const x = decimalText === null ? Number(v) : Number(decimalText);
      if (!(Math.abs(x) < 7.922816251426434e28)) throw overflow(v);
      if (x === 0) return '0';
      if (decimalText !== null) return decimalText;
      return Number.isInteger(x) ? String(x) : String(Number(x.toPrecision(15)));
    }
    throw new TypeError('Values(): no conversion to ' + target);
  });
}


/** The rows of a list source, whichever shape it arrived in. */
export function listData<T = unknown>(source: unknown): T[] {
  if (Array.isArray(source)) return source as T[];
  const rows = (source as { data?: unknown } | null | undefined)?.data;
  return Array.isArray(rows) ? rows as T[] : [];
}

/** `DateTime.ParseExact(text, format, …)` — parse by the format the app DECLARED. */
export function parseDateExact(text: unknown, format: unknown): Date {
  const spec = String(format ?? '');
  const input = String(text ?? '').trim();
  const order: string[] = [];
  let pattern = '';
  for (let i = 0; i < spec.length;) {
    const token = /^(yyyy|MM|M|dd|d|HH|H|mm|m|ss|s)/.exec(spec.slice(i));
    if (token) {
      const t = token[1]!;
      order.push(t);
      pattern += t === 'yyyy' ? '(\\d{4})' : t.length === 2 ? '(\\d{2})' : '(\\d{1,2})';
      i += t.length;
      continue;
    }
    if (/[a-zA-Z]/.test(spec[i]!)) {
      throw new Error(`DateTime.ParseExact: unsupported format token "${spec[i]}" in "${spec}"`);
    }
    // A separator, escaped so a dot or slash is literal.
    pattern += spec[i]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    i += 1;
  }
  const m = new RegExp(`^${pattern}$`).exec(input);
  if (!m) throw new Error(`DateTime.ParseExact: "${input}" does not match "${spec}"`);
  const part = (name: string): number => {
    const at = order.indexOf(name);
    return at < 0 ? 0 : Number(m[at + 1]);
  };
  const year = order.includes('yyyy') ? part('yyyy') : 1;
  const month = order.includes('MM') ? part('MM') : part('M');
  const day = order.includes('dd') ? part('dd') : part('d');
  const hour = order.includes('HH') ? part('HH') : part('H');
  const minute = order.includes('mm') ? part('mm') : part('m');
  const second = order.includes('ss') ? part('ss') : part('s');
  const d = new Date(year, Math.max(0, month - 1), day || 1, hour, minute, second);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`DateTime.ParseExact: "${input}" is not a valid date`);
  }
  return d;
}


/**
 * One value as the Data Fabric query API takes it: a string.
 *
 * A DATE is the reason this exists. `String(aDate)` is a LOCALE string —
 * "Tue Apr 07 2026 17:30:00 GMT+0530 (India Standard Time)" — and the API reads
 * ISO 8601, so a date filter built that way does not match a narrower set of rows,
 * it matches the wrong ones or is rejected outright.
 *
 * Nothing goes on the wire as null — what Studio sends for an unset value and what a
 * literal Nothing already emits — never as the word "undefined", nor as "".
 */
export function queryValue(value: unknown): string | null {
  // `Object.prototype.toString`, not `instanceof`: a Date that crossed a realm — an
  // iframe, a worker, a sandboxed evaluation — is still a Date, and `instanceof` says
  // it is not, which would send the locale string this exists to prevent.
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return (value as Date).toISOString();
  }
  // Nothing is null on the wire, as a literal Nothing already is: the empty string is a
  // different filter — it matches empty text, and on a GUID column it is a 400.
  return value === null || value === undefined ? null : String(value);
}


/**
 * .NET rounds half-to-even ("banker's rounding"); JavaScript `Math.round`
 * rounds half-up. `Math.Round(2.5)` is 2 in Apps and 3 in JavaScript.
 * `Math.Round(x, 2)` also honours the digits argument, which `Math.round`
 * silently ignores.
 */
export function roundHalfEven(value: number, digits = 0): number {
  const f = 10 ** digits;
  const x = value * f;
  // Scaling can overflow to Infinity for a very large magnitude, and the arithmetic
  // below then yields Infinity where .NET returns the value untouched — a number that
  // big has no fractional part left to round.
  if (!Number.isFinite(x)) return value;
  const low = Math.floor(x);
  const diff = x - low;
  const r = diff > 0.5 ? low + 1 : diff < 0.5 ? low : (low % 2 === 0 ? low : low + 1);
  return r / f;
}

/**
 * VB's `String.Contains`, with .NET's treatment of Nothing.
 *
 * .NET THROWS on a Nothing needle (ArgumentNullException) and matches EVERYTHING on an
 * empty one. Coercing Nothing to "" made those two the same thing, and an authored
 * `rows.Where(Function(s) s.Name.Contains(Record.Rel.Name)).First()` then matched the
 * first row whenever the relationship was empty: a dropdown that showed the first
 * department whatever the record held, where Apps' expression failed and showed nothing.
 */
export function textContains(haystack: unknown, needle: unknown): boolean {
  if (needle === null || needle === undefined) {
    throw new TypeError("Value cannot be null. (Parameter 'value')");
  }
  return String(haystack ?? '').includes(String(needle));
}

/**
 * `TimeSpan.Parse(text)` — .NET's `[-][d.]hh:mm[:ss[.fffffff]]` (or bare days) as MILLISECONDS,
 * which is what a TimeSpan is at run time here. Anything else throws, as .NET does.
 */
export function timeSpanParse(text: unknown): number {
  const s = String(text ?? '').trim();
  const m = /^(-)?(?:(\d+)\.)?(\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,7}))?)?$/.exec(s)
    ?? /^(-)?(\d+)$/.exec(s);
  if (!m) throw new Error('TimeSpan.Parse: "' + s + '" is not a TimeSpan (String was not recognized as a valid TimeSpan)');
  const sign = m[1] ? -1 : 1;
  if (m.length === 3) return sign * Number(m[2]) * 86_400_000;
  const [, , d, h, mi, sec, frac] = m;
  if (Number(h) > 23 || Number(mi) > 59 || Number(sec ?? 0) > 59) {
    throw new Error('TimeSpan.Parse: "' + s + '" has a component out of range');
  }
  const ms = frac ? Math.round(Number('0.' + frac) * 1000) : 0;
  return sign * ((Number(d ?? 0) * 86_400 + Number(h) * 3600 + Number(mi) * 60 + Number(sec ?? 0)) * 1000 + ms);
}


/**
 * A value as a Date — a bare `yyyy-mm-dd` as that LOCAL day, as every date here is local.
 *
 * `new Date("2024-01-02")` is UTC midnight, which is the day before anywhere west of UTC
 * once formatted or truncated — a DateOnly field that arrives as that text printed the
 * previous day. Everything else parses as before.
 */
export function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  const text = String(value ?? '');
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(text);
}

/**
 * VB's `CInt` uses banker's rounding, not truncation: `CInt(3.5)` is 4 and
 * `CInt(2.5)` is 2. `Math.trunc` would give 3 and 2.
 */
export function toInt(value: unknown): number {
  return roundHalfEven(Number(value));
}
