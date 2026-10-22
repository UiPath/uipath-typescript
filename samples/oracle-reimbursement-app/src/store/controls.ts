/** Control-level state accessors. */
import { useCallback, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from './hooks';
import {
  controlKey, pushMessageAction, setControlPropAction, setSourceAction, store, useRowScopedName,
  type SourceState,
} from './store';

const EMPTY: SourceState = { data: [], totalRecords: 0, loading: false };

export interface ControlSource<T> {
  data: T[];
  totalRecords: number;
  loading: boolean;
  error?: string;
  /** Spread onto a data-bound component: `{...source.bind}`. */
  bind: { items: T[]; loading: boolean };
}

/** A control's evaluated data source. */
export function useControlSource<T>(page: string, control: string): ControlSource<T> {
  const s = useAppSelector((st) => st.sources[controlKey(page, control)]) ?? EMPTY;
  return {
    data: s.data as T[],
    totalRecords: s.totalRecords,
    loading: s.loading,
    error: s.error,
    bind: { items: s.data as T[], loading: s.loading },
  };
}

/** A control's two-way value, as a `[value, setValue]` tuple. */
export function useControlValue<T>(
  page: string, control: string, prop = 'Value',
): [T | undefined, (value: T) => void] {
  // Inside a list row this is the row's own instance; see RowScope.
  const name = useRowScopedName(page, control);
  const value = useAppSelector((st) => st.controls[controlKey(page, name)]?.[prop]) as T | undefined;
  const dispatch = useAppDispatch();
  const set = useCallback(
    (v: T) => dispatch(setControlPropAction({ page, control: name, prop, value: v })),
    [dispatch, page, name, prop],
  );
  return [value, set];
}

/** Marks an event whose rules are not yet converted. */
const warned = new Set<string>();
export function pendingRules(page: string, control: string, event: string, methods: string[]): void {
  const key = `${page}/${control}/${event}`;
  if (warned.has(key)) return;
  warned.add(key);
  // eslint-disable-next-line no-console
  console.warn(
    `[uiapp-convert] rules not yet converted for ${key}: ${methods.join(', ')}. ` +
    'See conversion-report.json.',
  );
}

/** Run a control's source binding and put the rows in the store. */
function normaliseRows(value: unknown): { data: unknown[]; totalRecords: number } {
  if (value === null || value === undefined) return { data: [], totalRecords: 0 };
  if (Array.isArray(value)) return { data: value, totalRecords: value.length };
  /*
   * A data-source workflow's out-arguments. Apps reads them as `UiPathQueryOutputRecords || []`
   * and `UiPathQueryTotalRecords || 0` (`workflowResponseHandler`), and so does this.
   */
  const w = value as { UiPathQueryOutputRecords?: unknown; UiPathQueryTotalRecords?: unknown };
  if (typeof value === 'object' && ('UiPathQueryOutputRecords' in w || 'UiPathQueryTotalRecords' in w)) {
    return {
      data: Array.isArray(w.UiPathQueryOutputRecords) ? w.UiPathQueryOutputRecords : [],
      totalRecords: Number(w.UiPathQueryTotalRecords) || 0,
    };
  }
  const o = value as { data?: unknown; totalRecords?: unknown };
  if (Array.isArray(o.data)) {
    return {
      data: o.data,
      totalRecords: typeof o.totalRecords === 'number' ? o.totalRecords : o.data.length,
    };
  }
  return { data: [], totalRecords: 0 };
}

export function useControlSourceLoader(
  page: string, control: string, load: () => unknown, deps: unknown[] = [],
): void {
  const key = controlKey(page, control);
  // What the rows depend on, as a string, so a remount can tell whether they are current.
  const signature = JSON.stringify(deps, (_k, v: unknown) => (typeof v === 'bigint' ? String(v) : v));
  useEffect(() => {
    /*
     * Rows already loaded for these very dependencies are KEPT: Apps evaluates a page's
     * data bindings once and re-evaluates them only when something they read changes,
     * so re-opening a popup does not re-query its dropdown's entity. Re-fetching on every
     * mount sent a query Apps never sends and flashed the field empty each time.
     */
    const cached = store.getState().sources[key];
    if (cached && !cached.loading && cached.error === undefined && cached.signature === signature) return;
    let cancelled = false;
    store.dispatch(setSourceAction({ key, source: { data: [], totalRecords: 0, loading: true, signature } }));
    /*
     * The loader is CALLED inside the promise chain, not before it: a source
     * expression that throws SYNCHRONOUSLY — `JObject.Parse` on an action input the host
     * never sent, say — threw straight out of the effect, past the rejection handler
     * below, and React tore the control down: a list of four rows rendered as
     * "List1: could not render". Apps evaluates every expression on its own and
     * contains the failure, so a broken SOURCE must cost only its own rows.
     */
    Promise.resolve().then(load).then(
      (value) => {
        if (cancelled) return;
        const r = normaliseRows(value);
        /*
         * The ONLY place the rows are written. `Control.DataSource` reads resolve to this
         * entry (see `useControlProp` in lib/runtime), so a caption's
         * `List.DataSource.totalRecords` finds the count here; a copy of the rows used to
         * be written into the controls slice for that, which gave the property one shape
         * before the fetch and another after it.
         */
        store.dispatch(setSourceAction({
          key, source: { data: r.data, totalRecords: r.totalRecords, loading: false, signature },
        }));
      },
      (err: unknown) => {
        if (cancelled) return;
        // Said out loud: a grid reading "No data" over a failed fetch looked like an empty
        // entity, and nothing anywhere named the cause.
        // eslint-disable-next-line no-console
        console.error('[uiapp-convert] rows for ' + page + '.' + control + ' could not be loaded: ' + String(err), err);
        // And shown, as Apps shows it (measured live: its "Entity Error" toast with these words).
        store.dispatch(pushMessageAction({
          title: 'Entity Error', type: 'error', position: 'top', seconds: 8,
          message: 'Unable to fetch data for entity. Please reload page or contact your administrator',
        }));
        store.dispatch(setSourceAction({
          key,
          source: { data: [], totalRecords: 0, loading: false, error: String(err), signature },
        }));
      },
    );
    return () => { cancelled = true; };
  }, [key, ...deps]);
}

export { store };
