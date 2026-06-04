import { useEffect } from 'react'

/**
 * Hides the widget toolbar buttons we've replaced with our own UI.
 *
 * The `@uipath/ui-widgets-datatable` toolbar exposes a number of actions,
 * some of which duplicate functionality we surface elsewhere in the app:
 *
 *   - "Refresh"        → we have a Refresh button in the page header.
 *   - "Add Row"        → we use a modal `RecordEditor` instead of inline.
 *   - "Insert Records" → only relevant if "Add Row" is in use; hidden too.
 *
 * What stays visible (the widget's native flow):
 *
 *   - "Show Diff (N)"  → opens the diff dialog so the user can review
 *                        their pending inline edits before committing.
 *   - "Discard"        → cancels the pending edits.
 *   - "Delete Records (N)" → only shown when one or more rows are selected
 *                        (we keep the widget's "no selection = hidden"
 *                        behaviour intact).
 *
 * Hiding is done via inline `display: none`, set whenever the widget
 * re-renders (a MutationObserver re-applies it on every change). The
 * buttons stay in the DOM so the widget's internal click handlers keep
 * working — only their visual presence is suppressed.
 */
export function useWidgetToolbarOverrides(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return

    const HIDDEN_BUTTON_LABELS = ['Add Row', 'Insert Records', 'Refresh']

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

        // "Delete Records (N)" — only show when N > 0 (i.e., at least one
        // row selected). Toggling display lets it reappear when needed.
        if (text.startsWith('Delete Records')) {
          const match = text.match(/Delete Records \((\d+)\)/)
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
  }, [enabled])
}
