import { useState } from 'react'
import { Download, FileQuestion, RefreshCw, X } from 'lucide-react'
import type { BucketFile } from '@uipath/uipath-typescript/buckets'
import { useFileContent } from '../hooks/useFileContent'
import { fileName, formatBytes } from '../lib/format'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'
import { Skeleton } from '@uipath/apollo-wind/components/ui/skeleton'

interface Props {
  bucketId: number
  folderId: number
  file: BucketFile
  onClose: () => void
}

/** Right-hand pane rendering the selected file's contents. */
export function FilePreview({ bucketId, folderId, file, onClose }: Props) {
  const [reloadKey, setReloadKey] = useState(0)
  const content = useFileContent(bucketId, folderId, file, reloadKey)
  const name = fileName(file.path)

  return (
    <aside className="w-[45%] min-w-80 max-w-3xl shrink-0 border-l bg-background flex flex-col min-h-0">
      <div className="px-4 py-3 border-b flex items-center gap-2 shrink-0">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold truncate" title={file.path}>
            {name}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {file.contentType || 'Unknown type'} · {formatBytes(file.size)}
          </p>
        </div>
        {content.status === 'ready' && (
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild aria-label="Download file">
            <a href={content.objectUrl} download={name}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={content.status === 'loading'}
          aria-label="Reload preview"
        >
          <RefreshCw className={`h-4 w-4 ${content.status === 'loading' ? 'animate-spin' : ''}`} />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close preview">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {content.status === 'loading' && (
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {content.status === 'error' && (
          <Alert variant="destructive" className="m-4 w-auto">
            <AlertDescription className="break-words">{content.message}</AlertDescription>
          </Alert>
        )}

        {content.status === 'too-large' && (
          <Placeholder
            title="File too large to preview"
            body={`${formatBytes(file.size)} exceeds the preview limit. Download it from Orchestrator instead.`}
          />
        )}

        {content.status === 'ready' && <Rendered content={content} name={name} />}
      </div>
    </aside>
  )
}

function Rendered({
  content,
  name,
}: {
  content: Extract<ReturnType<typeof useFileContent>, { status: 'ready' }>
  name: string
}) {
  switch (content.kind) {
    case 'image':
      return (
        <div className="p-4 flex items-center justify-center min-h-full bg-muted/30">
          <img src={content.objectUrl} alt={name} className="max-w-full max-h-full object-contain" />
        </div>
      )
    case 'pdf':
      return <iframe src={content.objectUrl} title={name} className="w-full h-full border-0" />
    case 'video':
      return (
        <div className="p-4">
          <video src={content.objectUrl} controls className="w-full rounded-md" />
        </div>
      )
    case 'audio':
      return (
        <div className="p-4">
          <audio src={content.objectUrl} controls className="w-full" />
        </div>
      )
    case 'json':
    case 'text':
      return (
        <div>
          {content.truncated && (
            <p className="px-4 py-2 text-xs text-muted-foreground border-b">
              Preview truncated — download the file to see everything.
            </p>
          )}
          <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-words">{content.text}</pre>
        </div>
      )
    default:
      return (
        <Placeholder
          title="No preview available"
          body="This file type can't be rendered in the browser. Use the download button to open it."
        />
      )
  }
}

function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-xs">
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
          <FileQuestion className="h-6 w-6 text-muted-foreground" />
        </div>
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground mt-1">{body}</p>
      </div>
    </div>
  )
}
