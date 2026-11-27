import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Tasks, TaskPriority } from '@uipath/uipath-typescript/tasks'
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@uipath/apollo-wind/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@uipath/apollo-wind/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@uipath/apollo-wind/components/ui/dialog'
import { Input } from '@uipath/apollo-wind/components/ui/input'
import { Label } from '@uipath/apollo-wind/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@uipath/apollo-wind/components/ui/select'
import { toast } from '@uipath/apollo-wind/components/ui/sonner'
import { useAuth } from '../context/AuthContext'
import { useFolders } from '../hooks/useTasks'
import { extractServerMessage } from '../taskUtils'

/** Folder picker for the Create dialog (full-width). */
function CreateFormFolderPicker({
  folders,
  value,
  onChange,
  loading,
  error,
}: {
  folders: { id: number; displayName: string; fullyQualifiedName: string }[]
  value: string
  onChange: (value: string) => void
  loading: boolean
  error: string | null
}) {
  const [open, setOpen] = useState(false)
  const selected = folders.find((f) => String(f.id) === value)
  const disabled = loading || !!error
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between gap-2"
          >
            <span className="truncate">
              {loading
                ? 'Loading folders…'
                : error
                  ? 'Folders unavailable'
                  : selected
                    ? selected.fullyQualifiedName
                    : 'Pick a folder'}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search folders…" />
            <CommandList>
              <CommandEmpty>No folders found</CommandEmpty>
              <CommandGroup>
                {folders.map((f) => (
                  <CommandItem
                    key={f.id}
                    value={f.fullyQualifiedName}
                    onSelect={() => {
                      onChange(String(f.id))
                      setOpen(false)
                    }}
                  >
                    {f.fullyQualifiedName}
                    <Check
                      className={`ml-auto h-4 w-4 ${value === String(f.id) ? 'opacity-100' : 'opacity-0'}`}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </>
  )
}

/** Create form. `Tasks.create` only makes External tasks; folder is required. */
export function CreateForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { sdk } = useAuth()
  const { folders, loading: foldersLoading, error: foldersError } = useFolders()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Medium)
  const [folderValue, setFolderValue] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const folderId = Number(folderValue)
  const folderValid = folderValue !== '' && Number.isFinite(folderId) && folderId > 0

  const submit = async () => {
    const trimmed = title.trim()
    if (!trimmed || !folderValid) return
    setBusy(true)
    setSubmitError(null)
    try {
      const svc = new Tasks(sdk)
      await svc.create({ title: trimmed, priority }, folderId)
      toast.success('Task created')
      onDone()
      onClose()
    } catch (err) {
      setSubmitError(extractServerMessage(err) ?? 'Failed to create task')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Creates an external task. Form and app tasks are created by workflows, not the API.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="create-title">Title</Label>
            <Input
              id="create-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Review document"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Folder</Label>
            <CreateFormFolderPicker
              folders={folders}
              value={folderValue}
              onChange={setFolderValue}
              loading={foldersLoading}
              error={foldersError}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as TaskPriority)}
            >
              <SelectTrigger id="create-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[TaskPriority.Low, TaskPriority.Medium, TaskPriority.High, TaskPriority.Critical].map(
                  (p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!title.trim() || !folderValid || busy}>
            {busy ? 'Creating…' : 'Create task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
