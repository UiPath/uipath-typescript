/** Authored defaults, used when a control or the page is reset. */
export const APP_VAR_DEFAULTS: Record<string, unknown> = {};

export const CONTROL_DEFAULTS: Record<string, Record<string, unknown>> = {
  "IntermediateLoadingPage/Header": {
    "headerStyle": "customized",
  },
  "LaunchPage/Header": {
    "headerStyle": "customized",
  },
  "MainPage/Container_Viewer": {
    "isValid": true,
  },
  "MainPage/Container_ValidationControl": {
    "isValid": true,
  },
  "MainPage/ValidationControl": {
    "duValidationStationFieldPosition": "left",
    "duValidationStationHideFields": false,
  },
  "MainPage/Container_ResizeButton": {
    "isValid": true,
  },
  "MainPage/Container_Main": {
    "isValid": true,
  },
  "MainPage/Text_MainActionTrigger": {
    "isValid": true,
  },
  "ItemSelectionPage/Text_ActionTrigger": {
    "isValid": true,
  },
};

