# API Reference

The `@uipath/coded-functions-js-sdk` package exports:

| Export                                                      | Description                                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [`defineFunction`](define-function/)                        | Declare a function — name, method, path, contract, handler                              |
| [`defineSchema<T>()`](define-function/#declaring-contracts) | Declare a contract as a TypeScript type — lowered to a JSON Schema at build time        |
| [`FunctionError`](function-error/)                          | Throw to return a specific HTTP status from a handler                                   |
| [`FunctionContext`](function-context/)                      | Type for the second handler argument — caller identity, robot identity, params, headers |
| [Response helpers](response-helpers/)                       | `ok()`, `created()`, `notFound()`, `badRequest()`, etc.                                 |

The canonical "hello" sample used by every scaffolding surface (`uip functions new`, Studio Web) lives in the extractor package, next to the document builders that derive its deployment documents:

| Export                                                                                                                       | Description                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@uipath/coded-functions-js-extractor` → `getSampleProject(options)`                                                         | **The one-call scaffold**: every file a sample project needs as a ready-to-write path → content map; `entry-points.json` and `bindings_v2.json` are derived from the sample source with the extractor at call time — the same pipeline `uip functions push` runs, so scaffolded documents cannot drift from a push |
| `@uipath/coded-functions-js-extractor/templates` → `HELLO_TS`, `HELLO_JS`, `HELLO_TS_JOB`, `HELLO_JS_JOB`, `getSampleSource` | The inert sample sources (no compiler dependency — safe for synchronous browser bundles)                                                                                                                                                                                                                           |
| `…/templates` → `getSamplePackageJson`, `getSamplePackageLockJson`, `SAMPLE_TSCONFIG`                                        | The static scaffold manifests, including a pre-resolved lockfile for consumers that cannot run `npm install`                                                                                                                                                                                                       |
| `…/templates` → `SAMPLE_FUNCTION`, `SDK_VERSION`, `SDK_RANGE`                                                                | The sample's facts, and the SDK version scaffolds pin (test-fenced against the SDK's package.json)                                                                                                                                                                                                                 |

## Installation

```
npm install @uipath/coded-functions-js-sdk
```

`@uipath/coded-functions-js-sdk` is a dev dependency. It provides types and the `defineFunction` factory at development time. The production runtime resolves functions by the emitted definition shape — the SDK package itself does not need to ship with your deployed package.

```
{
  "devDependencies": {
    "@uipath/coded-functions-js-sdk": "^0.x"
  }
}
```
