import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
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
import { useFolders } from '../hooks/useTasks'

/** Folder picker — direct Popover+Command (apollo-wind's Combobox filters by value=id). */
export function FolderPicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (id: number | null) => void
}) {
  const { folders, loading, error } = useFolders()
  const [open, setOpen] = useState(false)

  const selectedLabel = useMemo(() => {
    if (value == null) return 'All folders'
    return folders.find((f) => f.id === value)?.fullyQualifiedName ?? `Folder ${value}`
  }, [folders, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Folder"
          disabled={loading || !!error}
          // Fixed width keeps toolbar stable as folders change.
          title={loading ? undefined : error ?? selectedLabel}
          className="h-9 w-56 shrink-0 justify-between gap-2 px-3 font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-muted-foreground">Folder:</span>
            <span className="truncate">
              {loading ? 'Loading…' : error ? 'Unavailable' : selectedLabel}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 overflow-hidden p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search folders…" />
          <CommandList>
            <CommandEmpty>No folders found</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="All folders"
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                <span className="truncate">All folders</span>
                <Check
                  className={`ml-auto h-4 w-4 shrink-0 ${value == null ? 'opacity-100' : 'opacity-0'}`}
                />
              </CommandItem>
              {folders.map((f) => (
                <CommandItem
                  key={f.id}
                  value={f.fullyQualifiedName}
                  onSelect={() => {
                    onChange(f.id)
                    setOpen(false)
                  }}
                  title={f.fullyQualifiedName}
                >
                  <span className="truncate">{f.fullyQualifiedName}</span>
                  <Check
                    className={`ml-auto h-4 w-4 shrink-0 ${value === f.id ? 'opacity-100' : 'opacity-0'}`}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
