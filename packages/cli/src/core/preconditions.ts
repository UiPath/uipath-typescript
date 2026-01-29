import * as fs from 'fs';
import * as path from 'path';

export class Preconditions {
  static validate(rootDir: string): void {
    // Check for dist/ directory
    const distPath = path.join(rootDir, 'dist');
    if (!fs.existsSync(distPath)) {
      throw new Error(`dist/ directory not found at ${distPath}`);
    }

    if (!fs.statSync(distPath).isDirectory()) {
      throw new Error(`dist/ is not a directory at ${distPath}`);
    }
  }
}
