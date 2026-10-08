import { Eye, TriangleAlert } from 'lucide-react'
import { useMaintenance } from '../context/MaintenanceContext'
import { Button } from '@uipath/apollo-wind/components/ui/button'

/**
 * Shown to Administrators while maintenance mode is on — the one situation
 * where someone sees the app despite the switch being set. Makes that explicit
 * so an admin doesn't mistake their own view for what users are getting.
 */
export function MaintenanceBanner() {
  const { setPreviewing } = useMaintenance()

  return (
    <div
      role="status"
      className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-2 text-sm">
        <TriangleAlert className="h-4 w-4 text-amber-700 dark:text-amber-300 shrink-0" />
        <span>
          <span className="font-medium">Maintenance mode is on.</span> End
          users see the maintenance page — you see the app because you are an
          Administrator.
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => setPreviewing(true)}
      >
        <Eye className="h-4 w-4 mr-1.5" />
        Preview what users see
      </Button>
    </div>
  )
}
