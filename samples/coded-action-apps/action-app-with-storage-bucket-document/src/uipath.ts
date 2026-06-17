import { Buckets } from '@uipath/uipath-typescript/buckets';
import { UiPath } from '@uipath/uipath-typescript/core';
import { CodedActionApp } from '@uipath/coded-action-app';

let sdk = new UiPath();

let codedActionAppsService = new CodedActionApp();

let bucketService = new Buckets(sdk);

export default { codedActionAppsService, bucketService };
