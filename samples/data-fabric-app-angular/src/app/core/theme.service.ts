import { Injectable, effect, signal } from '@angular/core'

const STORAGE_KEY = 'data-fabric-explorer-theme'

/**
 * Light/dark mode wiring — the Angular counterpart of the React sample's
 * `next-themes` setup. Persists the choice in localStorage and falls back
 * to the OS preference on first visit. The `.dark` class on <html> drives
 * the token overrides in styles.css.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<'light' | 'dark'>(this.initialTheme())

  constructor() {
    effect(() => {
      const theme = this.theme()
      document.documentElement.classList.toggle('dark', theme === 'dark')
      localStorage.setItem(STORAGE_KEY, theme)
    })
  }

  toggle(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  private initialTheme(): 'light' | 'dark' {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
}
