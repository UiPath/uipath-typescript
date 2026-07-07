import React from 'react'
import { Info } from 'lucide-react'

/** Small info icon with a hover/focus tooltip for explanatory copy. */
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex" tabIndex={0}>
      <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" aria-label="More information" />
      <span
        role="tooltip"
        className="invisible absolute left-0 top-5 z-50 w-80 rounded-md border border-border bg-background p-3 text-xs font-normal leading-relaxed text-foreground shadow-lg group-hover:visible group-focus-within:visible"
      >
        {text}
      </span>
    </span>
  )
}
