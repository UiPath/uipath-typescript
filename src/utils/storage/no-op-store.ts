import type { KeyValueStore } from './key-value-store';

export const NO_OP_STORE: KeyValueStore = {
  read: () => undefined,
  write: () => false,
  remove: () => {},
};
