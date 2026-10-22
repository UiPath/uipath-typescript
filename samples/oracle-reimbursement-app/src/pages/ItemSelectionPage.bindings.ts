/** Event handlers and state accessors for ItemSelectionPage. */
import { ItemSelectionPage_ItemSelectionPage_load, ItemSelectionPage_Text_ActionTrigger_change } from '../workflows';

/** `rootPanel` on load. */
export async function rootPanel_load() {
  await ItemSelectionPage_ItemSelectionPage_load();
}

/** `Text_ActionTrigger` on change. */
export async function textActionTrigger_change() {
  await ItemSelectionPage_Text_ActionTrigger_change();
}
