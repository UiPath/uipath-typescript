import { WebStore } from './web-store';

const NAME = 'session store';

/** Values kept for the length of the user's browser session, in the one tab that wrote them. */
export class SessionStore extends WebStore {
  constructor(storage: Storage) {
    super(storage, NAME);
  }

  static open(): SessionStore | undefined {
    const storage = WebStore.resolve('sessionStorage', NAME);
    return storage ? new SessionStore(storage) : undefined;
  }
}
