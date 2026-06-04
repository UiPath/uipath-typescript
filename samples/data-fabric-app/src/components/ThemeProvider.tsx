import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes'

interface Props {
  children: ReactNode
}

/**
 * App-wide theme provider.
 *
 * - `next-themes` is the shadcn/Vercel-recommended way to manage light/dark
 *   themes: it persists the user's choice to localStorage, falls back to
 *   `prefers-color-scheme`, and avoids the flash-of-wrong-theme issue.
 * - By default the class is applied to `<html>`. The UiPath data-table widget
 *   reads it from `<body>` ("Add either `light` or `dark` class to your HTML
 *   `<body>` element to enable proper theming"), so `BodyClassSync` mirrors it.
 */
export function ThemeProvider({ children }: Props) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <BodyClassSync />
      {children}
    </NextThemeProvider>
  )
}

function BodyClassSync() {
  const { resolvedTheme } = useTheme()
  useEffect(() => {
    if (!resolvedTheme) return
    document.body.classList.remove('light', 'dark')
    document.body.classList.add(resolvedTheme)
  }, [resolvedTheme])
  return null
}
