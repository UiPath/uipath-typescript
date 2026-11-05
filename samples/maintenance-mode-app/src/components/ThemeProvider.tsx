import type { ReactNode } from 'react'
import { ThemeProvider as NextThemeProvider } from 'next-themes'

interface Props {
  children: ReactNode
}

/**
 * App-wide theme provider.
 *
 * `next-themes` persists the user's choice to localStorage, falls back to
 * `prefers-color-scheme`, and avoids the flash-of-wrong-theme issue. It applies
 * `light` / `dark` as a class on `<html>`, which is what apollo-wind's tokens
 * key off.
 */
export function ThemeProvider({ children }: Props) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  )
}
