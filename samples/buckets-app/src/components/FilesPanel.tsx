import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, Folder, RefreshCw, Search } from 'lucide-react'
import type { BucketFile, BucketGetResponse } from '@uipath/uipath-typescript/buckets'
import { useBucketFiles } from '../hooks/useBucketFiles'
import { FILES_PAGE_SIZE } from '../lib/config'
import { fileName, formatBytes } from '../lib/format'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import { Input } from '@uipath/apollo-wind/components/ui/input'
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'
import { Skeleton } from '@uipath/apollo-wind/components/ui/skeleton'

const SEARCH_DEBOUNCE_MS = 300

interface Props {
  bucket: BucketGetResponse
  folderId: number
  selectedPath: string | null
  onSelectFile: (file: BucketFile) => void
}

/** Paginated, searchable table of the files in one bucket. */
export function FilesPanel({ bucket, folderId, selectedPath, onSelectFile }: Props) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [searchInput])

  const { files, page, totalCount, hasNextPage, loading, error, setPage, refresh } =
    useBucketFiles(bucket.id, folderId, search)

  const first = files.length === 0 ? 0 : (page - 1) * FILES_PAGE_SIZE + 1
  const last = (page - 1) * FILES_PAGE_SIZE + files.length
  const totalPages = totalCount !== null ? Math.max(1, Math.ceil(totalCount / FILES_PAGE_SIZE)) : null

  return (
    <section className="flex-1 min-w-0 flex flex-col min-h-0">
      <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold truncate" title={bucket.name}>
            {bucket.name}
          </h2>
          {bucket.description && (
            <p className="text-xs text-muted-foreground truncate" title={bucket.description}>
              {bucket.description}
            </p>
          )}
        </div>
        <div className="relative w-56 shrink-0">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search file names"
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={refresh}
          disabled={loading}
          aria-label="Refresh files"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        {error ? (
          <Alert variant="destructive" className="m-4 w-auto">
            <AlertDescription className="break-words">{error}</AlertDescription>
          </Alert>
        ) : (
          <table className="w-full text-sm table-fixed">
            <thead className="sticky top-0 bg-background border-b text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2">Name</th>
                <th className="text-left font-medium px-4 py-2 w-48 hidden lg:table-cell">Type</th>
                <th className="text-right font-medium px-4 py-2 w-24">Size</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 8 }, (_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-2.5" colSpan={3}>
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))}
              {!loading && files.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted-foreground py-12">
                    {search ? 'No files match your search.' : 'This bucket is empty.'}
                  </td>
                </tr>
              )}
              {!loading &&
                files.map((file) => (
                  <FileRow
                    key={file.path}
                    file={file}
                    selected={file.path === selectedPath}
                    onSelect={onSelectFile}
                  />
                ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-4 py-2 border-t flex items-center justify-between gap-3 text-xs text-muted-foreground shrink-0">
        <span className="truncate">
          {loading
            ? 'Loading…'
            : totalCount !== null
              ? `Showing ${first}–${last} of ${totalCount}`
              : `Showing ${first}–${last}`}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={loading || page <= 1}
            onClick={() => setPage(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="tabular-nums px-1">
            Page {page}
            {totalPages !== null && ` of ${totalPages}`}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={loading || !hasNextPage}
            onClick={() => setPage(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}

function FileRow({
  file,
  selected,
  onSelect,
}: {
  file: BucketFile
  selected: boolean
  onSelect: (file: BucketFile) => void
}) {
  const name = fileName(file.path)
  const parent = file.path.slice(0, file.path.length - name.length).replace(/\/+$/, '')

  return (
    <tr
      onClick={file.isDirectory ? undefined : () => onSelect(file)}
      className={`border-b ${
        file.isDirectory
          ? 'text-muted-foreground'
          : selected
            ? 'bg-primary/10 cursor-pointer'
            : 'hover:bg-muted/60 cursor-pointer'
      }`}
    >
      <td className="px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {file.isDirectory ? (
            <Folder className="h-4 w-4 shrink-0" />
          ) : (
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <div className="truncate font-medium" title={file.path}>
              {name}
            </div>
            {parent && (
              <div className="truncate text-xs text-muted-foreground font-mono" title={parent}>
                {parent}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-2 hidden lg:table-cell">
        <span className="truncate block text-muted-foreground" title={file.contentType}>
          {file.isDirectory ? 'Folder' : file.contentType || '—'}
        </span>
      </td>
      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
        {file.isDirectory ? '—' : formatBytes(file.size)}
      </td>
    </tr>
  )
}
