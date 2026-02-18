import * as fs from 'fs';
import * as path from 'path';
import { MESSAGES } from '../constants/index.js';

function buildDirErrorMessage(
  reason: string
): string {
  return `${reason}\n\n${MESSAGES.ERRORS.PUSH_BUILD_DIR_STEPS}`;
}

export class Preconditions {
  static validate(rootDir: string, bundlePath: string = 'dist'): void {
    const buildPath = path.join(rootDir, bundlePath);
    if (!fs.existsSync(buildPath)) {
      const reason = `${MESSAGES.ERRORS.PUSH_BUILD_DIR_NOT_FOUND} ('${bundlePath}' at ${buildPath})`;
      throw new Error(buildDirErrorMessage(reason));
    }

    if (!fs.statSync(buildPath).isDirectory()) {
      const reason = `${MESSAGES.ERRORS.PUSH_BUILD_DIR_NOT_DIRECTORY} ('${bundlePath}' at ${buildPath})`;
      throw new Error(buildDirErrorMessage(reason));
    }
  }
}
