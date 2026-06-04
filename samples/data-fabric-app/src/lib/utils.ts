import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * shadcn's standard className helper.
 *
 * Combines `clsx` (conditional class composition) with `tailwind-merge`
 * (resolves conflicting Tailwind utility classes, so `cn("p-2", "p-4")`
 * yields just `"p-4"` instead of both).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
