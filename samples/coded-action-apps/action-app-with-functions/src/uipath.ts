import { UiPath } from '@uipath/uipath-typescript/core';
import { Assets } from '@uipath/uipath-typescript/assets';
import { Functions } from '@uipath/uipath-typescript/functions';
import { CodedActionApp } from '@uipath/coded-action-app';

// No initialize() call: Action Center's iframe injects the platform session at runtime.
let sdk = new UiPath();

let codedActionAppsService = new CodedActionApp();

let assetService = new Assets(sdk);

let functionService = new Functions(sdk);

export default { codedActionAppsService, assetService, functionService };
