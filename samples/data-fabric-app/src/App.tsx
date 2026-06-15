import { useState } from 'react'
import { Database } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginScreen } from './components/LoginScreen'
import { Header } from './components/Header'
import { EntitiesList } from './components/EntitiesList'
import { EntityDetail } from './components/EntityDetail'
import { ChoiceSetDetail } from './components/ChoiceSetDetail'
import { ThemeProvider } from './components/ThemeProvider'
import { Toaster } from '@uipath/apollo-wind/components/ui/sonner'
import { TooltipProvider } from '@uipath/apollo-wind/components/ui/tooltip'

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth()
  // Mutually exclusive selection — clicking an entity clears the choice
  // set selection and vice versa. Routes the right-pane content to the
  // appropriate detail component (EntityDetail vs ChoiceSetDetail), since
  // choice sets aren't entities (different SDK service, different schema
  // shape) and can't go through `EntityDetail`'s entity-shaped pipeline.
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [selectedChoiceSetId, setSelectedChoiceSetId] = useState<string | null>(
    null,
  )

  const handleSelectEntity = (id: string) => {
    setSelectedEntityId(id)
    setSelectedChoiceSetId(null)
  }

  const handleSelectChoiceSet = (id: string) => {
    setSelectedChoiceSetId(id)
    setSelectedEntityId(null)
  }

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
        <EntitiesList
          selectedEntityId={selectedEntityId}
          selectedChoiceSetId={selectedChoiceSetId}
          onSelectEntity={handleSelectEntity}
          onSelectChoiceSet={handleSelectChoiceSet}
        />
        <main className="flex-1 min-w-0 overflow-hidden flex">
          {selectedEntityId ? (
            <EntityDetail entityId={selectedEntityId} />
          ) : selectedChoiceSetId ? (
            <ChoiceSetDetail choiceSetId={selectedChoiceSetId} />
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
          <Database className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium">No entity selected</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Pick an entity from the sidebar to view its schema and records.
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
