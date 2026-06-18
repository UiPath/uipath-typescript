import { ListChecks, RefreshCw } from 'lucide-react'
import { useChoiceSet } from '../hooks/useChoiceSet'
import { Spinner } from '@uipath/apollo-wind/components/ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '@uipath/apollo-wind/components/ui/alert'
import { Button } from '@uipath/apollo-wind/components/ui/button'

interface Props {
  choiceSetId: string
}

/**
 * Renders the values inside a Data Fabric ChoiceSet.
 *
 * ChoiceSets aren't regular entities — they don't have user-defined records,
 * just a fixed list of values (think: "Status: Open / Pending / Closed").
 * `Entities.getAllRecords()` doesn't work on them; we use the dedicated
 * `ChoiceSets.getById()` instead (via `useChoiceSet`).
 *
 * The values are read-only here. The SDK's `ChoiceSets` service only
 * exposes `getAll()` (used in the sidebar) and `getById()` (used here) —
 * to edit choice-set values, use the Data Service UI in Automation Cloud.
 */
export function ChoiceSetView({ choiceSetId }: Props) {
  const { values, loading, error, reload } = useChoiceSet(choiceSetId)

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Choice values{' '}
          {values.length > 0 && (
            <span className="text-foreground">· {values.length}</span>
          )}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={reload}
          disabled={loading}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Couldn't load choice set</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        {loading ? (
          <div className="p-6 flex justify-center">
            <Spinner label="Loading values…" showLabel />
          </div>
        ) : values.length === 0 && !error ? (
          <div className="px-3 py-12 text-center">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-2 text-muted-foreground">
              <ListChecks className="h-6 w-6" />
            </div>
            <span className="text-sm text-muted-foreground">
              This choice set has no values yet.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase tracking-wide">
                <tr className="border-b">
                  <th className="px-3 py-2 font-medium w-12">#</th>
                  <th className="px-3 py-2 font-medium">Display name</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Number ID</th>
                </tr>
              </thead>
              <tbody>
                {values.map((v, i) => (
                  <tr
                    key={v.id}
                    className="border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">{v.displayName}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {v.name}
                    </td>
                    <td className="px-3 py-2">{v.numberId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
