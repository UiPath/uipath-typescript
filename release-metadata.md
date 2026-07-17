# `release-metadata.json`

Machine-readable map of **what public capabilities the SDK exposes and the version each was introduced in**. Shipped in the npm package (`files`) and served at `https://unpkg.com/@uipath/uipath-typescript@latest/release-metadata.json`.

Consumers (e.g. the `uipath-coded-apps` agent skill) use it to answer: *a capability isn't in the user's installed SDK — which version adds it?* Reading a user's installed `.d.ts` tells you whether something exists **now**; only this file tells you the **version to upgrade to** when it's absent.

## Contract

```jsonc
{
  "schema": 1,                    // file-format version
  "snapshotVersion": "1.5.5",     // SDK version this file DESCRIBES (captured-from). NOT an intro version.
  "services": {
    "Agents": {
      "subpath": "@uipath/uipath-typescript/agents",
      "since": "1.4.1",           // version the service was introduced; null = baseline
      "methods": {                // only methods whose version DIFFERS from the service
        "getSummary": "1.5.0"     // bare version string. Unlisted methods INHERIT the service `since`.
      }
    },
    "Entities": { "subpath": "@uipath/uipath-typescript/entities", "since": null }
  },
  "enums": {
    "EntityFieldDataType": { "subpath": "@uipath/uipath-typescript/entities",
                             "values": { "MULTILINE_MAX": "1.5.2" } }
  }
}
```

- **Keys** = public export names (`Agents`, not the internal `AgentService`).
- **`since`** = the version a capability was introduced. **`null` = baseline** (shipped before this file existed; not backfilled).
- **Method / enum-member value** = bare version string. **Inheritance:** a method with no entry inherits its service's `since`, so only list methods introduced *later* than their service (Android `api-versions.xml` style).
- **Scope = presence + `since` only.** No signatures, no renames, no removals. Signature/behavior changes are visible in the installed `.d.ts`; renames are covered by the SDK's `@deprecated` + replacement pointers (deprecate-don't-remove policy).
- **`@internal` is excluded.** Anything a consumer shouldn't rely on must carry an `@internal` JSDoc tag.

## Adding a capability (every release)

1. New **service** → add `services.<PublicName> = { subpath, since: "<this version>" }`.
2. New **method** on an existing service → add it under that service's `methods` with `"<this version>"` **only if** its version differs from the service `since` (else it inherits).
3. New **enum member** → add under `enums.<Enum>.values`.
4. Bump `snapshotVersion` to the release version.

Signature-only changes (new options on an existing method) → **no entry** (the installed types carry the shape).

## CI enforcement

`npm run release-metadata:check` (`scripts/check-release-metadata.mjs`, run in `.github/workflows/ci.yml` after a fresh `npm run build`) fails the build if:

- a public service (exported as `*Service as *` from a public subpath) has **no entry** → prints the JSON to add;
- an entry has **no matching public service** → warns (possible removal — confirm before dropping; removals are rare);
- `snapshotVersion` ≠ `package.json` version.

The check reads the **freshly-built `dist/`**, never a local one (a stale local `dist/` can omit shipped symbols).

### v1 limitations (follow-ups)

- Enforcement is **service-level**; per-method and per-enum-member entries are authored/curated, not yet machine-verified.
- Non-class public exports (e.g. the `document-understanding` `DuFramework` namespace) are not enumerated.
- Author-assisted generation (auto-diff the surface and stamp new entries) is manual today, guided by the check's output.
