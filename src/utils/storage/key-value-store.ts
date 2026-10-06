/** A store whose calls never throw: a read it cannot serve is `undefined`, a write it cannot keep returns `false`. */
export interface KeyValueStore {
  read<T>(key: string): T | undefined;
  write(key: string, value: unknown): boolean;
  remove(key: string): void;
}
