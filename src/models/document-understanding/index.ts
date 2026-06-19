// Direct named exports for the DU framework contracts. Re-exporting them flat on
// this dedicated subpath entry (where the generic DU names can't collide with the
// top-level barrel) lets consumers import them by name, e.g.
//   import type { DocumentTaxonomy, ExtractionResult } from '@uipath/uipath-typescript/document-understanding';
// Unlike the `export * as DuFramework` namespace form below, direct named exports
// remain nameable in a consumer's generated .d.ts when the type flows through an
// inferred public surface (Angular/ngrx output()/input(), signalStore state) — the
// namespace form trips TS4023 "cannot be named" there.
export * from './framework';

// Namespace form, kept for discoverability and back-compat (`DuFramework.X`).
export * as DuFramework from './framework';
