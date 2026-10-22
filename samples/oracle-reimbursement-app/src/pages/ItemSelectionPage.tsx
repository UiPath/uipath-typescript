import s from './ItemSelectionPage.module.css';
import { PageProvider, UiCustomHtml, UiPanel, UiTextInput } from '../components/ui';
import CustomHTML_html from '../custom-html/ItemSelectionPage/CustomHTML.html?raw';
import CustomHTML_css from '../custom-html/ItemSelectionPage/CustomHTML.css?raw';
import CustomHTML_js from '../custom-html/ItemSelectionPage/CustomHTML.js?raw';
import { customHtmlBridge } from '../custom-html/bridge';
import { rootPanel_load, textActionTrigger_change } from './ItemSelectionPage.bindings';
import { useAppVar, useContainerValidity, useControlProp, useControlValidation } from '../lib/runtime';

export function ItemSelectionPage() {
  const string_ActionRequest = useAppVar<string>("String_ActionRequest");

  useControlValidation("ItemSelectionPage", "Text_ActionTrigger", useControlProp("ItemSelectionPage", "Text_ActionTrigger", "Value"), { type: "Text", requiredMessage: "Required field" });
  useContainerValidity("ItemSelectionPage", "rootPanel", ["Text_ActionTrigger"]);

  return (
    <PageProvider name="ItemSelectionPage">
        <UiPanel
          ctl="rootPanel"
          holdUntilLoaded
          className={s.rootPanel}
          onLoad={rootPanel_load}
        >
          <UiCustomHtml
            ctl="CustomHTML"
            className={s.customHTML}
            code={{ html: CustomHTML_html, css: CustomHTML_css, js: CustomHTML_js, cssExternal: [], jsExternal: [], bridge: customHtmlBridge }}
          />
          <UiTextInput
            ctl="Text_ActionTrigger"
            className={s.textActionTrigger}
            text={string_ActionRequest}
            label="ActionTrigger"
            hidden={true}
            onValueChange={textActionTrigger_change}
          />
        </UiPanel>
    </PageProvider>
  );
}
