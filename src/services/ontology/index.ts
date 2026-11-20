/**
 * Ontologies Module
 *
 * Reads deployed UiPath Ontologies and validates ontology artifact content.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Ontologies } from '@uipath/uipath-typescript/ontologies';
 *
 * const sdk = new UiPath(config);
 * const ontologies = new Ontologies(sdk);
 * const all = await ontologies.getAll();
 * ```
 *
 * @module
 * @experimental
 */

export { OntologyService as Ontologies } from './ontology';

export * from '@/models/ontology/ontology.types';
export * from '@/models/ontology/ontology.models';
