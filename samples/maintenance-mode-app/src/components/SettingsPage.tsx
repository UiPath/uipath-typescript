import { useState } from 'react'
import { Eye, ShieldCheck } from 'lucide-react'
import { useMaintenance } from '../context/MaintenanceContext'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import { Switch } from '@uipath/apollo-wind/components/ui/switch'
import { Label } from '@uipath/apollo-wind/components/ui/label'
import { Separator } from '@uipath/apollo-wind/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@uipath/apollo-wind/components/ui/card'
import { toast } from '@uipath/apollo-wind/components/ui/sonner'

/**
 * Administrator-only. The toggle writes the switch through the maintenance
 * store, so it takes effect for every user on their next page load.
 */
export function SettingsPage() {
  const { maintenanceEnabled, changeMaintenanceMode, setPreviewing, storeDescription } =
    useMaintenance()
  const [saving, setSaving] = useState(false)

  const handleToggle = async (enabled: boolean) => {
    setSaving(true)
    try {
      await changeMaintenanceMode(enabled)
      toast.success(
        enabled ? 'Maintenance mode turned on' : 'Maintenance mode turned off',
        {
          description: enabled
            ? 'End users see the maintenance page on their next page load.'
            : 'End users see the app on their next page load.',
        },
      )
    } catch (err) {
      console.error('Failed to update maintenance mode:', err)
      toast.error('Couldn’t update maintenance mode', {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Visible to Administrators only.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Maintenance mode</CardTitle>
          <CardDescription>
            While on, users who open the app are shown the maintenance page
            instead of the app. Administrators keep access so they can verify
            the app before turning it off. Use it when publishing updates or
            temporarily restricting access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="maintenance-mode" className="text-sm font-medium">
                Enable maintenance mode
              </Label>
              <p className="text-xs text-muted-foreground">
                {maintenanceEnabled
                  ? 'On — end users are seeing the maintenance page.'
                  : 'Off — everyone sees the app.'}
              </p>
            </div>
            <Switch
              id="maintenance-mode"
              checked={maintenanceEnabled}
              onCheckedChange={handleToggle}
              disabled={saving}
              aria-label="Enable maintenance mode"
            />
          </div>

          <Separator />

          <dl className="grid gap-3 text-sm sm:grid-cols-[max-content_1fr] sm:gap-x-8">
            <dt className="text-muted-foreground">Applies to</dt>
            <dd>This app only. Other apps on the tenant are unaffected.</dd>
            <dt className="text-muted-foreground">Stored in</dt>
            <dd className="break-all">{storeDescription}</dd>
            <dt className="text-muted-foreground">Takes effect</dt>
            <dd>On each user’s next page load. Sessions already open are not interrupted.</dd>
            <dt className="text-muted-foreground">Who can change it</dt>
            <dd>
              Whoever is allowed to write that entity. This page is hidden from
              non-administrators, but the write itself is authorised by Data
              Fabric permissions, not by the app.
            </dd>
          </dl>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              See exactly what end users get while maintenance mode is on.
            </p>
            <Button variant="outline" size="sm" onClick={() => setPreviewing(true)}>
              <Eye className="h-4 w-4 mr-1.5" />
              Preview maintenance page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
