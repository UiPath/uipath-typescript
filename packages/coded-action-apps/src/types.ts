/** Severity level for toast messages displayed in Action Center. */
export enum MessageSeverity {
  Info = 'info',
  Error = 'error',
  Success = 'success',
  Warning = 'warning',
}

/** Represents the status of a task in Action Center. */
export enum TaskStatus {
  Unassigned = 'Unassigned',
  Pending = 'Pending',
  Completed = 'Completed'
}

/** Details of task opened in Action Center. */
export type Task = {
  /** Unique identifier of the task. */
  taskId: number;
  /** Display title of the task. */
  title: string;
  /** Current status of the task. */
  status: TaskStatus;
  /** Whether the task is in read-only mode for the current user. Disable editing if this is true */
  isReadOnly: boolean;
  /** The action that was taken to complete the task, or `null` if not yet completed. */
  action: string | null;
  /** Data of the task. */
  data: unknown;
  /** ID of the folder the task belongs to. */
  folderId: number;
  /** Display name of the folder the task belongs to. */
  folderName: string;
  /** UI theme that Action Center is currently using. */
  theme: Theme;
};

/** UI theme applied to Action Center, passed to the coded action app on load. */
export enum Theme {
  AutoTheme = 'autoTheme',
  Light = 'light',
  Dark = 'dark',
  LightHighContrast = 'light-hc',
  DarkHighContrast = 'dark-hc',
}

/** Response returned by Action Center after a task completion attempt. This type is used by coded-action-apps package */
export type TaskCompleteResponse = {
  /** Whether the task was completed successfully. */
  success: boolean,
  /** Error code returned on failure, null when successful */
  errorCode: number | null,
  /** Human-readable error message returned on failure, null when successful. */
  errorMessage: string | null,
}
