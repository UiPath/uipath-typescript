# API surface snapshots

Generated, committed snapshots of the public API for every subpath export.

- Regenerate with `npm run api-surface:gen`.
- CI (`.github/workflows/api-surface.yml`) regenerates and fails if these files
  drift, so a change to a published signature cannot merge without appearing as
  a reviewable diff.
- A `-` line is a signature that consumers can no longer call as written. That is
  not automatically wrong, but it must be a decision, not a side effect: declare
  it in the release notes and bump the version accordingly.

The generator reads source through the TypeScript AST with no type checker and no
module resolution, so it also runs against any historical ref:

```bash
scripts/api-surface-replay.sh <ref>          # <ref>^ vs <ref>
scripts/api-surface-replay.sh <refA> <refB>
```

Parameter names are kept here for readability; they are not part of the
positional call contract, so ignore renames when judging impact.
