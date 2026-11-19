import { WebStore } from './web-store';

const NAME = 'local store';

/** Values shared by every tab of the page's origin and kept across browser restarts, until removed. */
export class LocalStore extends WebStore {
  constructor(storage: Storage) {
    super(storage, NAME);
  }

  static open(): LocalStore | undefined {
    const storage = WebStore.resolve('localStorage', NAME);
    return storage ? new LocalStore(storage) : undefined;
  }
}
