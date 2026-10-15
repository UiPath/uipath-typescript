/**
 * Orchestrator folder whose buckets the app lists. Set `VITE_UIPATH_FOLDER_ID`
 * in `.env` (see `.env.example`).
 */
const rawFolderId = import.meta.env.VITE_UIPATH_FOLDER_ID

export const FOLDER_ID: number | null =
  rawFolderId && /^\d+$/.test(rawFolderId) ? Number(rawFolderId) : null

/** Files per page in the file table. */
export const FILES_PAGE_SIZE = 25

/** Files larger than this are not previewed automatically — download instead. */
export const MAX_PREVIEW_BYTES = 25 * 1024 * 1024

/** Text previews are truncated beyond this many characters. */
export const MAX_TEXT_CHARS = 500_000
