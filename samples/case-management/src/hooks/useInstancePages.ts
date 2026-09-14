import { useEffect, useRef, useState } from 'react';
import type { PaginationCursor } from '@uipath/uipath-typescript/core';
import { useAuth } from '@/hooks/useAuth';
import { listCaseInstancesPage } from '@/lib/sdk';
import type { CaseInstance } from '@/lib/types';

/**
 * Server-side cursor pagination over case instances, optionally scoped to a
 * single case process (processKey). Fetches ONE page at a time, on demand.
 */
export function useInstancePages(pageSize = 25, processKey?: string) {
  const { sdk } = useAuth();
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<CaseInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const cursors = useRef<(PaginationCursor | undefined)[]>([undefined]);

  // Reset pagination when the scope (processKey) changes.
  useEffect(() => {
    cursors.current = [undefined];
    setPage(0);
  }, [processKey]);

  useEffect(() => {
    // Per-run cancellation flag captured in this closure (not a shared ref) so a
    // slow prior page fetch can't overwrite a newer one's result.
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await listCaseInstancesPage(sdk, { pageSize, cursor: cursors.current[page], processKey });
        if (!alive) return;
        setItems(res.items);
        setHasNext(!!res.hasNextPage && !!res.nextCursor);
        if (res.nextCursor) cursors.current[page + 1] = res.nextCursor;
      } catch (e: unknown) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [sdk, page, pageSize, processKey]);

  return { items, page, setPage, hasNext, loading, error, pageSize };
}
