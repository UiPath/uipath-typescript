import { Badge } from '@uipath/apollo-wind/components/ui/badge';

/**
 * The declared route, shown next to the data it produced.
 *
 * This is not decoration. The whole argument of the sample is that a function
 * can present itself as an ordinary REST resource, and the fastest way to make
 * that concrete is to put the route beside its result — so a reader can see that
 * `/invoices/INV-1001/lines/2` returned line 2 of INV-1001 and nothing else.
 */
export function Route({ method, path }: { method: 'GET' | 'POST'; path: string }) {
  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <Badge variant="secondary">{method}</Badge>
      <span className="text-muted-foreground">{path}</span>
    </div>
  );
}
