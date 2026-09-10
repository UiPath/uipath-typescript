import { Badge } from '@uipath/apollo-wind/components/ui/badge';
import { Card, CardContent } from '@uipath/apollo-wind/components/ui/card';
import { Separator } from '@uipath/apollo-wind/components/ui/separator';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { ReadCredentialOutput } from '../api';

/**
 * Proof of use, never the secret.
 *
 * The function returns a username, a length and a non-reversible fingerprint.
 * That is enough to show the credential resolved and was used — without the
 * page ever holding it, which is the whole reason the read happens in a
 * function instead of here.
 */
export function ReadResult({
  result,
  error,
}: {
  result: ReadCredentialOutput | null;
  error: string | null;
}) {
  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 font-medium">
            <XCircle className="size-4 text-destructive" />
            The function refused
          </div>
          {/* The function's own FunctionError text, verbatim — that is where the
              reason lives, and paraphrasing it would lose the lesson. */}
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CheckCircle2 className="size-4 text-success" />
          <span className="font-medium">Credential used</span>
          <Badge variant="outline">HTTP {result.httpStatus}</Badge>
          <Badge variant="secondary">robot identity</Badge>
        </div>

        <code className="block truncate rounded bg-muted px-2 py-1 text-xs">{result.route}</code>

        <Separator />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">username</dt>
          <dd className="font-mono">{result.username ?? '—'}</dd>
          <dt className="text-muted-foreground">secret length</dt>
          <dd className="font-mono">{result.secretLength}</dd>
          <dt className="text-muted-foreground">fingerprint</dt>
          <dd className="font-mono">{result.secretFingerprint ?? '—'}</dd>
        </dl>

        <p className="text-sm text-muted-foreground">{result.verdict}</p>
      </CardContent>
    </Card>
  );
}
