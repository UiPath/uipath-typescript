/**
 * Ontologies Module
 *
 * Provides access to UiPath Ontologies — typed knowledge graphs with typed
 * component files (ofn, owl, r2rml, shacl, summary, context).
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
 */

export { OntologyService as Ontologies, OntologyService } from './ontology';

export * from '../../models/ontology/ontology.types';
export * from '../../models/ontology/ontology.models';
