import type { KeyValueStore } from './key-value-store';

export class NoOpStore implements KeyValueStore {
  read<T>(): T | undefined {
    return undefined;
  }

  write(): boolean {
    return false;
  }

  remove(): void {}
}
