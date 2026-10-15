import { useEffect, useState } from 'react'
import { Buckets } from '@uipath/uipath-typescript/buckets'
import type { BucketFile } from '@uipath/uipath-typescript/buckets'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useAuth } from '../context/AuthContext'
import { MAX_PREVIEW_BYTES, MAX_TEXT_CHARS } from '../lib/config'
import { blobMimeFor, detectPreviewKind } from '../lib/preview'
import type { PreviewKind } from '../lib/preview'

export type FileContentState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'too-large'; kind: PreviewKind }
  | {
      status: 'ready'
      kind: PreviewKind
      /** Object URL for the downloaded blob — revoked when the file changes. */
      objectUrl: string
      /** Decoded text for `text` / `json` previews. */
      text: string | null
      truncated: boolean
    }

/**
 * Downloads a bucket file for preview.
 *
 * SDK call: `Buckets.getReadUri({ id }, path, { folderId })` returns a
 * short-lived URL plus the headers the storage provider expects; the file
 * bytes are then fetched from that URL directly.
 */
export function useFileContent(
  bucketId: number,
  folderId: number,
  file: BucketFile,
  reloadKey: number,
): FileContentState {
  const { sdk } = useAuth()
  const [state, setState] = useState<FileContentState>({ status: 'loading' })

  useEffect(() => {
    const kind = detectPreviewKind(file.path, file.contentType)
    if (file.size > MAX_PREVIEW_BYTES) {
      setState({ status: 'too-large', kind })
      return
    }

    const controller = new AbortController()
    let objectUrl: string | null = null
    setState({ status: 'loading' })

    const load = async () => {
      try {
        const access = await new Buckets(sdk).getReadUri({ id: bucketId }, file.path, { folderId })
        const response = await fetch(access.uri, {
          method: access.httpMethod || 'GET',
          headers: access.headers,
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`Download failed (HTTP ${response.status})`)

        const raw = await response.blob()
        const blob = new Blob([raw], { type: blobMimeFor(kind, file.path, raw.type || file.contentType) })
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(blob)

        let text: string | null = null
        let truncated = false
        if (kind === 'text' || kind === 'json') {
          text = await blob.text()
          if (kind === 'json') {
            try {
              text = JSON.stringify(JSON.parse(text), null, 2)
            } catch (err) {
              // Malformed JSON still renders as plain text.
              console.warn('JSON preview fell back to raw text:', err)
            }
          }
          if (text.length > MAX_TEXT_CHARS) {
            text = text.slice(0, MAX_TEXT_CHARS)
            truncated = true
          }
        }
        if (controller.signal.aborted) return
        setState({ status: 'ready', kind, objectUrl, text, truncated })
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('Failed to load file content:', err)
        setState({
          status: 'error',
          message:
            err instanceof UiPathError
              ? err.message
              : "Couldn't download this file. Check the bucket's storage CORS settings.",
        })
      }
    }
    load()

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [sdk, bucketId, folderId, file, reloadKey])

  return state
}
