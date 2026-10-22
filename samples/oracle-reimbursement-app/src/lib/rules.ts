/** The runtime behind the converted rules. */
import {
  closeModalAction, dismissMessageAction, openModalAction, pushMessageAction,
  resetPageControlsAction, setPopoverAction, setRuleOutcomeAction, setSpinnerAction, store,
  askConfirmAction, answerConfirmAction,
} from '../store/store';
import { ruleKey, setControlProp } from './runtime';
import { ROUTES } from '../routes';

/** Record what a named rule instance left behind, for expressions to read back. */
export function setRuleOutcome(
  page: string, control: string, rule: string, outcome: unknown,
): void {
  store.dispatch(setRuleOutcomeAction({ key: ruleKey(page, control, rule), outcome }));
}

/** Set by the router shell so imperative rules can navigate. */
let navigateFn: ((to: string) => void) | null = null;
export function setNavigator(fn: (to: string) => void): void {
  navigateFn = fn;
}

export interface OpenPageOptions {
  asPopOver?: boolean;
  asBottomSheet?: boolean;
  preventCloseOnClick?: boolean;
  container?: unknown;
}

/** Navigate to a page by its AUTHORED name. */
export function openPage(page: unknown, options: OpenPageOptions = {}): void {
  const pageName = String(page ?? '');
  const route = ROUTES[pageName];
  if (!route) {
    // eslint-disable-next-line no-console
    console.error(`[uiapp-convert] openPage: no route for page "${pageName}"`);
    return;
  }
  /*
   * "Open page X in container Y" swaps the page a PAGE CONTAINER shows, in place — the
   * rest of the current page stays. `UiPageContainer` reads this slot ahead of its
   * authored page. Navigating instead (the old behaviour) replaced the whole screen
   * with the target page: picking a category on a start page threw the user onto a bare
   * list instead of revealing it under the details already on screen.
   */
  if (options.container) {
    const c = options.container as { page?: string; control?: string };
    if (c?.page && c?.control) {
      setControlProp(c.page, c.control, 'EmbeddedPage', pageName);
      return;
    }
    /*
     * Apps, when it cannot locate the container's page: an error message at the top and
     * NO navigation (`handlePageContainerWithDetails` returns null and the rule ends).
     * Navigating instead replaced the whole screen with the target page — the very
     * behaviour the container branch above exists to prevent.
     */
    const detail = `The page container's form is undefined for the vb-open-page & could not be located`;
    // eslint-disable-next-line no-console
    console.error(`[uiapp-convert] openPage("${pageName}"): ${detail}`);
    showMessage({ type: 'error', position: 'top', message: detail });
    return;
  }
  /*
   * A popover / bottom-sheet FLOATS the page over the current one — it does not
   * navigate. The app shell renders `state.modal` in a dialog; here we just record
   * which page, keyed by its authored name so the overlay can look it up in `PAGES`.
   */
  if (options.asPopOver || options.asBottomSheet) {
    /*
     * A popup is a NEW page model in Apps (`openModalDialog` creates one and runs the
     * page's load rules), so its controls start at their authored defaults every time.
     * Reset first: the page's load rules run again when it mounts.
     */
    store.dispatch(resetPageControlsAction(pageName));
    store.dispatch(openModalAction({
      page: pageName,
      preventCloseOnClick: !!options.preventCloseOnClick,
      bottomSheet: !!options.asBottomSheet,
    }));
    return;
  }
  if (!navigateFn) {
    // eslint-disable-next-line no-console
    console.error('[uiapp-convert] openPage called before the navigator was registered');
    return;
  }
  navigateFn(route);
}

/*
 * `unknown`, not `string`: the url is an authored expression, and an action-app
 * property read (`getActionProp<string>()`) is `string | undefined` until the task
 * arrives. Typing the parameter `string` failed the generated project's typecheck on
 * every `openUrl(getActionProp(...))` — any help link bound to an action input.
 */
export function openUrl(url: unknown, options: { newTab?: boolean } = {}): void {
  if (typeof url !== 'string' || !url) return;
  if (options.newTab) window.open(url, '_blank', 'noopener,noreferrer');
  else window.location.assign(url);
}

export interface ShowMessageOptions {
  title?: string;
  message?: string;
  position?: 'top' | 'bottom';
  type?: 'info' | 'success' | 'warning' | 'error';
  seconds?: number;
}

export function showMessage(options: ShowMessageOptions): void {
  const before = store.getState().messages.length;
  store.dispatch(pushMessageAction(options));
  const pushed = store.getState().messages[before];
  const seconds = options.seconds ?? 0;
  if (pushed && seconds > 0) {
    setTimeout(() => store.dispatch(dismissMessageAction(pushed.id)), seconds * 1000);
  }
}

/** Dismiss one message. The overlay host calls this when a message is clicked. */
export function dismissMessage(id: number): void {
  store.dispatch(dismissMessageAction(id));
}

export function showSpinner(show: boolean, options: { message?: string } = {}): void {
  store.dispatch(setSpinnerAction({ show: !!show, message: options.message }));
}

export function closePopover(): void {
  store.dispatch(setPopoverAction(false));
  // A page floated by `openPage(asPopOver)` is what "close" usually means.
  store.dispatch(closeModalAction());
}

/**
 * Fields attached to every subsequent log line, the way Orchestrator's log context works.
 *
 * Module state rather than a parameter, because that is what the activities model: Add Log
 * Fields sets them once and every later Log Message carries them until Remove Log Fields
 * takes them off again.
 */
const logFields: Record<string, unknown> = {};

// The dictionary in either spelling — a Map from ToDictionary, a plain object from a From
// initializer — and Nothing, which a workflow local can hold: nothing to add or remove.
export function addLogFields(fields: Map<unknown, unknown> | Record<string, unknown> | null | undefined): void {
  Object.assign(logFields, fields instanceof Map ? Object.fromEntries(fields) : fields ?? {});
}

export function removeLogFields(names: readonly string[] | null | undefined): void {
  for (const name of names ?? []) delete logFields[name];
}

/**
 * A diagnostic line.
 *
 * Five levels, because that is what the Log Message activity offers; the authored
 * show-message rule only ever passes three of them. There is no Orchestrator to send
 * these to from a browser, so they go to the console — which is where someone debugging
 * a converted app is already looking.
 */
export function logMessage(
  level: 'trace' | 'info' | 'warn' | 'error' | 'fatal',
  message: unknown,
): void {
  /* eslint-disable no-console */
  const sink = level === 'error' || level === 'fatal' ? console.error
    : level === 'warn' ? console.warn
      : console.info;
  /* eslint-enable no-console */
  const keys = Object.keys(logFields);
  const fields = keys.length ? ' ' + JSON.stringify(logFields) : '';
  sink(`[app] ${String(message ?? '')}${fields}`);
}

/** An awaitable pause, for a workflow's Delay. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, Math.max(0, ms)); });
}

/** A rule this converter does not yet emit. */
const warnedRules = new Set<string>();
export function unimplementedRule(method: string, reason: string): void {
  if (warnedRules.has(method)) return;
  warnedRules.add(method);
  // eslint-disable-next-line no-console
  console.warn(`[uiapp-convert] rule "${method}" is not converted: ${reason}`);
}

// ── confirmation ─────────────────────────────────────────────────────────────
let pendingConfirm: ((ok: boolean) => void) | null = null;

/**
 * Ask a yes/no question the way Apps does — its confirmation dialog, with a heading, a
 * message and two named buttons — and resolve with the answer. The browser's own
 * `confirm()` was used here once; it reads "localhost says", cannot be styled, and is not
 * what the low-code app shows.
 */
export function askConfirm(model: { heading: string; message: string; yes: string; no: string }): Promise<boolean> {
  pendingConfirm?.(false);
  store.dispatch(askConfirmAction(model));
  return new Promise<boolean>((resolve) => { pendingConfirm = resolve; });
}

/** The dialog's answer, from the overlay that renders it. */
export function answerConfirm(ok: boolean): void {
  store.dispatch(answerConfirmAction());
  const resolve = pendingConfirm;
  pendingConfirm = null;
  resolve?.(ok);
}
