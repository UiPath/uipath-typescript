import s from './MainPage.module.css';
import { PageProvider, UiCustomHtml, UiPanel, UiTextInput, UiValidationStation } from '../components/ui';
import CustomHTML_ShowDetails_html from '../custom-html/MainPage/CustomHTML_ShowDetails.html?raw';
import CustomHTML_ShowDetails_css from '../custom-html/MainPage/CustomHTML_ShowDetails.css?raw';
import CustomHTML_ShowDetails_js from '../custom-html/MainPage/CustomHTML_ShowDetails.js?raw';
import { customHtmlBridge } from '../custom-html/bridge';
import CustomHTML_Main_html from '../custom-html/MainPage/CustomHTML_Main.html?raw';
import CustomHTML_Main_css from '../custom-html/MainPage/CustomHTML_Main.css?raw';
import CustomHTML_Main_js from '../custom-html/MainPage/CustomHTML_Main.js?raw';
import { rootPanel_load, textMainActionTrigger_change } from './MainPage.bindings';
import { useAppVar, useContainerValidity, useControlProp, useControlValidation } from '../lib/runtime';

export function MainPage() {
  const contentValidationData_CurrentItem = useAppVar("ContentValidationData_CurrentItem");
  const boolean_MainCollapsed = useAppVar<boolean>("Boolean_MainCollapsed");
  const string_MainRequest = useAppVar<string>("String_MainRequest");

  useControlValidation("MainPage", "Text_MainActionTrigger", useControlProp("MainPage", "Text_MainActionTrigger", "Value"), { type: "Text", requiredMessage: "Required field" });
  useContainerValidity("MainPage", "rootPanel", ["Text_MainActionTrigger"]);

  return (
    <PageProvider name="MainPage">
        <UiPanel
          ctl="rootPanel"
          holdUntilLoaded
          className={s.rootPanel}
          onLoad={rootPanel_load}
        >
          <UiPanel
            ctl="Container_Viewer"
            className={s.containerViewer}
          >
            <UiPanel
              ctl="Container_ValidationControl"
              className={s.containerValidationControl}
            >
              <UiValidationStation
                ctl="ValidationControl"
                className={s.validationControl}
                stationVar="VarValidationControl_MainPage"
                dataSource={contentValidationData_CurrentItem}
                showDocumentType={false}
                fieldPosition="left"
              />
            </UiPanel>
            <UiPanel
              ctl="Container_ResizeButton"
              className={s.containerResizeButton}
              hidden={!(boolean_MainCollapsed ?? false)}
            >
              <UiCustomHtml
                ctl="CustomHTML_ShowDetails"
                className={s.customHTMLShowDetails}
                code={{ html: CustomHTML_ShowDetails_html, css: CustomHTML_ShowDetails_css, js: CustomHTML_ShowDetails_js, cssExternal: [], jsExternal: [], bridge: customHtmlBridge }}
              />
            </UiPanel>
            <UiPanel
              ctl="Container_Main"
              className={s.containerMain}
              hidden={boolean_MainCollapsed ?? false}
            >
              <UiCustomHtml
                ctl="CustomHTML_Main"
                className={s.customHTMLMain}
                code={{ html: CustomHTML_Main_html, css: CustomHTML_Main_css, js: CustomHTML_Main_js, cssExternal: [], jsExternal: [], bridge: customHtmlBridge }}
              />
            </UiPanel>
          </UiPanel>
          <UiTextInput
            ctl="Text_MainActionTrigger"
            className={s.textMainActionTrigger}
            text={string_MainRequest}
            hidden={true}
            onValueChange={textMainActionTrigger_change}
          />
        </UiPanel>
    </PageProvider>
  );
}
