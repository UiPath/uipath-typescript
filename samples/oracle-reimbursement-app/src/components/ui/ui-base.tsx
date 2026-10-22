import { Component, createContext, useContext, useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { armChangeRules, fieldOf, fireChangeRule, setControlProp, setUnscopedProp, TOUCHED_PROP,
  useControlProp, useControlProps, useUnscopedProp, type AppsFile, useRowScopedName } from '../../lib/runtime';
import { PROVENANCE } from './provenance';
import { attachmentResolvers, isEntityAttachment, isJobAttachment } from '../../lib/runtime';
import { RowScope } from '../../lib/runtime';

/** Props every generated component accepts. */
export interface UiBaseProps {
  ctl: string;
  className?: string;
  /** Verbatim from the authored `cssClasses` property. */
  extraClass?: string;
  style?: CSSProperties;
  hidden?: boolean;
  disabled?: boolean;
  /**
   * Authored tooltip. Typed `unknown` because Apps lets a designer bind ANY
   * expression here, and VB's `If(cond, "text", False)` is legal — so the value can
   * arrive as a boolean or a number. Coerced once in `baseAttrs`, not per call site.
   */
  title?: unknown;
  isValid?: boolean;
  /**
   * Authored `text`. On the base because EVERY Apps control carries it — a text
   * input's `text` is its caption, a label's is its content. Individual components
   * decide what to do with it.
   */
  text?: unknown;
  /**
   * Event handlers, also on the base: Apps lets a designer attach a rule to any
   * control, so an icon or a panel can have an onClick just as a button can.
   */
  onClick?: () => void;
  onLoad?: () => void;
  onBlur?: () => void;
  onFocus?: () => void;
  onValueChange?: (value: never) => void;
  /** The authored value for kinds that name it something other than `value`. */
  authoredValue?: unknown;
  /** Textarea height, in rows. Apps' template defaults to 3. */
  rows?: unknown;
  /** Slider granularity. */
  step?: unknown;
  /** Number-input affordances. */
  prefix?: unknown;
  useSeparator?: unknown;
  /**
   * A bounded input's range — the control's own bound, NOT the validation rule of the
   * same name. Expression-visible as `MinValue`/`MaxValue` on the slider and the
   * number input.
   */
  min?: unknown;
  max?: unknown;
  /**
   * Where a control's caption sits relative to the control. A switch authors
   * `after`, a checkbox authors `left`.
   */
  labelPosition?: unknown;
  /**
   * Declared on the BASE, not per control: Apps' own catalogue does not say which control
   * owns these, so a control that authors one gets a prop it ignores rather than an app
   * that will not compile.
   */
  defaultTab?: unknown;
  itemsSize?: unknown;
  downloadOnly?: unknown;
  /**
   * Which entity a data-bound control's rows came from. On the BASE because the emitter
   * adds it to EVERY source-bound control, and cells use it to turn a stored choice id or
   * related record into readable text.
   */
  entity?: string;
  /**
   * Whether a table sorts from its header. Apps disables its `matSort` unless this
   * property is true.
   */
  sortable?: unknown;
  /** ACCESSIBILITY, which is easy to lose in a conversion because none of it is visible. */
  ariaLabel?: unknown;
  role?: unknown;
  children?: ReactNode;
}

/** The text to show, and store, for one row of a bound option list. */
export function optionLabel(item: unknown, displayField?: string): string {
  if (item === null || item === undefined) return '';
  if (typeof item !== 'object') return String(item);
  const row = item as Record<string, unknown>;
  /** Present AND carrying text — a null or blank field is not an answer. */
  const usable = (v: unknown) =>
    v !== null && v !== undefined && typeof v !== 'object' && String(v) !== '';
  const named = displayField ? fieldOf(row, displayField) : undefined;
  if (displayField && usable(named)) return String(named);
  for (const key of ['DisplayName', 'Name', 'displayName', 'name']) {
    if (usable(row[key])) return String(row[key]);
  }

  const isId = (k: string) => k.toLowerCase() === 'id' || /(?:Id|_id)$/.test(k);
  const [, value] = Object.entries(row).find(([k, v]) => usable(v) && !isId(k)) ?? [];
  return value === undefined ? '' : String(value);
}

/** One CELL of a table or grid, as text. */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (Array.isArray(value)) return value.map((v) => cellText(v)).filter((t) => t !== '').join(',');
  if (typeof value === 'object') return optionLabel(value);
  /*
   * A GRID cell prints a Boolean as the raw `true`/`false`, which is not how a text
   * field bound to the same value reads (`displayText` gives .NET's True/False).
   * Measured side by side on the same record: Apps' grid showed `true` where the
   * converted grid showed `True`, on every boolean column of every row.
   */
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return displayText(value);
}

/** Anything a designer bound to a text slot, as something React can render. */
export function displayText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isNaN(value) ? '' : String(value);
  if (typeof value === 'string') return value;
  // A Boolean displays as .NET spells it — a text field bound to a Boolean input read
  // "False" in Apps and "false" here.
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  return String(value);
}

/** A numeric bound, or nothing when the slot was left blank. */
export function bound(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * The DOM input type for a text control. Apps has ONE text control whose
 * `inputControlInputType` (Text | Number | Email) decides what it accepts; the fallback
 * is the type the control's own kind implies.
 */
export function inputTypeFor(authored: unknown, fallback: string): 'text' | 'number' | 'email' {
  const t = typeof authored === 'string' ? authored.toLowerCase() : '';
  return t === 'number' || t === 'email' || t === 'text' ? t : (fallback as 'text' | 'number' | 'email');
}

/** A text control's authored input mask, or null when it has none (both parts are needed, as in Apps). */
export function inputMaskOf(p: { maskPattern?: unknown; maskSlot?: unknown; maskAccept?: unknown }):
  { pattern: string; slot: string; accept: string } | null {
  if (typeof p.maskPattern !== 'string' || p.maskPattern === '') return null;
  if (typeof p.maskSlot !== 'string' || p.maskSlot === '') return null;
  return {
    pattern: p.maskPattern, slot: p.maskSlot,
    accept: typeof p.maskAccept === 'string' && p.maskAccept !== '' ? p.maskAccept : '\\d',
  };
}

/**
 * Apps' input mask (input-mask.service.ts) as a pure function: the characters the user
 * typed, laid into the authored pattern. Every character of `slot` marks a fillable
 * position; only characters matching `accept` (a regex source, `\d` by default) fill
 * one; the pattern's other characters print themselves. The result is the whole masked
 * text — unfilled slots still show the slot character, which is what Apps stores too —
 * and the caret goes to the first slot still empty.
 */
export function applyInputMask(
  raw: string, mask: { pattern: string; slot: string; accept: string },
): { text: string; caret: number } {
  const slots = new Set(mask.slot);
  let accepted: RegExp;
  try { accepted = new RegExp(mask.accept, 'g'); } catch { accepted = /\d/g; }
  const input = raw.match(accepted) ?? [];
  const chars = Array.from(mask.pattern, (c) =>
    (input[0] === c || slots.has(c) ? (input.shift() ?? c) : c));
  const firstEmpty = chars.findIndex((c) => slots.has(c));
  const text = chars.join('');
  return { text, caret: firstEmpty < 0 ? text.length : firstEmpty };
}

/**
 * A number with thousands separators, for a field whose `numberControlSeparator` is on.
 * Display only — the stored value stays the bare number, as Apps' directive keeps it.
 * Anything that is not a number shows unchanged.
 */
export function withSeparators(value: unknown): string {
  const text = displayText(value);
  if (text.trim() === '') return text;
  const n = Number(text.replace(/,/g, ''));
  return Number.isNaN(n) ? text : n.toLocaleString('en-US', { maximumFractionDigits: 20 });
}

/**
 * A per-control error boundary. Every generated component is exported through one, so
 * a control that throws while rendering (a widget missing its SDK, a malformed bound
 * value) leaves a marked, titled placeholder in its own place — and the REST of the page
 * renders. Without it React unmounts the whole tree, and one bad control blanked a page.
 */
export class Guarded extends Component<{ ctl: string; children?: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('[uiapp-convert] control "' + this.props.ctl + '" failed to render', error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="ui-control-failed" role="alert" data-uiapp-name={this.props.ctl}
          title={this.state.error.message}>
          {this.props.ctl}: could not render
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Run a rule handler from a DOM event or a lifecycle hook.
 *
 * A generated handler that fails reports the failure itself — the emitted catch shows
 * the message, records the outcome, and rethrows so the rest of its rule chain stops.
 * From here on the rethrow has done its job; letting it escape made every reported
 * failure appear a second time as an unhandled rejection in the console.
 */
export function fireRule(run: (() => unknown) | undefined): Promise<void> {
  if (!run) return Promise.resolve();
  // Settles either way: a caller waiting for the rule (a page's load curtain) must not wait
  // for ever because the chain reported an error and stopped.
  return Promise.resolve().then(run).then(() => undefined, (err: unknown) => {
    // eslint-disable-next-line no-console
    console.debug('[uiapp-convert] a rule chain stopped after reporting its error', err);
  });
}

/** Whether a caption follows its control rather than preceding it. */
export function labelAfter(position: unknown): boolean {
  const p = typeof position === 'string' ? position.toLowerCase() : '';
  return p === 'after' || p === 'right' || p === 'bottom';
}

export const cx = (...parts: (string | undefined | false)[]) =>
  parts.filter(Boolean).join(' ') || undefined;

/** Which page a control is on, so an unbound field can find its own store slot. */
export const PageScope = createContext('');

/** The store key a field's value lives under. */
const FIELD_VALUE_PROP = 'Value';

export function PageProvider(p: { name: string; children: ReactNode }) {
  return <PageScope.Provider value={p.name}>{p.children}</PageScope.Provider>;
}

/** The current page, for controls that write more than just their value. */
export function usePageName(): string {
  return useContext(PageScope);
}

/** A field's value and change handler. */
/**
 * A control's properties AS THEY ARE NOW: what the designer authored, with anything set
 * at runtime taking precedence.
 *
 * Apps lets a rule set any property of any control — `Hidden` and `Disabled` far more
 * often than the value. An authored property arrives as a plain JSX attribute, so a
 * component reading `p.hidden` alone can only ever see what the designer typed, and a
 * rule that hides a control would change the store and leave the screen as it was.
 *
 * Only a property the store actually holds overrides the authored one — an absent key
 * must not clobber it with `undefined`. `Value` is deliberately absent from the map:
 * `useFieldState` owns it, because a bound field's value comes from its own binding
 * rather than from the store.
 */
/**
 * All `useControl` needs of a component's props.
 *
 * Deliberately not `UiBaseProps`: a custom list narrows `children` to a row template,
 * so its props are not assignable to the base, and a constraint that demanded the whole
 * base collapsed the generic and lost every control-specific property.
 */
interface ControlIdentity {
  ctl: string;
  onLoad?: () => void;
}

const OVERRIDABLE: Readonly<Record<string, string>> = {
  Hidden: 'hidden',
  Disabled: 'disabled',
  ReadOnly: 'readOnly',
  /*
   * NOT `IsValid`. Only the runtime's own validation writes it, on mount and on change, and
   * its only reader is `aria-invalid` — so taken from the store, every empty required field
   * was announced invalid at page load, before anyone touched it. The touched-and-invalid
   * case is already `v.show`.
   */
  Text: 'text',
  Label: 'label',
};

/**
 * `useControl`, plus whether the control's load rule has finished — for the one component
 * that needs both, a page root holding its curtain (see `holdUntilLoaded`). One hook, so
 * the load rule is armed once: a component calling `useOnLoad` beside `useControl` would
 * fire it twice.
 */
export function useControlLoaded<T extends ControlIdentity>(props: T): { props: T; loaded: boolean } {
  const loaded = useOnLoad(props);
  const page = useContext(PageScope);
  const stored = useControlProps(page, props.ctl);
  if (!stored) return { props, loaded };

  let resolved: T | undefined;
  for (const [prop, attribute] of Object.entries(OVERRIDABLE)) {
    if (!(prop in stored)) continue;
    resolved ??= { ...props };
    (resolved as Record<string, unknown>)[attribute] = stored[prop];
  }
  return { props: resolved ?? props, loaded };
}

export function useControl<T extends ControlIdentity>(props: T): T {
  return useControlLoaded(props).props;
}

/**
 * Fires a control's authored `load` rule once, after it first renders. Returns whether it
 * has FINISHED — a control with no load rule is loaded at once — so a page can hold its
 * curtain until its own load rule has run (see `holdUntilLoaded`).
 *
 * Typed by the one prop it reads, so `useControl` can pass any control's props through it.
 */
export function useOnLoad(p: { onLoad?: () => void }): boolean {
  const fired = useRef(false);
  const [loaded, setLoaded] = useState(!p.onLoad);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fireRule(p.onLoad).then(() => setLoaded(true));
    // `change` rules stay inert until this pass's `load` rules have run.
    armChangeRules();
  }, []);
  return loaded;
}

/**
 * Did the value actually change? Structural, because Apps' own set-value guard is
 * `!isEqual(current, next)`: a re-render handing back an equal-but-new array is not a
 * change. One level deep — a control's value is a scalar, a list of scalars, or a record.
 */
/**
 * A row or a list of rows as a comparable string, for seeding a field whose authored
 * value is an object. Undefined when the value cannot be serialised (a cycle), which
 * means "do not seed" rather than "seed forever".
 */
function structuralKey(value: object): string | undefined {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const x = a as Record<string, unknown>, y = b as Record<string, unknown>;
  const kx = Object.keys(x);
  return kx.length === Object.keys(y).length && kx.every((k) => x[k] === y[k]);
}

export function useFieldState(
  p: UiBaseProps & {
    value?: unknown;
    /** The authored value — `checked`, `switchValue`, `sliderValue`. */
    authoredValue?: unknown;
    onChange?: (value: never) => void;
  },
) {
  const page = useContext(PageScope);
  const stored = useControlProp<unknown>(page, p.ctl, FIELD_VALUE_PROP);
  // Inside a list row, writes go to this row's instance, not to whichever row is selected.
  const name = useRowScopedName(page, p.ctl);
  const row = useContext(RowScope);
  // The presence of onChange is what marks a field as authored-bound.
  const bound = p.onChange !== undefined;

  // A Boolean shown in a text field reads "True"/"False", as .NET spells it and Apps shows it.
  const raw = p.authoredValue !== undefined ? p.authoredValue
    : typeof p.text === 'boolean' ? (p.text ? 'True' : 'False')
    : p.text !== undefined ? p.text : undefined;
  const computed = typeof raw === 'number' && Number.isNaN(raw) ? '' : raw;
  /*
   * The authored value IS the control's value in Apps, and it stays LIVE until the user
   * edits the field: a dropdown authored "No" answers `Signed_Dropdown.Value = "No"`
   * before anyone touches it, and a field bound to an action property fills in when the
   * task's data lands.
   *
   * Both halves were bugs. Publishing nothing left a required field showing "No" flagged
   * "Required field", because every expression read an empty store. Publishing it ONCE
   * froze whatever the expression produced on the first render — a date of birth
   * evaluated before the task arrived stored .NET's year-0001 default, and when the real
   * date came the store already had a value, so the field stayed empty for good.
   *
   * So: while the field is untouched the store follows the expression; the moment the
   * user changes it, their value wins and the expression is ignored. That is what stops
   * a checkbox authored `checked: false` from being untoggleable — clicking it marks the
   * field dirty, so the literal cannot overwrite the click.
   */
  const dirty = useRef(false);
  /*
   * A STABLE key for the effect. `computed` is rebuilt every render for a date
   * (`dateOnly(new Date(x))`) and for a row (`rows.filter(...).first()`), so depending on
   * the value itself would re-seed forever. A date keys on its time; a row, or a list of
   * rows, on its structure — Apps' own set-value guard is `!isEqual(current, next)`,
   * structural too. Skipping objects entirely was a bug: a dropdown whose authored value
   * is `rows.Where(x => x.NumberId = record.Status).First()` and a multi-select whose
   * value is `rows.Where(...).ToList()` opened an Edit popup with nothing selected.
   */
  const computedKey = computed instanceof Date
    ? (Number.isNaN(computed.getTime()) ? undefined : computed.getTime())
    : computed !== null && typeof computed === 'object' ? structuralKey(computed)
      : computed;
  useEffect(() => {
    if (dirty.current) return;
    if (computedKey === undefined || computedKey === null || computedKey === '') return;
    if (bound) p.onChange!(computed as never);
    else setControlProp(page, name, FIELD_VALUE_PROP, computed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedKey, page, name]);

  // The value this field actually shows, whatever produced it. Computed once so the
  // trigger below and the returned value cannot disagree about what "the value" is.
  const effective = bound ? (p.value ?? computed) : stored !== undefined ? stored : computed;

  /*
   * The authored `change` rule, which render-node passes as `onValueChange`.
   *
   * Watching the VALUE rather than the DOM is the point: the rule must also fire when an
   * expression resolves or another rule writes this control, neither of which raises a
   * DOM event. Seeding on mount keeps the initial value from counting as a change; the
   * remaining guards live in `fireChangeRule`.
   */
  const prev = useRef<{ seeded: boolean; value: unknown }>({ seeded: false, value: undefined });
  useEffect(() => {
    if (!prev.current.seeded) {
      prev.current = { seeded: true, value: effective };
      return;
    }
    if (sameValue(prev.current.value, effective)) return;
    prev.current.value = effective;
    fireChangeRule(page + '/' + p.ctl, () => p.onValueChange?.(effective as never));
  }, [effective]);

  return {
    /*
     * For a self-managed field the STORE wins once anything has written it; the
     * authored value is the state the control STARTS in, not a standing override.
     * The old order (`computed` first) read well for expression-driven props but
     * pinned every control with an authored literal: a checkbox authored
     * `checked: false` could never be checked — clicking it wrote `true` to the
     * store, every expression reading the control said true, and the box itself
     * re-rendered the literal `false`, unchecked and untoggleable, forever.
     */
    value: effective,
    onChange: (v: unknown) => {
      /*
       * The user has spoken: from here the store wins over the authored expression.
       * And changing a value inside a list row SELECTS that row, as Apps does — before
       * the value lands and before the change rule runs, so a rule reading
       * `List.SelectedItem` gets this row, not the previous one or none. See RowScope.
       */
      dirty.current = true;
      row?.select?.();
      if (bound) p.onChange!(v as never);
      else setControlProp(page, name, FIELD_VALUE_PROP, v);
      // The change rule itself fires from the effect above, through `fireChangeRule`,
      // once the new value is in the store — armed after load and budgeted, as Apps does.
    },
  };
}

/**
 * A field's validation state FOR DISPLAY, blur-gated.
 *
 * The gating is measured Apps behaviour, not a preference: an untouched empty required
 * field shows nothing at all, and only after you leave it empty does the red border, the
 * icon and the message appear. Validating on mount and showing it immediately would paint
 * a pristine form red.
 *
 * The message itself comes from the store, written by `validateControl` — so the rules
 * stay where they are authored (evaluated per-render on the page, because they are
 * expressions) and the component only decides WHEN to show the answer.
 *
 * "Touched" lives in the STORE too, under the field's own (row-scoped) slot, not in React
 * state: a rule has to be able to clear it. Apps' Reset Value resets the control, which
 * makes it untouched again and hides its message; held in the component the flag outlived
 * the reset, and an emptied required field showed "Required field" the moment Reset was
 * pressed (measured on a real app). `resetControlProp` clears it with the value.
 */
export function useFieldValidity(ctl: string) {
  const page = useContext(PageScope);
  const slot = useRowScopedName(page, ctl);
  const touched = useUnscopedProp<unknown>(page, slot, TOUCHED_PROP) === true;
  const message = useControlProp<unknown>(page, ctl, 'ValidationMessage');
  const text = typeof message === 'string' ? message : '';
  const show = touched && text !== '';
  return {
    show,
    message: show ? text : '',
    /** Spread onto the field element; marks the field touched when focus leaves. */
    onBlur: () => setUnscopedProp(page, slot, TOUCHED_PROP, true),
  };
}

/**
 * A CONTAINER's authored click rule, fired only for clicks on the container ITSELF.
 *
 * A DOM click bubbles up from whatever was clicked, so a panel or page container with a
 * click rule received every click on every control inside it. Apps does not do that: a
 * page may have a click rule on the container holding all its details ("open page X in
 * me"), and in Apps choosing a radio option inside it leaves it alone — here the same
 * click replaced the whole details panel. The rule now
 * fires only when the nearest control to the click is this container.
 */
export function ownClick(p: UiBaseProps): ((e: MouseEvent<HTMLElement>) => void) | undefined {
  if (!p.onClick) return undefined;
  return (e) => {
    const hit = (e.target as Element).closest?.('[data-uiapp-name]');
    if (hit && hit !== e.currentTarget) return;
    fireRule(p.onClick);
  };
}

/** Provenance and common DOM attributes, spread by every component. */
export function baseAttrs(p: UiBaseProps & { e2e?: string }) {
  const prov = PROVENANCE[p.ctl];
  return {
    className: cx(p.className, p.extraClass),
    style: p.style,

    title: p.title === undefined || p.title === null ? undefined : String(p.title),
    'data-e2e': p.e2e,
    'data-uiapp-id': prov?.id,
    'data-uiapp-name': p.ctl,

    'aria-label': p.ariaLabel === undefined || p.ariaLabel === null || p.ariaLabel === ''
      ? undefined : String(p.ariaLabel),
    role: p.role === undefined || p.role === null || p.role === '' ? undefined : String(p.role),
  };
}

/**
 * Apps removes a hidden control from layout rather than making it invisible, so
 * hidden must not render.
 */
export function isHidden(p: UiBaseProps): boolean {
  return p.hidden === true;
}

/** One object URL per distinct Blob. */
const objectUrls = new WeakMap<Blob, string>();

/**
 * A `url` property is not always a string: an `AppsFile` from a download rule (`URL`),
 * an inline `new AppsFile("data:...")` literal (`dataUrl`), a `File` off a picker, or a
 * plain URL string.
 */
export function resolveUrl(url: unknown): string | undefined {
  if (typeof url === 'string') return url || undefined;
  if (url instanceof Blob) {
    let u = objectUrls.get(url);
    if (!u) {
      u = URL.createObjectURL(url);
      objectUrls.set(url, u);
    }
    return u;
  }
  if (url && typeof url === 'object') {
    const f = url as AppsFile & { dataUrl?: string };
    return f.URL || f.dataUrl || undefined;
  }
  return undefined;
}

/** Object URLs already made for attachments, keyed by their Path — one download per file. */
const attachmentUrls = new Map<string, Promise<string>>();

/**
 * A URL for whatever an image or viewer was handed, resolved the way Apps' file loader
 * resolves it: a string or inline file at once; an ENTITY ATTACHMENT (a record's file
 * field, `{ Path, EntityId, RecordId, … }`) by downloading it through the platform and
 * showing the bytes.
 *
 * IN FLIGHT IS NOT THE SAME AS UNRESOLVABLE, which is why this reports `loading`
 * separately rather than answering `undefined` for both. It used to answer undefined for
 * either, and the caller could only read that as failure: opening an Edit popup on a
 * record with a photo showed "Unable to render image" for as long as the download took,
 * and then the photo appeared. The control announced a failure that had not happened and
 * then contradicted itself. Apps shows a loader for exactly that interval.
 *
 * FOUR answers, which is what Apps' own image control distinguishes
 * (`image.component.ts`, `_resolveSource`):
 *   loading                  the download is in flight — Apps shows a spinner
 *   url set                  resolved
 *   failed                   a source WAS given and could not be fetched — the placeholder
 *   none of the above        NO source was ever given — Apps renders nothing at all
 *
 * The last two are the ones worth separating. Apps calls `_resetImage()` when the url
 * property resolves to nothing, leaving error FALSE, so an unbound image is an empty box;
 * it sets error only in the catch, or from the `<img>` element's own error event. A
 * caller that cannot tell them apart prints "Unable to render image" under every image
 * control the designer left unbound — which is a failure notice for a control that was
 * never asked to show anything.
 */
export function useResolvedUrl(url: unknown):
{ url: string | undefined; loading: boolean; failed: boolean } {
  const direct = isEntityAttachment(url) ? undefined : resolveUrl(url);
  const path = isEntityAttachment(url) ? url.Path : undefined;
  const [downloaded, setDownloaded] = useState<{ path: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!path || !isEntityAttachment(url)) return;
    let live = true;
    let pending = attachmentUrls.get(path);
    if (!pending) {
      // Registered by the data layer when the app has one; a data-free app has no way to
      // fetch an attachment and shows the placeholder.
      const download = attachmentResolvers.download;
      pending = download
        ? download(url).then((blob) => URL.createObjectURL(blob))
        : Promise.reject(new Error('no data layer to download attachments with'));
      attachmentUrls.set(path, pending);
    }
    pending.then(
      (u) => { if (live) setDownloaded({ path, url: u }); },
      (err: unknown) => {
        attachmentUrls.delete(path);
        // eslint-disable-next-line no-console
        console.error('[uiapp-convert] attachment ' + path + ' could not be downloaded', err);
        if (live) setDownloaded({ path, url: null });
      },
    );
    return () => { live = false; };
  }, [path]);
  // Nothing to download: a string or an inline file is already resolved, and an empty
  // binding is simply empty. Neither is ever "loading", and neither has FAILED —
  // an unbound image is Apps' `_resetImage()`, which leaves its error flag false.
  if (!path) return { url: direct, loading: false, failed: false };
  /*
   * The answer belongs to THIS path. `downloaded` still holds the previous row's result
   * for a render or two after the binding changes, and reading it as this path's answer
   * would flash the old photo — or the old failure — under the new record.
   */
  const settled = downloaded?.path === path;
  if (!settled) return { url: undefined, loading: true, failed: false };
  // Settled with no url means the download REJECTED: Apps' catch branch, not its reset.
  return { url: downloaded.url ?? undefined, loading: false, failed: downloaded.url === null };
}

/**
 * Save a file value, resolving a job attachment's read link first.
 *
 * A job attachment rebuilt from a list row carries only its id. The data layer, when the
 * app has one, turns that into the platform's read link — the same kind of link a storage
 * bucket download hands back — and the file is saved from there. No token is added here:
 * the link is followed as the platform issued it.
 */
export async function saveResolvedFile(value: unknown, name: string): Promise<void> {
  const direct = resolveUrl(value);
  if (direct) return saveFile(direct, name);
  if (!isJobAttachment(value)) return;
  const resolve = attachmentResolvers.jobAttachment;
  if (!resolve) {
    // eslint-disable-next-line no-console
    console.error('[uiapp-convert] no data layer to open job attachment ' + value.Id + ' with');
    return;
  }
  try {
    return saveFile(await resolve(value.Id), name);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[uiapp-convert] job attachment ' + value.Id + ' could not be opened', err);
  }
}

/**
 * Hand a file to the browser, following Apps' `downloadFile`: HEAD the URL, then click a
 * synthetic `<a download>`, else open it in a tab. blob:/data: URLs skip the probe.
 */
export async function saveFile(href: string, name: string): Promise<void> {
  const local = href.startsWith('blob:') || href.startsWith('data:');
  try {
    if (local || (await fetch(href, { method: 'HEAD' })).ok) {
      const a = document.createElement('a');
      a.href = href;
      a.setAttribute('download', name);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
  } catch {
  }
  if (/^https?:/i.test(href)) window.open(href, '_blank');
}

export function fileDisplayName(url: unknown): string {
  if (url instanceof Blob) return (url as File).name ?? '';
  const f = (url ?? {}) as AppsFile & { name?: string };
  if (typeof url !== 'string') {
    if (f.FullName) return f.FullName;
    if (f.Name) return f.Name;
    if (f.name) return f.name;
  }
  const href = resolveUrl(url);
  if (!href) return '';

  const last = (href.split(/[?#]/)[0] ?? '').split('/').pop() ?? '';
  try {
    return decodeURIComponent(last);
  } catch {
    // A stray % is not a malformed file name worth discarding the name over.
    return last;
  }
}
