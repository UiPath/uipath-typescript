import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Database,
  ListChecks,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useEntities } from '../hooks/useEntities'
import type { EntityListItem } from '../hooks/useEntities'
import { useChoiceSets } from '../hooks/useChoiceSets'
import type { ChoiceSetListItem } from '../hooks/useChoiceSets'
import { entityTypeTooltip, isVirtualDataObject } from '../lib/entityTypes'

interface Props {
  selectedEntityId: string | null
  selectedChoiceSetId: string | null
  onSelectEntity: (entityId: string) => void
  onSelectChoiceSet: (choiceSetId: string) => void
}

/**
 * Left sidebar listing every entity and choice set in the tenant.
 *
 * Data:
 *  - `useEntities()` calls `Entities.getAll()` for the entity catalog
 *    (choice-set entries are filtered out — they live in their own list).
 *  - `useChoiceSets()` calls `ChoiceSets.getAll()` for the choice set list.
 *
 * Sections are individually collapsible (chevron toggles) so users with
 * many entities can hide them to see choice sets, and vice versa.
 *
 * Includes a search filter (case-insensitive, matches display name + system
 * name across both sections) and a unified refresh button.
 */
export function EntitiesList({
  selectedEntityId,
  selectedChoiceSetId,
  onSelectEntity,
  onSelectChoiceSet,
}: Props) {
  const { entities, loading, error, refresh } = useEntities()
  const {
    choiceSets,
    loading: choiceSetsLoading,
    error: choiceSetsError,
    refresh: refreshChoiceSets,
  } = useChoiceSets()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return entities
    return entities.filter((e) => {
      return (
        e.displayName.toLowerCase().includes(needle) ||
        e.name.toLowerCase().includes(needle)
      )
    })
  }, [entities, search])

  const filteredChoiceSets = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return choiceSets
    return choiceSets.filter((cs) => {
      return (
        cs.displayName.toLowerCase().includes(needle) ||
        cs.name.toLowerCase().includes(needle)
      )
    })
  }, [choiceSets, search])

  const refreshAll = async () => {
    await Promise.all([refresh(), refreshChoiceSets()])
  }

  // Collapsed-state flags for each section. Defaults to open. A user with
  // 50+ entities can collapse that section to see choice sets without
  // scrolling. When the user searches, sections auto-expand temporarily so
  // search results aren't hidden behind a collapsed header.
  const [entitiesOpen, setEntitiesOpen] = useState(true)
  const [choiceSetsOpen, setChoiceSetsOpen] = useState(true)
  const showEntities = entitiesOpen || search.trim().length > 0
  const showChoiceSets = choiceSetsOpen || search.trim().length > 0

  return (
    // Fixed-layout sidebar: header + search are sticky, list scrolls.
    <aside className="w-72 border-r bg-background flex flex-col shrink-0 min-h-0">
      <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Catalog
        </h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={refreshAll}
              disabled={loading || choiceSetsLoading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  loading || choiceSetsLoading ? 'animate-spin' : ''
                }`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Refresh</TooltipContent>
        </Tooltip>
      </div>

      {/* Search input. Hidden during the initial load to keep the skeleton clean.
          Using a flex row instead of an absolutely-positioned icon — keeps the
          icon and text on the exact same baseline at any zoom level. */}
      {!loading && !error && entities.length > 0 && (
        <div className="px-3 py-2 border-b shrink-0">
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2.5 shadow-sm focus-within:ring-1 focus-within:ring-ring">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search entities & choice sets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scrolling list area. Two collapsible sections: Entities + Choice Sets. */}
      <div className="flex-1 overflow-y-auto">
        {/* ─── Entities section ─── */}
        <SectionHeader
          icon={<Database className="h-3.5 w-3.5" />}
          label="Entities"
          count={!loading && !error ? entities.length : undefined}
          open={showEntities}
          forcedOpen={search.trim().length > 0}
          onToggle={() => setEntitiesOpen((v) => !v)}
        />
        {showEntities && (
          <>
            {loading && (
              <div className="p-3 space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </div>
            )}
            {error && !loading && (
              <div className="p-3">
                <Alert variant="destructive">
                  <AlertTitle>Couldn't load entities</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}
            {!loading && !error && entities.length === 0 && (
              <EmptyState
                icon={<Database className="h-6 w-6" />}
                title="No entities yet"
                description="Define an entity in Data Service to get started."
              />
            )}
            {!loading &&
              !error &&
              entities.length > 0 &&
              filtered.length === 0 && (
                <div className="px-4 py-3 text-xs text-muted-foreground">
                  No entities match "{search}".
                </div>
              )}
            {!loading && !error && filtered.length > 0 && (
              <ul>
                {filtered.map((e) => (
                  <EntityRow
                    key={e.id}
                    entity={e}
                    selected={selectedEntityId === e.id}
                    onSelect={onSelectEntity}
                  />
                ))}
              </ul>
            )}
          </>
        )}

        {/* ─── Choice Sets section ─── */}
        <SectionHeader
          icon={<ListChecks className="h-3.5 w-3.5" />}
          label="Choice sets"
          count={
            !choiceSetsLoading && !choiceSetsError
              ? choiceSets.length
              : undefined
          }
          open={showChoiceSets}
          forcedOpen={search.trim().length > 0}
          onToggle={() => setChoiceSetsOpen((v) => !v)}
        />
        {showChoiceSets && (
          <>
            {choiceSetsLoading && (
              <div className="p-3 space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            )}
            {choiceSetsError && !choiceSetsLoading && (
              <div className="p-3">
                <Alert variant="destructive">
                  <AlertTitle>Couldn't load choice sets</AlertTitle>
                  <AlertDescription>{choiceSetsError}</AlertDescription>
                </Alert>
              </div>
            )}
            {!choiceSetsLoading &&
              !choiceSetsError &&
              choiceSets.length === 0 && (
                <EmptyState
                  icon={<ListChecks className="h-6 w-6" />}
                  title="No choice sets"
                  description="No choice sets defined in this tenant."
                />
              )}
            {!choiceSetsLoading &&
              !choiceSetsError &&
              choiceSets.length > 0 &&
              filteredChoiceSets.length === 0 && (
                <div className="px-4 py-3 text-xs text-muted-foreground">
                  No choice sets match "{search}".
                </div>
              )}
            {!choiceSetsLoading &&
              !choiceSetsError &&
              filteredChoiceSets.length > 0 && (
                <ul>
                  {filteredChoiceSets.map((cs) => (
                    <ChoiceSetRow
                      key={cs.id}
                      choiceSet={cs}
                      selected={selectedChoiceSetId === cs.id}
                      onSelect={onSelectChoiceSet}
                    />
                  ))}
                </ul>
              )}
          </>
        )}
      </div>
    </aside>
  )
}

/**
 * Compact section header inside the sidebar.
 *
 * Acts as a toggle button when `onToggle` is provided. While the user is
 * searching (`forcedOpen=true`), the chevron is hidden and the section
 * stays open — collapsing during search would hide matching results.
 */
function SectionHeader({
  icon,
  label,
  count,
  open,
  forcedOpen,
  onToggle,
}: {
  icon: React.ReactNode
  label: string
  count?: number
  open: boolean
  forcedOpen?: boolean
  onToggle?: () => void
}) {
  const interactive = onToggle && !forcedOpen
  return (
    <button
      type="button"
      onClick={interactive ? onToggle : undefined}
      disabled={!interactive}
      className={`w-full flex items-center gap-1.5 px-4 pt-3 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide ${
        interactive
          ? 'hover:text-foreground transition-colors cursor-pointer'
          : 'cursor-default'
      }`}
      aria-expanded={open}
    >
      {interactive &&
        (open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        ))}
      <span className="text-muted-foreground/70">{icon}</span>
      <span>{label}</span>
      {typeof count === 'number' && (
        <span className="text-muted-foreground/70">· {count}</span>
      )}
    </button>
  )
}

function ChoiceSetRow({
  choiceSet: cs,
  selected,
  onSelect,
}: {
  choiceSet: ChoiceSetListItem
  selected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <li>
      <button
        onClick={() => onSelect(cs.id)}
        className={`w-full text-left px-4 py-2 text-sm border-l-2 transition-colors ${
          selected
            ? 'border-primary bg-accent text-accent-foreground font-medium'
            : 'border-transparent text-foreground hover:bg-accent/50'
        }`}
        title={cs.description || cs.displayName}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">{cs.displayName || cs.name}</span>
        </div>
        {cs.description && (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {cs.description}
          </div>
        )}
      </button>
    </li>
  )
}

function EntityRow({
  entity: e,
  selected,
  onSelect,
}: {
  entity: EntityListItem
  selected: boolean
  onSelect: (id: string) => void
}) {
  const isVDO = isVirtualDataObject(e)
  const isNonStandard = e.entityType && e.entityType !== 'Entity'
  const tooltipText = isVDO
    ? 'Virtual Data Object — sourced from external systems via joins'
    : entityTypeTooltip(e.entityType)
  const badgeLabel = isVDO ? 'VDO' : e.entityType

  return (
    <li>
      <button
        onClick={() => onSelect(e.id)}
        className={`w-full text-left px-4 py-2 text-sm border-l-2 transition-colors ${
          selected
            ? 'border-primary bg-accent text-accent-foreground font-medium'
            : 'border-transparent text-foreground hover:bg-accent/50'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">{e.displayName || e.name}</span>
          {(isVDO || isNonStandard) && badgeLabel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="shrink-0">
                  {badgeLabel}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                {tooltipText}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {typeof e.recordCount === 'number' && !isVDO && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {e.recordCount} record{e.recordCount === 1 ? '' : 's'}
          </div>
        )}
      </button>
    </li>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-6 text-center">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-2 text-muted-foreground">
        {icon}
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
    </div>
  )
}
