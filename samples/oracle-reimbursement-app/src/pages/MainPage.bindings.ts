/** Event handlers and state accessors for MainPage. */
import { MainPage_MainPage_load, MainPage_Text_MainActionTrigger_change } from '../workflows';

/** `rootPanel` on load. */
export async function rootPanel_load() {
  await MainPage_MainPage_load();
}

/** `Text_MainActionTrigger` on change. */
export async function textMainActionTrigger_change() {
  await MainPage_Text_MainActionTrigger_change();
}
