/**
 * Maps fields for Bucket entities to ensure consistent naming
 */
export const BucketMap: { [key: string]: string } = {
    fullPath: 'path',
    items: 'blobItems',
    verb: 'httpMethod'
  }; 