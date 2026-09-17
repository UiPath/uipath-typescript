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

## Reading the diff

Parameter names are kept for readability. Renaming a *positional* parameter is
not a breaking change; renaming a field inside an options-object type is.

## What this does not cover

- Runtime behaviour: a changed default, a new throw, a different endpoint behind
  an unchanged signature.
- Breaking changes that read as additions -- a newly *required* field or
  parameter is breaking but appears as a `+` line.
- Values behind a non-literal initializer (e.g. `new X()`), which render as the
  name alone.
