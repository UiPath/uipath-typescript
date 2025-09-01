/**
 * Maps fields for Bucket entities to ensure consistent naming
 */
export const BucketMap: { [key: string]: string } = {
    fullPath: 'path',
    items: 'blobItems',
    verb: 'httpMethod'
  };

/**
 * Default content type for file uploads when detection fails
 */
export const DEFAULT_CONTENT_TYPE = 'application/octet-stream'; 
