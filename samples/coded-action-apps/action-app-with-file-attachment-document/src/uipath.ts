import { Attachments } from '@uipath/uipath-typescript/attachments';
import { UiPath } from '@uipath/uipath-typescript/core';
import { CodedActionApp } from '@uipath/coded-action-app';

let sdk = new UiPath();

let codedActionAppsService = new CodedActionApp();

let attachmentService = new Attachments(sdk);

export default { codedActionAppsService, attachmentService };