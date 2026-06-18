import { useMemo } from 'react'
import { ListChecks } from 'lucide-react'
import { Badge } from '@uipath/apollo-wind/components/ui/badge'
import { Skeleton } from '@uipath/apollo-wind/components/ui/skeleton'
import { useChoiceSets } from '../hooks/useChoiceSets'
import { ChoiceSetView } from './ChoiceSetView'

interface Props {
  choiceSetId: string
}

/**
 * Right-pane detail view for one ChoiceSet.
 *
 * ChoiceSets aren't entities — they have a separate SDK service
 * (`ChoiceSetServiceModel`), so we can't reuse `EntityDetail` here.
 * `Entities.getById()` returns a sparse object on choice-set IDs (no
 * `fields` array), which crashes the entity column-config builder.
 *
 * Composition:
 *  - Header: pulls metadata (display name, description, createdBy,
 *    updatedTime) from `ChoiceSets.getAll()` — already cached at the
 *    sidebar level, but a small refetch here is cheap.
 *  - Body: `<ChoiceSetView>` renders the list of values via
 *    `ChoiceSets.getById()`.
 *
 * The two ChoiceSet SDK methods are the full surface, and both run here
 * (one for the header metadata, one for the values).
 */
export function ChoiceSetDetail({ choiceSetId }: Props) {
  const { choiceSets, loading } = useChoiceSets()
  const metadata = useMemo(
    () => choiceSets.find((cs) => cs.id === choiceSetId),
    [choiceSets, choiceSetId],
  )

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ListChecks className="h-5 w-5 text-muted-foreground shrink-0" />
              {loading && !metadata ? (
                <Skeleton className="h-7 w-48" />
              ) : (
                <h2 className="text-xl font-semibold truncate">
                  {metadata?.displayName || metadata?.name || 'Choice set'}
                </h2>
              )}
              <Badge variant="secondary">Choice set</Badge>
            </div>
            {metadata?.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {metadata.description}
              </p>
            )}
            {metadata && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                {metadata.name && (
                  <span>
                    System name:{' '}
                    <code className="font-mono text-foreground/70">
                      {metadata.name}
                    </code>
                  </span>
                )}
                {metadata.updatedTime && (
                  <span>
                    Last updated{' '}
                    {new Date(metadata.updatedTime).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <ChoiceSetView choiceSetId={choiceSetId} />
      </div>
    </div>
  )
}
