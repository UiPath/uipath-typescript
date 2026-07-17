import { Injectable, signal } from '@angular/core'

export interface Toast {
  id: number
  kind: 'success' | 'error' | 'info'
  message: string
  description?: string
}

const TOAST_DURATION_MS = 4000

/**
 * Minimal toast feedback — the Angular counterpart of the React sample's
 * `sonner` toaster. Rendered by `ToastContainerComponent` in the app shell.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([])
  private nextId = 1

  success(message: string, description?: string): void {
    this.push('success', message, description)
  }

  error(message: string, description?: string): void {
    this.push('error', message, description)
  }

  info(message: string, description?: string): void {
    this.push('info', message, description)
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id))
  }

  private push(kind: Toast['kind'], message: string, description?: string) {
    const toast: Toast = { id: this.nextId++, kind, message, description }
    this.toasts.update((list) => [...list, toast])
    setTimeout(() => this.dismiss(toast.id), TOAST_DURATION_MS)
  }
}
