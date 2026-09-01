import { useState } from 'react'
import { ListChecks } from 'lucide-react'
import type { QueueGetWithMethodsResponse } from '@uipath/uipath-typescript/queues'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginScreen } from './components/LoginScreen'
import { Header } from './components/Header'
import { QueuesList } from './components/QueuesList'
import { QueueDetail } from './components/QueueDetail'
import { ThemeProvider } from './components/ThemeProvider'
import { Toaster } from '@uipath/apollo-wind/components/ui/sonner'
import { TooltipProvider } from '@uipath/apollo-wind/components/ui/tooltip'

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth()
  // Keep the whole queue object — the SDK returns it with the operational
  // methods (getAllItems, insertItem, …) already bound.
  const [selectedQueue, setSelectedQueue] =
    useState<QueueGetWithMethodsResponse | null>(null)

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Initializing UiPath SDK…</div>
      </div>
    )
  }

  if (!isAuthenticated) return <LoginScreen />

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 min-h-0">
        <QueuesList
          selectedQueueId={selectedQueue?.id ?? null}
          onSelectQueue={setSelectedQueue}
        />
        <main className="flex-1 min-w-0 overflow-hidden flex">
          {selectedQueue ? (
            // Keyed by queue id so switching queues remounts the detail pane
            // with fresh item/pagination state.
            <QueueDetail key={selectedQueue.id} queue={selectedQueue} />
          ) : (
            <EmptyDetailState />
          )}
        </main>
      </div>
    </div>
  )
}

function EmptyDetailState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
          <ListChecks className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium">No queue selected</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a queue from the sidebar to browse its items, insert new ones,
          and run transactions.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider delayDuration={150}>
          <AppContent />
        </TooltipProvider>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  )
}
