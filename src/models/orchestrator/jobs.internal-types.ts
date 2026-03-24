/**
 * Internal types for Jobs service — not exported through public API.
 * These represent raw API response shapes used during composite method execution.
 */

/**
 * Raw blob file access info returned by the Attachments API
 * Contains a presigned URI for downloading the blob content
 */
export interface RawBlobFileAccess {
  Uri: string;
  Headers: {
    Keys: string[];
    Values: string[];
  };
  RequiresAuth: boolean;
}

/**
 * Raw attachment response from GET /odata/Attachments({key})
 */
export interface RawAttachmentResponse {
  Name: string;
  BlobFileAccess: RawBlobFileAccess;
  Id: string;
  JobKey: string;
  AttachmentCategory: string;
  CreationTime: string;
  LastModificationTime: string;
}
