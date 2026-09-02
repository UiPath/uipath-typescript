import { UiPath } from '@uipath/uipath-typescript/core';
import { CodedActionApp } from '@uipath/coded-action-app';

// Action Center injects the session into this app's iframe, so the SDK is usable as
// constructed. Never call sdk.initialize() here - that starts a browser OAuth redirect,
// which cannot complete inside a frame.
export const sdk = new UiPath();

export const codedActionApp = new CodedActionApp();
