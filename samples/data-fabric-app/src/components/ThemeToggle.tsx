import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@uipath/apollo-wind/components/ui/tooltip'

/**
 * Icon button that cycles through `light → dark → system → light → …`.
 *
 * Single-button toggle (vs a dropdown) keeps the header compact. The icon
 * reflects the *resolved* theme — sun in light mode, moon in dark — and the
 * tooltip surfaces what the next click will do.
 *
 * Renders nothing on the server-equivalent first paint to avoid a hydration
 * mismatch from `next-themes`.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const next =
    theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const tooltip =
    next === 'light'
      ? 'Switch to light mode'
      : next === 'dark'
        ? 'Switch to dark mode'
        : 'Match system preference'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(next)}
          aria-label={tooltip}
        >
          {theme === 'system' ? (
            <Monitor className="h-4 w-4" />
          ) : resolvedTheme === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  )
}
