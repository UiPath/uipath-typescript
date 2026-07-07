import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface DetailViewShellProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function DetailViewShell({ title, description, children }: DetailViewShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 lg:p-8">
      <header className="mb-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </header>
      <main>{children}</main>
    </div>
  )
}
