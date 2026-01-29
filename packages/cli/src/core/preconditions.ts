import * as fs from 'fs';
import * as path from 'path';

export class Preconditions {
  static validate(rootDir: string, bundlePath: string = 'dist'): void {
    const buildPath = path.join(rootDir, bundlePath);
    if (!fs.existsSync(buildPath)) {
      throw new Error(`Build directory '${bundlePath}' not found at ${buildPath}`);
    }

    if (!fs.statSync(buildPath).isDirectory()) {
      throw new Error(`'${bundlePath}' is not a directory at ${buildPath}`);
    }
  }
}
