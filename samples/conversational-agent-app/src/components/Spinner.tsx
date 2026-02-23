/**
 * Spinner - Reusable loading spinner component
 */

interface SpinnerProps {
  className?: string
}

export function Spinner({ className = 'w-5 h-5 border-accent' }: SpinnerProps) {
  return (
    <div className={`border-2 border-t-transparent rounded-full animate-spin ${className}`} />
  )
}
