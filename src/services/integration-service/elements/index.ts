/**
 * Integration Service — Elements module.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Elements } from '@uipath/uipath-typescript/is-elements';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const elements = new Elements(sdk);
 * const objects = await elements.getObjects('uipath-slack');
 * ```
 *
 * @module
 */

export { ElementsService as Elements, ElementsService } from './elements';

export * from '../../../models/integration-service/elements.types';
export * from '../../../models/integration-service/elements.models';
