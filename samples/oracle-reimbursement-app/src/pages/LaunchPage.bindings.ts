/** Event handlers and state accessors for LaunchPage. */
import { LaunchPage_LaunchPage_load } from '../workflows';

/** `rootPanel` on load. */
export async function rootPanel_load() {
  await LaunchPage_LaunchPage_load();
}
