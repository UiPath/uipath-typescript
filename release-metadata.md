# `release-metadata.json`

Machine-readable record of **what public capabilities the SDK exposes and the version each was introduced in**. Shipped in the npm package (`files`) and served at `https://unpkg.com/@uipath/uipath-typescript@latest/release-metadata.json`.

Consumers (e.g. the `uipath-coded-apps` agent skill) use it to answer: *a capability isn't in the user's installed SDK — which version adds it?* Reading a user's installed `.d.ts` tells you whether something exists **now**; only this file tells you the **version to upgrade to** when it's absent.

## Contract

```jsonc
{
  "schema": 1,                    // file-format version
  "sdkVersion": "1.5.5",          // SDK version this file DESCRIBES (generated from). NOT an intro version.
  "services": [
    {
      "name": "Agents",           // public export name (not the internal `AgentService`)
      "subpath": "@uipath/uipath-typescript/agents",
      "since": "1.4.1",           // version the service was introduced; null = baseline
      "methods": [
        { "name": "getAll", "since": null },          // baseline (shipped before tracking)
        { "name": "getSummary", "since": "1.5.0" }    // introduced later
      ]
    }
  ]
}
```

- **`services` is an array of objects**, each with a `name` = public export name (`Agents`, not the internal `AgentService`).
- **Every public service and method is listed** (full enumeration). `methods` is an array of `{ name, since }`.
- **`since`** = the version a capability was introduced. **`null` = baseline** (shipped before this file existed; exact version not backfilled).
- **Absent from the file = does not exist.** There is no inheritance rule; every method is explicit.
- **`@internal` is excluded.** Signature changes (a new option on an existing method) are not tracked — the installed types already carry the shape.

### Reserved fields for deletions (unused today)

Two optional fields are reserved for when a method is eventually deleted. No entry sets them yet.

```jsonc
{ "name": "getGovernanceChecks", "since": "1.4.1", "deleted": "1.6.0", "replacedBy": "getGovernanceDecisions" }
```

- `deleted`: the version a capability was removed in. When set, the generator keeps the entry (a tombstone) rather than dropping it.
- `replacedBy` (optional): the migration target. Deterministic to fill only from a structured `@deprecated {@link X}` note; otherwise leave it out.

A rename is modeled the same way: the old name gets `deleted` + `replacedBy`, the new name gets its own `since`.

## Generated, not hand-written

`release-metadata.json` is produced by `npm run release-metadata:gen` (`scripts/gen-release-metadata.mjs`) from the freshly-built public surface. It is a **deterministic** pass — pure static analysis (the TypeScript compiler API) plus a JSON diff, no LLM — so the same inputs always produce byte-identical output. On each run it:

1. Enumerates every public service (`*Service as PublicName` exports from the subpath barrels; subpaths from `package.json` `exports`) and its public methods, **including inherited ones**, excluding `@internal`.
2. Loads the previous `release-metadata.json` as the history source and **carries existing `since` values forward unchanged** (immutable history).
3. Stamps any newly-added capability with the package version; **tombstones** anything in the previous file but gone from the surface (`deleted` = this version).
4. Sets `sdkVersion` to the package version and writes with a stable sort.

Run it after `npm run build` (never a stale local dist). Pass `--bootstrap` for the one-time seed, where methods not in the previous (curated) file default to `since: null` rather than the current version.

## Where it runs

The file is a **release artifact**: regenerate it when cutting a release so it describes the released version. Two options (see the design doc):

- **Version-bump PR (committed):** run `release-metadata:gen` in the "bump version to X" PR (manually, or via a workflow that commits onto the PR branch). Publish ships the committed file.
- **Publish-only (not committed):** the Publish workflow runs `release-metadata:gen` after build and includes the file in the tarball; `since` history is carried forward from the previous published file (unpkg `@latest`).
