import React from 'react'
import { Info } from 'lucide-react'

interface InfoTooltipProps {
  message: string
}

export function InfoTooltip({ message }: InfoTooltipProps) {
  return (
    <div className="relative group/tooltip">
      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
      <div className="absolute right-0 top-6 z-50 hidden group-hover/tooltip:block group-focus-within/tooltip:block
                      w-64 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
        {message}
      </div>
    </div>
  )
}
