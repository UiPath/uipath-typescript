import { QueueItemStatus, QueuePriority } from '@uipath/uipath-typescript/queues'
import { Badge } from '@uipath/apollo-wind/components/ui/badge'

/**
 * Colour-codes `QueueItemStatus`. Tailwind classes reference apollo-wind's
 * palette; the `dark:` variants keep contrast in dark mode.
 */
const statusClasses: Record<QueueItemStatus, string> = {
  [QueueItemStatus.New]:
    'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-transparent',
  [QueueItemStatus.InProgress]:
    'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-transparent',
  [QueueItemStatus.Successful]:
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent',
  [QueueItemStatus.Failed]:
    'bg-red-500/15 text-red-700 dark:text-red-300 border-transparent',
  [QueueItemStatus.Abandoned]:
    'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-transparent',
  [QueueItemStatus.Retried]:
    'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-transparent',
  [QueueItemStatus.Deleted]:
    'bg-muted text-muted-foreground border-transparent',
}

export function StatusBadge({ status }: { status: QueueItemStatus }) {
  return (
    <Badge variant="outline" className={statusClasses[status] ?? ''}>
      {status}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: QueuePriority }) {
  const classes =
    priority === QueuePriority.High
      ? 'bg-red-500/10 text-red-700 dark:text-red-300 border-transparent'
      : priority === QueuePriority.Low
        ? 'bg-muted text-muted-foreground border-transparent'
        : 'bg-primary/10 text-primary border-transparent'
  return (
    <Badge variant="outline" className={classes}>
      {priority}
    </Badge>
  )
}
