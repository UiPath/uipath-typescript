import { describe, it, expect } from 'vitest';
import { encodeFolderPathHeader } from '../../../../src/utils/encoding/folder-path';

describe('encodeFolderPathHeader', () => {
  // Reference values produced by Node:
  //   Buffer.from(<path>, 'utf16le').toString('base64')
  // which mirrors Orchestrator's `Encoding.Unicode.GetString(...)` decode.

  it('encodes ASCII paths as base64-of-UTF-16-LE bytes', () => {
    expect(encodeFolderPathHeader('Shared/Finance')).toBe('UwBoAGEAcgBlAGQALwBGAGkAbgBhAG4AYwBlAA==');
  });

  it('encodes paths containing spaces', () => {
    expect(encodeFolderPathHeader('Shared/My Finance')).toBe(
      'UwBoAGEAcgBlAGQALwBNAHkAIABGAGkAbgBhAG4AYwBlAA==',
    );
  });

  it('encodes the empty string to the empty base64 string', () => {
    expect(encodeFolderPathHeader('')).toBe('');
  });
});
