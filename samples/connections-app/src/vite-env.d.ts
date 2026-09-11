/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Optional default for the required folder scope, as a folder key (GUID).
   * Takes precedence over VITE_UIPATH_FOLDER_PATH when both are set.
   */
  readonly VITE_UIPATH_FOLDER_KEY?: string
  /**
   * Optional default for the required folder scope, as a slash-delimited
   * folder path, e.g. `Shared/Finance`.
   */
  readonly VITE_UIPATH_FOLDER_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
