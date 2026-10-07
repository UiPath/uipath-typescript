import { SessionStore } from '../../utils/storage/session-store';
import { NoOpStore } from '../../utils/storage/no-op-store';
import type { KeyValueStore } from '../../utils/storage/key-value-store';

export const authStore: KeyValueStore = SessionStore.open() ?? new NoOpStore();
