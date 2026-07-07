import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ViewAllLinkProps {
  to: string
  className?: string
}

export function ViewAllLink({ to, className }: ViewAllLinkProps) {
  return (
    <Link
      to={to}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-muted-foreground hover:text-foreground transition-colors',
        className
      )}
    >
      View all <ArrowUpRight className="w-3 h-3" />
    </Link>
  )
}
