import React from 'react'

interface LoadingStateProps {
  height?: string
}

export function LoadingState({ height = 'h-64' }: LoadingStateProps) {
  return <div className={`${height} animate-pulse rounded-lg bg-muted`} />
}
