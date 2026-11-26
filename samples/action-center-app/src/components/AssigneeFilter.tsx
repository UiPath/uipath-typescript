import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks'
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

/** Assignee picker — derived from loaded tasks (no folder needed, groups excluded). */
export function AssigneeFilter({
  tasks,
  value,
  onChange,
}: {
  tasks: TaskGetResponse[]
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)

  // Dedupe by id; fall back to userName/email when cross-folder response omits id.
  const assignees = useMemo(() => {
    const map = new Map<string, { key: string; displayName: string; emailAddress?: string }>()
    for (const t of tasks) {
      const u = t.assignedToUser
      if (!u) continue
      const display = u.displayName || u.userName || u.emailAddress
      if (!display) continue
      const key = u.id ? String(u.id) : u.userName || u.emailAddress || display
      if (!map.has(key)) {
        map.set(key, {
          key,
          displayName: display,
          emailAddress: u.emailAddress || undefined,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName))
  }, [tasks])

  const selectedLabel = useMemo(() => {
    if (value === 'all') return 'Any assignee'
    const u = assignees.find((x) => x.key === value)
    return u ? u.displayName : value
  }, [assignees, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Assigned to"
          title={selectedLabel}
          className="h-9 w-56 shrink-0 justify-between gap-2 px-3 font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-muted-foreground">Assignee:</span>
            <span className="truncate">{selectedLabel}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 overflow-hidden p-0" align="start">
        <Command>
          <CommandInput placeholder="Search users…" />
          <CommandList>
            <CommandEmpty>No assignees in the current view</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Any assignee"
                onSelect={() => {
                  onChange('all')
                  setOpen(false)
                }}
              >
                <span className="truncate">Any assignee</span>
                <Check
                  className={`ml-auto h-4 w-4 shrink-0 ${value === 'all' ? 'opacity-100' : 'opacity-0'}`}
                />
              </CommandItem>
              {assignees.map((u) => (
                <CommandItem
                  key={u.key}
                  value={`${u.displayName} ${u.emailAddress ?? ''}`}
                  onSelect={() => {
                    onChange(u.key)
                    setOpen(false)
                  }}
                  title={u.emailAddress ? `${u.displayName} (${u.emailAddress})` : u.displayName}
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{u.displayName}</span>
                    {u.emailAddress && (
                      <span className="truncate text-xs text-muted-foreground">
                        {u.emailAddress}
                      </span>
                    )}
                  </div>
                  <Check
                    className={`ml-auto h-4 w-4 shrink-0 ${value === u.key ? 'opacity-100' : 'opacity-0'}`}
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
