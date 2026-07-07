import React from 'react'
import { cn } from '@/lib/utils'

type Direction = 'up-good' | 'up-bad' | 'down-good' | 'down-bad' | 'neutral'

interface DeltaBadgeProps {
  direction: Direction
  text: string
  className?: string
}

const styles: Record<Direction, string> = {
  'up-good':   'bg-[hsl(var(--chart-3)/0.1)] text-[hsl(var(--chart-3))] border border-[hsl(var(--chart-3)/0.2)]',
  'up-bad':    'bg-[hsl(var(--destructive)/0.1)] text-destructive border border-[hsl(var(--destructive)/0.2)]',
  'down-good': 'bg-[hsl(var(--chart-3)/0.1)] text-[hsl(var(--chart-3))] border border-[hsl(var(--chart-3)/0.2)]',
  'down-bad':  'bg-[hsl(var(--destructive)/0.1)] text-destructive border border-[hsl(var(--destructive)/0.2)]',
  'neutral':   'bg-muted text-muted-foreground border border-border',
}

const arrows: Record<Direction, string> = {
  'up-good': '↑', 'up-bad': '↑', 'down-good': '↓', 'down-bad': '↓', 'neutral': '→',
}

export function DeltaBadge({ direction, text, className }: DeltaBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', styles[direction], className)}>
      <span aria-hidden>{arrows[direction]}</span>
      {text}
    </span>
  )
}
