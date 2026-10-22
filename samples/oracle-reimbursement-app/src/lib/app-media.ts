/** Bundled media, keyed by the name VB expressions use. */
export interface MediaEntry {
  file: string;
  mimeType: string;
  size: number;
}

export const APP_MEDIA: Record<string, MediaEntry> = {
  "App_Logo": { file: "logo.svg", mimeType: "image/svg+xml", size: 320 },
};
