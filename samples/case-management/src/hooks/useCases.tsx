import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { listCaseDefinitions } from '@/lib/sdk';
import type { CaseDefinition } from '@/lib/types';

const SELECTED_KEY = 'uipath_selected_case_processkey';

function loadStoredKey(): string {
  try {
    return localStorage.getItem(SELECTED_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * Loads every Maestro case in the tenant and tracks which one this session is
 * scoped to. The scoped case is picked in the UI and persisted (localStorage);
 * a single-case tenant auto-selects. Every page is scoped to the selected case.
 */
interface CasesContextValue {
  /** processKey of the currently selected case ('' until one is chosen). */
  caseProcessKey: string;
  /** The resolved definition for the selected case (undefined if none selected). */
  caseDefinition: CaseDefinition | undefined;
  /** The selected case as a one-element list — for rollup helpers that take a list. */
  definitions: CaseDefinition[];
  /** Every case definition in the tenant — powers the case picker/switcher. */
  allDefinitions: CaseDefinition[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  /** Select (and persist) the case this session is scoped to. */
  selectCase: (processKey: string) => void;
}

const CasesContext = createContext<CasesContextValue | undefined>(undefined);

export const CasesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { sdk, isAuthenticated } = useAuth();
  const [allDefinitions, setAllDefinitions] = useState<CaseDefinition[]>([]);
  const [caseProcessKey, setCaseProcessKey] = useState<string>(loadStoredKey());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const selectCase = useCallback((processKey: string) => {
    setCaseProcessKey(processKey);
    try {
      localStorage.setItem(SELECTED_KEY, processKey);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Per-run cancellation flag captured in this closure (not a shared ref).
    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const defs = await listCaseDefinitions(sdk);
        if (!alive) return;
        setAllDefinitions(defs);
        // Resolve the scoped case: keep the persisted selection if it still
        // exists, else auto-select when there's only one, else show the picker.
        setCaseProcessKey((current) => {
          if (current && defs.some((d) => d.processKey === current)) return current;
          if (defs.length === 1) return defs[0].processKey;
          return '';
        });
      } catch (e: unknown) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [sdk, isAuthenticated, tick]);

  const caseDefinition = useMemo(
    () => allDefinitions.find((d) => d.processKey === caseProcessKey),
    [allDefinitions, caseProcessKey],
  );
  const definitions = useMemo(() => (caseDefinition ? [caseDefinition] : []), [caseDefinition]);

  return (
    <CasesContext.Provider
      value={{ caseProcessKey, caseDefinition, definitions, allDefinitions, loading, error, refresh, selectCase }}
    >
      {children}
    </CasesContext.Provider>
  );
};

export function useCases(): CasesContextValue {
  const ctx = useContext(CasesContext);
  if (!ctx) throw new Error('useCases must be used within CasesProvider');
  return ctx;
}
