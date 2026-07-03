import { Component, inject } from '@angular/core'
import { ToastService } from '../core/toast.service'
import { IconX } from './icons'

/** Renders the ToastService queue in the top-right corner. */
@Component({
  selector: 'app-toast-container',
  imports: [IconX],
  styles: `
    .toasts {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 340px;
      max-width: calc(100vw - 32px);
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
      padding: 10px 12px;
      box-shadow: 0 8px 24px rgb(0 0 0 / 0.15);
      font-size: 13.5px;
    }
    .toast-success { border-left: 3px solid #3d9a5f; }
    .toast-error { border-left: 3px solid var(--destructive); }
    .toast-info { border-left: 3px solid var(--primary); }
    .toast-message { font-weight: 500; flex: 1; min-width: 0; }
    .toast-description {
      font-weight: 400;
      color: var(--muted-foreground);
      margin-top: 2px;
      font-size: 12.5px;
    }
    .toast-dismiss {
      border: none;
      background: none;
      color: var(--muted-foreground);
      cursor: pointer;
      padding: 2px;
      flex-shrink: 0;
    }
    .toast-dismiss:hover { color: var(--foreground); }
  `,
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast-{{ toast.kind }}">
          <div class="toast-message">
            {{ toast.message }}
            @if (toast.description) {
              <div class="toast-description">{{ toast.description }}</div>
            }
          </div>
          <button
            type="button"
            class="toast-dismiss"
            aria-label="Dismiss"
            (click)="toastService.dismiss(toast.id)"
          >
            <icon-x />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService)
}
