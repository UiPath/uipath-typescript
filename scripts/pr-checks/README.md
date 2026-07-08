# PR convention checks

Deterministic gates derived from recurring PR review feedback (analysis of ~680 human
review comments, Jun–Jul 2026). Run locally with `npm run lint:pr`; CI runs them via the
`deterministic-lint` job in `.github/workflows/pr-checks.yml`. Node stdlib only — no deps.

| Script | Enforces |
|--------|----------|
| `validate-samples.mjs` | Per sample app: README with media, canonical `uipath.json.example`, config key allowlist, no committed clientId GUIDs/.env, `.gitignore` completeness, `lint` script, unique package names, kebab-case dirs, README paths exist, lockfile in sync |
| `check-jsdoc-sync.mjs` | JSDoc on `{Entity}ServiceModel` identical to the service class copy (agent_docs/rules.md). Pairing via `implements XServiceModel`; doc-only scoped models are skipped |
| `check-docs-consistency.mjs` | Every non-`@internal` `@track` method name appears as a documented row somewhere in `docs/oauth-scopes.md`; scope cells contain scopes, not prose. No prefix→section mapping is maintained anywhere — it matches method names between the code and the doc's existing rows. It checks a method is documented *somewhere*, not under the right heading (that stays review's job) |
| `check-hygiene.mjs` | Ratchet on: `as any` / `as unknown as` in tests, `console.warn` in integration tests, unjustified `.skip` (needs a PAT/OAuth comment), `try {` in integration tests, double blank lines, internal-types barrel re-exports |

## Baselines

Pre-existing violations are grandfathered in the `*-baseline.json` files — the gates only
fail on **new** violations. When you fix grandfathered ones (please do), refresh with:

```bash
node scripts/pr-checks/<script>.mjs --update-baseline   # or run-all.mjs --update-baseline
```

Shrinking baselines is always welcome; a PR that grows one needs a good reason.

Caveat: `check-jsdoc-sync` baselines by method key, so a method already listed as drifted
won't flag further drift until it's fixed and removed from the baseline.
