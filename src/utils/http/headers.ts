import { FOLDER_ID } from "../constants/headers";

/**
   * Creates headers object with folder ID if provided
   * @param folderId - Optional folder/organization unit ID
   * @returns Headers object with folder ID if provided
   * @private
   */
export function createHeaders(folderId?: number): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (folderId !== undefined) {
      headers[FOLDER_ID] = folderId.toString();
    }
    
    return headers;
  }