# UiPath TypeScript SDK

TypeScript SDK for UiPath platform APIs. Provides typed clients for Action Center, Conversational Agent, Data Fabric, Maestro, and Orchestrator services.

## Quick reference

```bash
npm install              # install deps
npm run build            # rollup build → dist/ (ESM, CJS, UMD, .d.ts)
npm test                 # vitest
npm run test:unit        # unit tests only (tests/unit/)
npm run test:integration # integration tests (vitest.integration.config.ts)
npm run test:all         # unit + integration tests
npm run test:coverage    # with v8 coverage
npm run lint             # oxlint
npm run typecheck        # tsc --noEmit
npm run docs:api         # typedoc + post-process
```

## Release workflow

- Version bumps go in a **separate PR** — never include a version bump in a feature or fix PR. Other in-flight changes may need to ship in the same version, so the bump is always a dedicated step.

@agent_docs/architecture.md
@agent_docs/conventions.md
@agent_docs/rules.md
