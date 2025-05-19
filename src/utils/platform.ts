/**
 * Platform detection and environment-specific utilities
 */
export const isNode = typeof process !== 'undefined' && 
  process.versions != null && 
  process.versions.node != null;

export const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

/**
 * Environment-specific file system operations
 */
export class FileSystem {
  private static async importNodeFs() {
    if (isNode) {
      const fs = await import('fs/promises');
      return fs;
    }
    return null;
  }

  static async readFile(path: string): Promise<Buffer> {
    if (isNode) {
      const fs = await this.importNodeFs();
      if (fs) {
        return fs.readFile(path);
      }
    }
    throw new Error('File system operations are only available in Node.js environment');
  }

  static async writeFile(path: string, data: Buffer): Promise<void> {
    if (isNode) {
      const fs = await this.importNodeFs();
      if (fs) {
        return fs.writeFile(path, data);
      }
    }
    throw new Error('File system operations are only available in Node.js environment');
  }
} 