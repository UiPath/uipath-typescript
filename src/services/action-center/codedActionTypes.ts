export enum EVENT_NAMES {
  INIT = 'init',
  COMPLETE = 'complete',
  DATACHANGED = 'dataChanged',
  LOADAPP = 'loadApp',
  ERROR = 'error',
  TOKENREFRESHED = 'tokenRefreshed',
  LANGUAGECHANGED = 'languageChanged',
  THEMECHANGED = 'themeChanged',
}

export type ActionCenterData = {
  taskId: number,
  title: string,
  status: TaskStatus,
  isReadOnly: boolean,
  data: any,
  action: string,
  organizationUnitId: number,
  organizationUnitFullyQualifiedName: string,
  baseUrl: string,
  orgName: string,
  tenantName: string,
  token: string,
  language: string,
  theme: Theme,
  newToken: string,
  newLanguage: string,
  newTheme: string,
}

enum TaskStatus {
    Unassigned = 'Unassigned',
    Pending = 'Pending',
    Completed = 'Completed',
}

enum Theme {
    autoTheme = 'autoTheme',
    light = 'light',
    dark = 'dark',
    lighthc = 'light-hc',
    darkhc = 'dark-hc',
}