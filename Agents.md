# UiPath TypeScript SDK

TypeScript SDK for UiPath platform APIs. Provides typed clients for Action Center, Conversational Agent, Data Fabric, Maestro, and Orchestrator services.

## Quick reference

```bash
npm install              # install deps
npm run build            # rollup build → dist/ (ESM, CJS, UMD, .d.ts)
npm test                 # vitest
npm run test:unit        # unit tests (root tests/unit/)
npm run test:integration # integration tests (vitest.integration.config.ts)
npm run test:all         # unit + integration tests
npm run test:coverage    # with v8 coverage
npm run lint             # oxlint
npm run typecheck        # tsc --noEmit
npm run docs:api         # typedoc + post-process
```

## Release workflow

- Version bumps go in a **separate PR** — never include a version bump in a feature or fix PR. Other in-flight changes may need to ship in the same version, so the bump is always a dedicated step.

## Samples & Template Gallery

- Every app under `samples/` must ship a **preview GIF** at `samples/<app>/screenshots/` (e.g. `preview.gif`) showing the app in use. The app README and the docs Template Gallery both render it — a missing GIF leaves an empty poster tile in the gallery.
- The **Template Gallery** (`docs/samples/index.md`) is the browsable, filterable index of `samples/` published on the docs site. When you **add, rename, remove, or re-scope a sample, update the gallery in the same PR** so the site stays in sync. Edit the inline app list (the `#tg-data` JSON block) — add or adjust an entry:

  ```json
  { "id": "<folder>", "title": "...", "description": "...", "category": "<existing category id>", "framework": "React | Angular", "tags": ["..."], "path": "samples/<...>", "preview": "samples/<...>/screenshots/preview.gif" }
  ```

  `path` is the repo-relative sample folder; `preview` is the repo-relative GIF path (or `null` to show a generated poster). Reuse an existing `category` id and `tags` where possible — they drive the gallery filters.

@agent_docs/architecture.md
@agent_docs/conventions.md
@agent_docs/rules.md
