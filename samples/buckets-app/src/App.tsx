import { useState } from 'react'
import type { ReactNode } from 'react'
import { Archive, Settings } from 'lucide-react'
import type { BucketFile, BucketGetResponse } from '@uipath/uipath-typescript/buckets'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginScreen } from './components/LoginScreen'
import { Header } from './components/Header'
import { BucketsList } from './components/BucketsList'
import { FilesPanel } from './components/FilesPanel'
import { FilePreview } from './components/FilePreview'
import { ThemeProvider } from './components/ThemeProvider'
import { FOLDER_ID } from './lib/config'
import { Toaster } from '@uipath/apollo-wind/components/ui/sonner'
import { TooltipProvider } from '@uipath/apollo-wind/components/ui/tooltip'

function AppContent({ folderId }: { folderId: number }) {
  const { isAuthenticated, isLoading } = useAuth()
  const [selectedBucket, setSelectedBucket] = useState<BucketGetResponse | null>(null)
  const [selectedFile, setSelectedFile] = useState<BucketFile | null>(null)

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Initializing UiPath SDK…</div>
      </div>
    )
  }

  if (!isAuthenticated) return <LoginScreen />

  const selectBucket = (bucket: BucketGetResponse) => {
    setSelectedBucket(bucket)
    setSelectedFile(null)
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header folderId={folderId} />
      <div className="flex flex-1 min-h-0">
        <BucketsList
          folderId={folderId}
          selectedBucketId={selectedBucket?.id ?? null}
          onSelectBucket={selectBucket}
        />
        <main className="flex-1 min-w-0 overflow-hidden flex">
          {selectedBucket ? (
            <>
              {/* Keyed by bucket id so switching buckets resets search and paging. */}
              <FilesPanel
                key={selectedBucket.id}
                bucket={selectedBucket}
                folderId={folderId}
                selectedPath={selectedFile?.path ?? null}
                onSelectFile={setSelectedFile}
              />
              {selectedFile && (
                <FilePreview
                  bucketId={selectedBucket.id}
                  folderId={folderId}
                  file={selectedFile}
                  onClose={() => setSelectedFile(null)}
                />
              )}
            </>
          ) : (
            <EmptyState
              icon={<Archive className="h-6 w-6 text-muted-foreground" />}
              title="No bucket selected"
              body="Pick a bucket from the sidebar to browse its files and preview their contents."
            />
          )}
        </main>
      </div>
    </div>
  )
}

function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
          {icon}
        </div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{body}</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      {FOLDER_ID === null ? (
        <div className="h-screen flex bg-background">
          <EmptyState
            icon={<Settings className="h-6 w-6 text-muted-foreground" />}
            title="Folder not configured"
            body="Set VITE_UIPATH_FOLDER_ID in .env to the numeric ID of the Orchestrator folder whose buckets you want to browse."
          />
        </div>
      ) : (
        <AuthProvider>
          <TooltipProvider delayDuration={150}>
            <AppContent folderId={FOLDER_ID} />
          </TooltipProvider>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      )}
    </ThemeProvider>
  )
}
