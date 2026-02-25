export enum MessageTypes {
  Info = 'info',
  Error = 'error',
  Success = 'success',
  Warning = 'warning',
}

export enum TaskStatus {
  Unassigned = 'Unassigned',
  Pending = 'Pending',
  Completed = 'Completed'
}

export type ActionCenterData = {
  taskId: number;
  title: string;
  status: TaskStatus;
  isReadOnly: boolean;
  action: string | null;
  data: unknown;
  folderId: number;
  folderName: string;
};
