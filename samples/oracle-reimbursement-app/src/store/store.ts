/** App state. One Redux Toolkit slice, three concerns: */
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createContext, useContext } from 'react';
import { APP_VAR_DEFAULTS, CONTROL_DEFAULTS } from './defaults';

export interface SourceState {
  data: unknown[];
  totalRecords: number;
  loading: boolean;
  error?: string;
  /** The dependency values the rows were loaded for — see `useControlSourceLoader`. */
  signature?: string;
}

export interface UiMessage {
  id: number;
  title?: string;
  message?: string;
  position?: 'top' | 'bottom';
  type?: 'info' | 'success' | 'warning' | 'error';
  seconds?: number;
}

export interface AppState {
  appVars: Record<string, unknown>;
  /** Keyed `Page/Control` -> property -> value. */
  controls: Record<string, Record<string, unknown>>;
  sources: Record<string, SourceState>;
  /** Per-entity write counters — see `bumpEntityVersionAction`. */
  entityVersions: Record<string, number>;
  /** Output arguments of the last run of each process, keyed by process name. */
  processOutputs: Record<string, Record<string, unknown>>;
  /** What each named RULE INSTANCE left behind, keyed `page/control/rule`. */
  ruleOutcomes: Record<string, unknown>;
  spinner: { show: boolean; message?: string };
  messages: UiMessage[];
  popoverOpen: boolean;
  /**
   * A page opened AS AN OVERLAY. Apps' `openPage` with `asPopOver`/`asBottomSheet`
   * floats another page over the current one instead of navigating away; the app shell
   * renders it in a dialog. `null` when nothing is floating.
   */
  modal: { page: string; preventCloseOnClick?: boolean; bottomSheet?: boolean } | null;
  /** A yes/no question on screen — Apps' confirmation dialog, e.g. before a grid row is deleted. */
  confirm: { heading: string; message: string; yes: string; no: string } | null;
}

export const controlKey = (page: string, control: string) => `${page}/${control}`;

// ── one instance per LIST ROW ────────────────────────────────────────────────
/**
 * The list row a control instance belongs to. The custom list provides it around each
 * row it renders; outside a row it is null.
 *
 * A control inside a row template is ONE authored control but N rendered instances,
 * and Apps keeps a value per instance — pick an answer in row 2 and row 3 keeps its own.
 * Keyed on (page, control) alone, every row shared one slot, so choosing in one row
 * changed the dropdown in every row. The instance name carries the row:
 * `Q1_Dropdown@RadioQuestions_List#2`.
 */
/*
 * `select` is how a field inside the row marks the row selected — Apps'
 * `internalValueChangeEvent`. The list also selects on a bubbling click, but a dropdown
 * opens on pointer-down and its options render in a portal outside the row, so with a
 * real mouse no click ever reached the row and nothing was selected: the very next change
 * rule updated record `undefined` ("Unable to update value") while the field itself
 * happily showed the chosen value.
 */
/*
 * `key` is the row's IDENTITY, and it is what names the slot — not its position.
 *
 * Slots were keyed `…@List#2`, the row's index. Rows move: a refetch, a filter or a delete
 * shifts every record after the change, and the answer typed against the record that WAS
 * second then showed against whichever record is second now — and `SelectedItem`, which
 * IS the record, submitted it there. The list computes the key from the record's Id when
 * it has one, so the slot follows the record wherever it lands; a row with no identity
 * falls back to its index, and the list drops those slots whenever its rows change,
 * because position is all they had.
 */
export const RowScope = createContext<{ list: string; index: number; key: string; select?: () => void } | null>(null);

/** page/control -> the list whose template declares it, learned from the first scoped render. */
const rowOwner = new Map<string, string>();

/** The store name for THIS row's instance of a control — the bare name outside a row. */
export function useRowScopedName(page: string, control: string): string {
  const scope = useContext(RowScope);
  if (!scope) return control;
  rowOwner.set(controlKey(page, control), scope.list);
  return `${control}@${scope.list}#${scope.key}`;
}

/**
 * The imperative twin, for handlers and expressions outside any row: a template control
 * named from there means the SELECTED row's instance — `List.SelectedItem.Q1_Dropdown
 * .Value` is how Apps spells it, and a row is selected the moment a control in it is
 * touched. A control no row has rendered resolves to its bare name.
 */
export function resolveRowName(page: string, control: string): string {
  if (control.includes('@')) return control;
  const list = rowOwner.get(controlKey(page, control));
  if (!list) return control;
  // The selected row's KEY, published by the list on selection — an Id where the record has
  // one, its index otherwise — so this resolves to the same slot the row itself wrote.
  const key = store.getState().controls[controlKey(page, list)]?.SelectedItemKey;
  return typeof key === 'string' ? `${control}@${list}#${key}` : control;
}

/**
 * Forget every row slot a list's template controls hold — `<page>/<control>@<list>#<key>`
 * for any control and any key.
 *
 * Called by a list whose rows carry no identity when its rows CHANGE. Those slots are named
 * by position, and after a refetch, a filter or a delete the positions mean different
 * records; keeping them would show one record's answer against another. A list whose rows
 * have Ids never needs this: its slots are named by the record and cannot drift.
 */
export function clearRowSlots(page: string, list: string): void {
  store.dispatch(clearRowSlotsAction({ page, list }));
}

const initialState: AppState = {
  appVars: { ...APP_VAR_DEFAULTS },
  controls: structuredClone(CONTROL_DEFAULTS),
  sources: {},
  entityVersions: {},
  processOutputs: {},
  ruleOutcomes: {},
  spinner: { show: false },
  messages: [],
  popoverOpen: false,
  modal: null,
  confirm: null,
};

let messageId = 0;

const slice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    /**
     * One counter per ENTITY, bumped by every create/update/delete against it.
     * Data sources over the entity subscribe to it as an effect dependency, so a
     * write re-runs their Fetch — the re-evaluation Apps performs itself. Without
     * this, a successful update changed the SERVER and nothing on screen.
     */
    bumpEntityVersionAction(state, a: PayloadAction<string>) {
      state.entityVersions[a.payload] = (state.entityVersions[a.payload] ?? 0) + 1;
    },
    setAppVarAction(state, a: PayloadAction<{ name: string; value: unknown }>) {
      state.appVars[a.payload.name] = a.payload.value;
    },
    resetAppVarAction(state, a: PayloadAction<string>) {
      state.appVars[a.payload] = APP_VAR_DEFAULTS[a.payload];
    },
    setControlPropAction(
      state,
      a: PayloadAction<{ page: string; control: string; prop: string; value: unknown }>,
    ) {
      const key = controlKey(a.payload.page, a.payload.control);
      (state.controls[key] ??= {})[a.payload.prop] = a.payload.value;
    },
    resetControlPropAction(
      state,
      a: PayloadAction<{ page: string; control: string; prop: string }>,
    ) {
      const key = controlKey(a.payload.page, a.payload.control);
      const def = CONTROL_DEFAULTS[key]?.[a.payload.prop];
      const slot = (state.controls[key] ??= {});
      /*
       * No default means the AUTHORED value applies again, so the slot is emptied rather
       * than set to `undefined`. A component takes a store value over its authored prop
       * whenever the key is present: written as `undefined`, a Reset blanked an authored
       * label and showed a control authored hidden.
       */
      if (def === undefined) delete slot[a.payload.prop];
      else slot[a.payload.prop] = def;
    },
    /**
     * Every control of ONE page back to its authored defaults.
     *
     * Apps builds a fresh page model each time a page opens as a popup or bottom sheet
     * (`openModalDialog` -> `createFormModel`) and runs its load rules again, so the
     * popup starts clean every time. This store outlives the popup, and without this
     * an Add form reopened after a save still showed the previous record's fields.
     */
    clearRowSlotsAction(state, a: PayloadAction<{ page: string; list: string }>) {
      const pagePrefix = a.payload.page + '/';
      const marker = '@' + a.payload.list + '#';
      for (const key of Object.keys(state.controls)) {
        if (key.startsWith(pagePrefix) && key.includes(marker)) delete state.controls[key];
      }
    },
    resetPageControlsAction(state, a: PayloadAction<string>) {
      const prefix = a.payload + '/';
      for (const key of Object.keys(state.controls)) {
        if (key.startsWith(prefix)) delete state.controls[key];
      }
      for (const [key, defaults] of Object.entries(CONTROL_DEFAULTS)) {
        if (key.startsWith(prefix)) state.controls[key] = structuredClone(defaults);
      }
    },
    setProcessOutputAction(
      state, a: PayloadAction<{ process: string; output: Record<string, unknown> }>,
    ) {
      state.processOutputs[a.payload.process] = a.payload.output;
    },
    setRuleOutcomeAction(
      state, a: PayloadAction<{ key: string; outcome: unknown }>,
    ) {
      state.ruleOutcomes[a.payload.key] = a.payload.outcome;
    },
    setSourceAction(state, a: PayloadAction<{ key: string; source: SourceState }>) {
      state.sources[a.payload.key] = a.payload.source;
    },
    setSpinnerAction(state, a: PayloadAction<{ show: boolean; message?: string }>) {
      state.spinner = a.payload;
    },
    pushMessageAction(state, a: PayloadAction<Omit<UiMessage, 'id'>>) {
      state.messages.push({ id: ++messageId, ...a.payload });
    },
    dismissMessageAction(state, a: PayloadAction<number>) {
      state.messages = state.messages.filter((m) => m.id !== a.payload);
    },
    setPopoverAction(state, a: PayloadAction<boolean>) {
      state.popoverOpen = a.payload;
    },
    askConfirmAction(state, a: PayloadAction<NonNullable<AppState['confirm']>>) {
      state.confirm = a.payload;
    },
    answerConfirmAction(state) {
      state.confirm = null;
    },
    openModalAction(state, a: PayloadAction<AppState['modal']>) {
      state.modal = a.payload;
    },
    closeModalAction(state) {
      state.modal = null;
    },
  },
});

export const {
  bumpEntityVersionAction,
  setAppVarAction, resetAppVarAction,
  setControlPropAction, resetControlPropAction, resetPageControlsAction, clearRowSlotsAction,
  setSourceAction, setSpinnerAction, setProcessOutputAction, setRuleOutcomeAction,
  pushMessageAction, dismissMessageAction, setPopoverAction,
  openModalAction, closeModalAction, askConfirmAction, answerConfirmAction,
} = slice.actions;

export const store = configureStore({
  reducer: slice.reducer,
  middleware: (getDefault) =>

    getDefault({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
