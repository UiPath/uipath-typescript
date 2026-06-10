import { useEffect } from 'react'

/** Toolbar buttons that are always hidden (replaced by our own UI). */
const HIDDEN_BUTTON_LABELS = ['Add Row', 'Insert Records', 'Refresh']
/** Toolbar buttons hidden additionally when the entity is read-only. */
const READ_ONLY_HIDDEN_LABELS = ['Delete Records', 'Show Diff', 'Discard']
/** Extracts the selected-row count from the "Delete Records (N)" label. */
const DELETE_RECORDS_REGEX = /Delete Records \((\d+)\)/

interface Options {
  /** When true, the entity is read-only — also hide Delete Records, Show Diff, Discard. */
  readOnly?: boolean
  /** Lets the caller turn the hook off entirely (defaults to enabled). */
  enabled?: boolean
  /**
   * Fires after the user clicks "Commit Changes" in the diff dialog and the
   * widget has either resolved the commit or surfaced an error. The widget
   * itself only calls `toast.error()` on failure and stays silent on
   * success, so we observe its post-commit DOM to figure out which one
   * happened and report it back to the caller for an in-page banner.
   */
  onCommit?: (
    outcome: 'success' | 'error',
    message: string,
  ) => void
}

/** Sonner attribute for any toast (used to detect post-commit errors). */
const SONNER_TOAST_SELECTOR = '[data-sonner-toast]'
/** Sonner attribute on the toast's inner element for its severity. */
const SONNER_TYPE_ATTR = 'data-type'
/** Window (ms) we wait for an error toast to appear after a Commit click.
 *  Most commits land in well under a second; 1200ms gives a comfortable
 *  buffer against slow round-trips while still feeling responsive on the
 *  success path. Trade-off: a commit that errors AFTER this window will
 *  show the success toast first and the error toast after — bump higher
 *  if your tenant routinely takes >1s for record updates. */
const COMMIT_OUTCOME_WINDOW_MS = 1200

/**
 * Hides the widget toolbar buttons we've replaced with our own UI.
 *
 * The `@uipath/ui-widgets-datatable` toolbar exposes a number of actions,
 * some of which duplicate functionality we surface elsewhere in the app:
 *
 *   - "Refresh"        → we have a Refresh button in the page header.
 *   - "Add Row"        → we use a modal `RecordEditor` instead of inline.
 *   - "Insert Records" → the widget only renders this when the user has
 *                        added inline rows via "Add Row"; since "Add Row"
 *                        is hidden it shouldn't appear, but we hide it
 *                        defensively as well.
 *
 * What stays visible (the widget's native flow):
 *
 *   - "Show Diff (N)"  → opens the diff dialog so the user can review
 *                        their pending inline edits before committing.
 *   - "Discard"        → cancels the pending edits.
 *   - "Delete Records (N)" → the widget renders this button always but
 *                        disables it when no rows are selected. We hide
 *                        the button entirely in that case so the toolbar
 *                        only shows actionable controls (less visual
 *                        noise than a disabled button sitting there).
 *
 * Hiding is done via inline `display: none`, set whenever the widget
 * re-renders (a MutationObserver re-applies it on every change). The
 * buttons stay in the DOM so the widget's internal click handlers keep
 * working — only their visual presence is suppressed.
 */
export function useWidgetToolbarOverrides(options: Options = {}) {
  const { readOnly = false, enabled = true, onCommit } = options

  useEffect(() => {
    if (!enabled) return

    const hideWidgetButtons = () => {
      const buttons = document.querySelectorAll<HTMLButtonElement>(
        '.uipath-datatable-container button',
      )
      buttons.forEach((btn) => {
        const text = btn.textContent?.trim() || ''

        // Always-hidden buttons.
        if (HIDDEN_BUTTON_LABELS.some((label) => text.startsWith(label))) {
          if (btn.style.display !== 'none') btn.style.display = 'none'
          return
        }

        // Read-only mode hides every mutation action — Delete Records, Show
        // Diff, Discard. They'd only appear if the user had pending edits or
        // selected rows, but with read-only column configs that can't happen;
        // we hide them defensively anyway.
        if (
          readOnly &&
          READ_ONLY_HIDDEN_LABELS.some((label) => text.startsWith(label))
        ) {
          if (btn.style.display !== 'none') btn.style.display = 'none'
          return
        }

        // "Delete Records (N)" — only show when N > 0 (i.e., at least one
        // row selected). Toggling display lets it reappear when needed.
        if (text.startsWith('Delete Records')) {
          const match = text.match(DELETE_RECORDS_REGEX)
          const count = match ? parseInt(match[1], 10) : 0
          btn.style.display = count > 0 ? '' : 'none'
        }
      })
    }
    hideWidgetButtons()

    // Re-apply on every DOM mutation — the widget re-renders the toolbar
    // when selection / edit state changes.
    const observer = new MutationObserver(() => {
      hideWidgetButtons()
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => observer.disconnect()
  }, [enabled, readOnly])

  // Detect "Commit Changes" clicks and report the outcome to the caller.
  //
  // The widget's source (`DataTable.js` → `handleCommit`) only fires a toast
  // on failure (`toast.error(...)`) — successful commits are silent. We
  // listen for the user's click and watch for ~1.5s; if any sonner toast
  // appears with `data-type="error"`, we treat it as failure, else success.
  // The error toast still gets added to the DOM even when the widget's
  // Toaster section is hidden, so MutationObserver can see it.
  useEffect(() => {
    if (!enabled || !onCommit) return

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const btn = target?.closest('button')
      // `startsWith` (not strict equality) keeps us robust to any wrapping
      // whitespace or a future "Commit Changes (N)" label variant the widget
      // might introduce.
      if (!btn || !btn.textContent?.trim().startsWith('Commit Changes')) return

      let resolved = false
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (!(node instanceof HTMLElement)) continue
            const toast = node.matches(SONNER_TOAST_SELECTOR)
              ? node
              : node.querySelector(SONNER_TOAST_SELECTOR)
            if (toast && toast.getAttribute(SONNER_TYPE_ATTR) === 'error') {
              resolved = true
              observer.disconnect()
              onCommit('error', toast.textContent?.trim() || 'Commit failed')
              return
            }
          }
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })

      window.setTimeout(() => {
        if (resolved) return
        observer.disconnect()
        onCommit('success', 'Changes saved')
      }, COMMIT_OUTCOME_WINDOW_MS)
    }

    // Capture phase: our handler runs BEFORE React's synthetic event system.
    // Important because Radix Dialog's close transition may briefly detach
    // the button from the DOM while in bubble phase, breaking `closest()`.
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [enabled, onCommit])
}
