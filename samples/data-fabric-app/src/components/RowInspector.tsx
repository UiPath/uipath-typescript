import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { Entities } from '@uipath/uipath-typescript/entities'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useAuth } from '../context/AuthContext'
import type { EntitySchema, EntityRow } from '../hooks/useEntity'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { downloadBlobAsFile } from '../lib/download'

interface Props {
  entityId: string
  recordId: string
  schema: EntitySchema
  onClose: () => void
}

/**
 * Read-only "inspect" panel for a single record.
 *
 * SDK calls used:
 *  - `Entities.getRecordById(entityId, recordId)` to load the full record
 *    (the widget filters out system fields like CreatedTime / UpdatedBy /
 *    CreatedBy / UpdatedTime; this view re-exposes them).
 *  - `Entities.downloadAttachment(entityId, recordId, fieldName)` for any
 *    File-type field that has an attachment.
 */
export function RowInspector({ entityId, recordId, schema, onClose }: Props) {
  const { sdk } = useAuth()
  const [record, setRecord] = useState<EntityRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingField, setDownloadingField] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const svc = new Entities(sdk)
        const r = (await svc.getRecordById(entityId, recordId)) as EntityRow
        if (!cancelled) setRecord(r)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof UiPathError ? err.message : 'Failed to load record',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [sdk, entityId, recordId])

  const handleDownload = async (fieldName: string) => {
    setDownloadingField(fieldName)
    try {
      const svc = new Entities(sdk)
      const blob = await svc.downloadAttachment(entityId, recordId, fieldName)
      // Use the field name as filename. The blob has a `type` so the browser
      // will pick a sensible default extension, but we can't recover the
      // original filename without it being stored elsewhere.
      const ext = blobExtension(blob)
      downloadBlobAsFile(blob, `${fieldName}${ext}`)
      toast.success(`Downloaded ${fieldName}`)
    } catch (err) {
      toast.error('Download failed', {
        description:
          err instanceof UiPathError ? err.message : 'Unknown error',
      })
    } finally {
      setDownloadingField(null)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* Height capping lives in DialogContent — see ui/dialog.tsx. We just
          declare width here. */}
      <DialogContent className="sm:max-w-2xl gap-0">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle>Record details</DialogTitle>
          <DialogDescription>
            All fields including system metadata.{' '}
            <code className="font-mono text-xs">{recordId}</code>
          </DialogDescription>
        </DialogHeader>

        {/* `min-h-0` lets the flex-1 region shrink below content size so
            the overflow-y-auto scroll actually engages on tall records. */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {loading && (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 py-1">
                  <Skeleton className="h-4 col-span-1" />
                  <Skeleton className="h-4 col-span-2" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Couldn't load this record</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && !error && record && (
            <table className="w-full text-sm">
              <tbody>
                {schema.fields.map((f) => {
                  const value = record[f.name]
                  return (
                    <tr key={f.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-4 align-top text-muted-foreground font-medium w-1/3">
                        {f.displayName || f.name}
                        {f.isSystemField && (
                          <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                            system
                          </span>
                        )}
                      </td>
                      <td className="py-2 align-top break-words">
                        {f.isAttachment ? (
                          value ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={downloadingField === f.name}
                              onClick={() => handleDownload(f.name)}
                            >
                              <Download className="h-3.5 w-3.5 mr-1.5" />
                              {downloadingField === f.name
                                ? 'Downloading…'
                                : 'Download'}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground italic">
                              no attachment
                            </span>
                          )
                        ) : (
                          <FieldValue value={value} />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-4">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground italic">empty</span>
  }
  if (typeof value === 'object') {
    return (
      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  }
  return <span className="font-mono text-xs">{String(value)}</span>
}

/** Crude file-extension guess from a Blob's MIME type. */
function blobExtension(blob: Blob): string {
  const type = blob.type
  if (!type) return ''
  if (type.includes('pdf')) return '.pdf'
  if (type.includes('png')) return '.png'
  if (type.includes('jpeg') || type.includes('jpg')) return '.jpg'
  if (type.includes('csv')) return '.csv'
  if (type.includes('json')) return '.json'
  if (type.includes('xml')) return '.xml'
  if (type.includes('text/plain')) return '.txt'
  return ''
}
