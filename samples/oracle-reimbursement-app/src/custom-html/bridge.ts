/**
 * What a Custom HTML control's `App.getVariable` / `setVariable` / `onVariableChange` reach:
 * this app's declared variables, and nothing else.
 */
import boot from './boot.js?raw';
import { getAppVar, setAppVar } from '../lib/runtime';
import { store } from '../store/store';

const APP_VARIABLES: ReadonlySet<string> = new Set(["Boolean_IsAdmin","Boolean_IsRefresh","Boolean_ItemInProgress","Boolean_MainCollapsed","Boolean_ReadOnly","ContentValidationData_CurrentItem","DataTable_OracleEvent","Dictionary_ActionData","Double_IndirectsModifier","ListSource_MilesDevItems","ListSource_MilesProdItems","List_Category","List_Discrepancies","List_MilesUsers","Miles_CurrentDEVItem","Miles_CurrentPRODItem","String_ActionRequest","String_ActionResult","String_CurrencySymbol","String_CurrentMilesItemId","String_InitialVisitDate","String_ItemsJson","String_LastRequestId","String_MainDraftJson","String_MainItemJson","String_MainRequest","String_MainResult","String_MilesRuntime","String_PagesToBeDeleted","String_StartTime","String_UserContextJson","VarValidationControl_MainPage"]);

export const customHtmlBridge = {
  boot,
  storageScope: "ID81f4127466034bf1bc56119d75a71b21",
  has: (name: string): boolean => APP_VARIABLES.has(name),
  get: (name: string): unknown => getAppVar(name),
  set: (name: string, value: unknown): void => setAppVar(name, value),
  subscribe: (listener: () => void): (() => void) => store.subscribe(listener),
};
