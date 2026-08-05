// Manifest JSON files are typed as unknown and narrowed to VersionManifest at
// the import site (registry.gen.ts). resolveJsonModule is intentionally off so
// TypeScript doesn't infer over-wide literal types from the JSON content.
declare module '*.json' {
  const value: unknown;
  export default value;
}
