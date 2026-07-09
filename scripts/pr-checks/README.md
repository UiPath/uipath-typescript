# PR Convention Checks

Deterministic gates derived from recurring PR review feedback (analysis of ~680 human
review comments, Jun-Jul 2026). Run locally with `npm run lint:pr`; CI runs them via the
`deterministic-lint` job in `.github/workflows/pr-checks.yml`.

The semantic source checks use the TypeScript compiler API so they can reason about
classes, decorators, overloads, `implements` clauses, and JSDoc without relying on
source regexes. The lightweight hygiene/sample checks stay text-based where the rule is
actually textual.

| Script | Enforces |
|--------|----------|
| `check-samples.mjs` | Per sample app: README with media, canonical `uipath.json.example`, config key allowlist, no committed clientId GUIDs/.env, `.gitignore` completeness, `lint` script, unique package names, kebab-case dirs, README paths exist, lockfile in sync |
| `check-jsdoc-consistency.mjs` | JSDoc on `{Entity}ServiceModel` identical to the service class copy. Pairing uses TypeScript AST `implements XServiceModel`; doc-only scoped models are skipped |
| `check-oauth-scopes.mjs` | Every non-`@internal` `@track` method appears in the matching `docs/oauth-scopes.md` section; scope cells contain scopes, not prose. Source parsing uses TypeScript AST decorators/methods; Markdown parsing is section-aware |
| `check-hygiene.mjs` | Ratchet on: `as any` / `as unknown as` in tests, `console.warn` in integration test files, unjustified `.skip` (needs a PAT/OAuth comment), `try {` in integration test files, double blank lines, internal-types barrel re-exports |

Shared helpers:

- `typescript-source.mjs`: TypeScript AST and JSDoc helpers.
- `workspace.mjs`: repo paths and file walking.
- `baseline.mjs`: baseline update/failure reporting.

## Baselines

Pre-existing violations are grandfathered in the `*-baseline.json` files - the gates only
fail on **new** violations. When you fix grandfathered ones (please do), refresh with:

```bash
node scripts/pr-checks/<script>.mjs --update-baseline   # or run-all.mjs --update-baseline
```

Shrinking baselines is always welcome; a PR that grows one needs a good reason.

Caveat: `check-jsdoc-consistency` baselines by method key, so a method already listed as drifted
won't flag further drift until it's fixed and removed from the baseline.
