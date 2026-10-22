---
name: fix-converted-app
description: Finish a converted Apps project — the generated React code in an output directory. Fixes what `conversion-report.json` reports, anything the developer found by testing the app by hand, and anything a screenshot of the original next to the converted app shows. Fixes it in the generated code whether the fault is this app's or the converter's, and writes the systemic ones up so they can be fixed at the source. Use after `npm run convert`.
argument-hint: <output directory, e.g. out/MyApp or .> [what is wrong, in your own words, or a screenshot of the original]
---

# Fix a converted app

The converter wrote a React + TypeScript project into the output directory and a
`conversion-report.json` beside it. Your job is to make that app behave and look like the Apps
app it came from: what the report already knows about, what the developer found by using the
app, and what a screenshot of the two side by side shows.

The output directory is the first part of `$ARGUMENTS` (`.` means the current directory).
Anything else in `$ARGUMENTS` is the developer telling you what is wrong. Pick the path that
matches what you were given, and more than one can apply:

- nothing but a directory → **Path A**, work the report;
- a description of something that misbehaves → **Path B**;
- a screenshot of the original app, or "it does not look right" → **Path C**.

## Which kind of app this is

The converter reads two formats, and the output tells you which one it came from:

- A **standalone app** (a `.uiapp`): the designer's rules became `src/pages/<Page>.bindings.ts`.
  The report's `generatedFrom` ends in `.uiapp`.
- A **Solution app** (a `.uis`, a Unified Build / Studio Web Solution): the event logic was
  XAML workflows, and each became an exported handler in `src/workflows.ts`, named
  `<Page>_<Control>_<event>` (`MainPage_Text_MainActionTrigger_change`) or `<Page>_<Page>_load`.
  The report has a `workflows` section — `total`, `converted`, `partial`, `blocked`, and
  `byWorkflow[]` with each workflow's path, its `handler` and its `gaps` — and
  `generatedFrom` ends in `.uis`. The pages, components and styles are the same as a
  standalone app's; only where the logic lives differs.

For a Solution app read the `workflows` section first. A page that sits on its spinner, a
button that answers nothing, a Custom HTML control waiting for a reply — these are nearly
always a handler that threw, and the console names it.

## Hard rules

1. **Edit only files inside the output directory.** Never edit the converter itself
   (`packages/`, `tools/`), even when the real defect is there — you are almost certainly not
   in that repository anyway. Fix it in the generated code and write it up (rules 5 and 6).
2. **Never modify `conversion-report.json` or `conversion-log.ndjson`.** They are the record
   handed back to the converter team. The report is read-only on disk; leave its permissions.
3. **Never edit `node_modules`, `dist` or `.env*`.** `uipath.json` is the developer's: they
   fill it in for a local run (see [First local run](#first-local-run-of-a-solution-app)) and it
   is never committed. Do not change its scopes or tenant for them unless they ask.
4. **The original app is the specification.** Translate what it does; do not improve it, and
   do not invent behaviour you have not checked. If you cannot establish what Apps does, say
   so in the log rather than guessing.
5. **Fix everything you can in this project, whoever is at fault.** A defect the converter
   would repeat on every app is still fixed HERE, in the generated code, because that is what
   unblocks the developer today. The difference the blame makes is only what you write down.
6. **Write `conversion-fixes.md`** in the output directory, with three parts: what you changed
   and why; what you could not fix; and a section headed `## For the converter team` listing
   every defect that is systemic, each with the file and symbol you patched, the VB or the
   Apps behaviour it should match, and a minimal example. That section is what the developer
   sends back to us, and it is also what they will need when a future conversion overwrites
   your patch — so write it even when the fix here was easy.

## Path A — the report

1. Read `<out>/conversion-report.json` and work through `issues` where `blame` is
   `"converter"`. `blame: "source-app"` is the only kind you do NOT fix — not out of
   deference, but because the app itself is broken (an expression naming a control that does
   not exist) and only its author knows what it was meant to say; report those and move on.
   `by-design` needs nothing — with one exception: `custom-html-verbatim`, which names a
   Custom HTML control that already works and MAY be rewritten as React; follow
   [Custom HTML controls](#custom-html-controls) to decide. `expressionRows` lists
   deliberate, measured approximations — read them for context, act on them only if asked.
2. Some reports also carry `runtime`-scoped issues and a `runtime` block: those come from the
   converter team driving both apps through the same steps, and they are the most concrete
   issues in the file because each one states what Apps did and what this app did. Treat them
   like any other converter issue. Neither you nor the developer can re-run that comparison —
   it is internal tooling — so note in the log that the fix is unconfirmed by it.
3. Fix, then `npm run build` in the output directory (it typechecks and bundles). A freshly
   converted project has no `node_modules` — the converter does not install anything — so run
   `npm install` there first if the directory is absent. If installing is not possible
   (offline), skip the build and say in the log that the fix is unverified. A generated app is
   expected to compile with zero errors; if it does not, that is a defect worth writing up
   even when it is not what you were asked to fix.
4. Write the log and report back.

### Where each issue lives

| issue code | what you will find | what to do |
|---|---|---|
| `expression-no-rule`, `expression-unbound` (property) | In `src/pages/<Page>.tsx` the prop reads `notConvertedValue("<VB>")` or `notConvertedFlag("<VB>", <default>)`; `where` and `location` name page, control and prop. | Replace the marker with TypeScript computing the VB's value. Read state through the accessors already imported in that page. |
| `expression-no-rule` (source binding, column, page, tab) | `src/pages/<Page>.bindings.ts` has a `TODO` block returning empty rows or `undefined`. | Implement the binding with the helpers in `src/lib/data.ts` and `src/lib/compat.ts`. |
| `rule-unimplemented`, `rule-expression-unconverted` | In `<Page>.bindings.ts`, the handler `<control>_<event>` holds a `// TODO` or a `notConvertedInput("<VB>")`. | Implement the statement the rule describes (`method` names the Apps rule kind, e.g. `vb-set-value`). |
| `rule-bad-target` | Same handler; the assignment target was not understood. | Write the assignment the VB intends. |
| `event-undeliverable` | The handler exists but the component never calls it. | Wire the prop the message names, in `src/components/ui/`. |
| `property-unmapped` | An authored property reached no component prop. | Add the prop to the component and pass it from the page — unless Apps' own control ignores that property too, in which case log it and change nothing. |
| `style-unmapped` | An authored style produced no CSS. | Add the rule to the control's class in `src/pages/<Page>.module.css`. |
| `control-unsupported` | An inert placeholder. | Implement it only if the message gives enough to go on; otherwise leave it and say why. |
| `custom-html-verbatim` (by-design) | A Custom HTML control whose HTML/CSS/JS runs as authored: the files named in the message under `src/custom-html/<Page>/`, passed as `code={…}` in `<Page>.tsx`. | It already works. Rewrite it as React only where [Custom HTML controls](#custom-html-controls) says it pays off. |
| `custom-html-document-missing` | The same control, with one of its documents empty because the export does not carry it. | Ask the developer for the document's content from Apps Studio (the control's Code editor); never write one from guesswork. |
| `emit-inconsistent` | Described in the message. | Fix as described. |
| `workflow-activity-unconverted` | In `src/workflows.ts`, inside the function `handler` (the workflow `where` became), the statement whose thrown text ends with `(activity <location>)` is `throw new Error("<activity> was not converted …")`. | If `blame` is `converter`, implement what the activity does, from `message` and the original XAML; `remedy` says the rewrite that works today when there is one. If `blame` is `by-design` or `source-app`, leave the marker and say why: `remedy` tells the designer what to change in Studio Web (a Storage Bucket for a file, a process the app starts for a robot step, the expression to fix). |
| `runtime-*` | The app was driven beside the low-code app: `step` is what was done, `expected` what Apps showed or sent, `actual` what this app did. | Make the code produce `expected`. For `runtime-request-differs` compare the bodies field by field. For `runtime-text-differs` find the binding behind the control. For `runtime-request-missing`/`-extra` look at the control's source hook and its handler. |

### Resolving what an unconverted expression REFERS to

Rewriting a refused expression needs more than its VB text: what an identifier in it
denotes, and what that thing holds. Most of it is already in the output directory.

| you need to know | read |
|---|---|
| an entity's fields and what each holds | `src/types/entities.ts` — the doc comment on each interface lists every field with its declared type (`Guid`, `Decimal`, `DateTimeOffset`, `file attachment`, `list of number`, or a related entity). The shape is open, so the compiler will not tell you; this table will. |
| which entity a control's rows came from | the control's `entity` prop in `src/pages/<Page>.tsx`, and `src/lib/entity-ids.ts` |
| a process's real key, a bucket's real name, the folder any resource was authored in | `src/lib/resource-folders.ts` |
| what a media name resolves to | `src/lib/app-media.ts` |
| a control's authored literal defaults | `src/store/defaults.ts`, keyed `<Page>/<Control>` |
| a control's id in the original app | `src/components/ui/provenance.ts` |
| an action app's arguments and outcomes | `src/lib/action-schema.ts` |
| the VB that failed, and where it sat | the issue's `vb`, `where` and `location`; `expressionRows` for expressions that converted with a measured approximation |

**The `.uiapp` is NOT in the output directory.** The report's `generatedFrom` names the
file; ask the developer for it when the tables above are not enough — a rule's nesting, a
property you cannot find, or an expression whose identifiers resolve to nothing you can
see. It is JSON, and the parts worth knowing are:

- `models[]` — one per page (`type: "form"`) and one container per Data Service
  connection (`type: "entity"`). A page carries `controls`, keyed by control id, each with
  `name`, `component`, `config`, `properties` and `ruleInstances`.
- `models[].instances[]` on an entity container — the entities themselves, each with typed
  `fields[]`. This is where `src/types/entities.ts` gets its table, so you rarely need it.
- `models[].expressions` — the VB. Every scope holds
  `expressions: { "<expressionId>": { "expression": "<VB text>" } }`.
- A bound property is `properties.<name> = { valueType: "vb-expression", value: {
  expressionId } }`. Follow the id into the expression map to read what was authored.

**For a Solution app the specification is the XAML.** The `.uis` is a zip; ask the developer
for it when the handler and the report are not enough. Inside it, `<App>/WorkflowFiles/*.xaml`
are the workflows, one per event, named like the handlers. An activity's properties are the
attributes on its element — `Top="1000" Skip="[SkipIndex]"` on a `QueryEntityRecords`, the
`Message` on a `ShowAppsToast` — and `[…]` marks a VB expression where a bare value is a
literal. A `Switch` on the request's action is one case per branch of the handler; `Req` is
the parsed JSON the Custom HTML control sent. The `x:Members` In arguments the report lists as
by-design are set by the handler itself. `.app/models/*.json` holds the pages exactly as a
`.uiapp` does; `.entities/EntitiesStore.json` the entities; the Solution's `bindings` and
`resources/` the assets, queues and buckets it declares.

**An expression id with no text is a slot the designer never filled in.** Apps writes an
id for every bindable property whether or not anything was authored there, so the presence
of an id proves nothing — only text does. That distinction is load-bearing and easy to get
backwards: an image control with no `url` text renders nothing in Apps, while one whose
`url` was authored but evaluates to nothing renders its "unable to render" placeholder.
Where the emitted code omits a prop entirely, the slot was blank; where it passes one that
happens to be undefined at run time, it was authored.


## First local run of a Solution app

A Solution app's resources reach the tenant through the developer's own token and the
project's `uipath.json`, and a few of them need settings the converter cannot know. Check these
before reading a backend failure as a bug:

- **Folder.** A Solution's assets, queues and buckets carry no folder, so the runtime uses the
  app's install folder, and locally there is none. Add
  `<meta name="uipath:folder-key" content="<folder key>">` to `index.html`, naming the
  Orchestrator folder the resources live in. A re-convert keeps `uipath.json` but rewrites
  `index.html`, so this tag has to be added again after every `npm run convert`.
- **Scopes.** `uipath.json` is pre-filled with the scopes the app calls. An app that reads
  `CurrentUser.Groups` also lists `PM.User.Read PM.Group.Read`: the token does not carry group
  names, so the app reads them from Identity at sign-in. The external application must be
  granted the same scopes, and a token minted before they were granted stays in the browser
  until site data is cleared — the console then says
  `the signed-in user's groups could not be read`, and every group check answers "not a member".
- **Reproduce from the root URL.** The start page's load rules fill the app variables every
  other page reads. A converted app sends a cold load on an inner page to the start page
  for exactly that reason (`DEEP_LINKS` in `src/routes.tsx`); an app converted before that
  change runs the inner page with empty state — a blank runtime variable once chose the PROD
  entity. If a symptom appears only after a reload, that is it.
- **Station documents locally.** The Validation Station downloads its document through
  Orchestrator read URIs, which carry no CORS headers, so from `localhost` the download fails
  while everything else works. For a local test only, run Chrome with web security off
  (`--disable-web-security --user-data-dir=/tmp/chrome-cors-off`); deployed, the app and the
  URIs share an origin and nothing is needed.

## Path B — a bug the developer found by hand

This is the common case once the app runs, and the report will not mention it. Work in this
order; skipping step 2 is how a wrong "fix" gets written.

1. **Get the evidence, from the developer's browser.** You can start the app
   (`npm run dev` in the output directory, `npm install` first if there is no
   `node_modules`) but you cannot see it; they can. Ask for the three things that decide
   most of these: the browser console output while the problem happens, the control's name
   from the inspector — every control carries `data-uiapp-name="<authored name>"`, which is
   exactly the name to search for in `src/pages/` — and a screenshot. A control that threw
   while rendering leaves a marked placeholder instead of disappearing, and names itself in
   the console, so that alone often identifies it. If the app says it is not configured, the
   dev server was started BEFORE the project was written or re-written: restart it, because
   the platform settings are injected into the page at startup.
2. **Establish what the original does** before changing anything. In order of authority: the
   low-code app itself, if the developer can open it or screenshot it; the `.uiapp` export
   (the report's `generatedFrom` names the file) — its `models[].controls` hold each control's
   authored properties and expressions under the same names; the report's `expressionRows`.
   A difference is not automatically a converter bug: Apps has its own quirks, and a converted
   app that is *more* correct than Apps is still a difference worth recording rather than
   "fixing".
3. **Locate the code.** The map is in the next section.
4. **Fix it here either way, and say which kind it is.** Wrong for THIS app only — a value, a
   binding, a missing wire — is a local fix and a line in the log. Wrong for EVERY app — a
   helper in `src/lib/`, a component that never accepts a property, a rule that mistranslates
   — is fixed in this project exactly the same way, and additionally written under
   `## For the converter team` so it can be fixed at the source. Never leave the developer
   with a broken app because the real defect is upstream.
5. **Fix the smallest thing that makes it behave like the original.**
6. **Verify what you can, and be honest about the rest.** `npm run build` is yours to run and
   proves the code compiles; it proves nothing about behaviour. For that, ask the developer
   to repeat their steps and send the console output or a screenshot. Never report a
   behavioural fix as confirmed on the strength of having written it.
7. **Log it**, including what you verified, how, and what is still unconfirmed.

## Path C — two screenshots, side by side

The developer gives you a picture of the low-code app and a picture of the converted one, and
you find the differences by LOOKING at them. There is no harness and no browser automation
here: those are internal tools the developer does not have. Everything below works from two
images and, when a measurement is needed, one line they paste into their browser.

Use this whenever the complaint is about how a page looks, and whenever you are about to tell
someone a page "looks right".

1. **Check the two pictures are comparable.** Same page, same data, same window width. If
   they are not, ask for a matching pair rather than reading meaning into the mismatch — a
   narrower window re-wraps a layout and invents differences that are not there. If you were
   given only the low-code picture, ask for the converted one; you cannot take it yourself.
2. **Read both in the same order, top to bottom and left to right, and write every
   difference down before explaining any of them.** Explaining as you go makes you stop at
   the first one. Work the list: is every control present, and in the same order; is each
   one's text identical, character for character; are heading and label colour, weight and
   size the same; do the fields have the same frame; is spacing and alignment the same; is
   anything cut off, overlapping or missing a scrollbar; do empty states match ("No data" on
   one side against real rows on the other); are images shown or placeholdered.
3. **Turn each difference into a hypothesis before touching code.** Text present on one side
   and absent on the other is usually invisible rather than missing — an authored colour that
   matches the background. Text at a different size or weight is usually a named heading or
   label style overriding the authored typography. A different STRING is an expression or a
   format helper, not CSS. A missing row is a data call. A control in the wrong place is
   layout; a control that is not there at all is the component.
4. **Measure rather than squint, without any tooling.** The eye cannot separate 28px from
   32px, and white text on a white page looks exactly like a control that failed to render.
   Ask the developer to open each app, press F12, paste this into the Console and send you
   both answers — it works in the low-code app and the converted one alike:

   ```js
   (function (text) {
     const all = [...document.querySelectorAll('*')].filter(
       (e) => e.children.length === 0 && (e.textContent || '').trim() === text);
     const el = all[all.length - 1];
     if (!el) return 'no element with exactly that text';
     const c = getComputedStyle(el);
     const p = el.parentElement ? getComputedStyle(el.parentElement) : c;
     return { text, color: c.color, fontWeight: c.fontWeight, fontSize: c.fontSize,
       fontFamily: c.fontFamily, background: c.backgroundColor, behind: p.backgroundColor,
       textAlign: c.textAlign, box: el.getBoundingClientRect().toJSON() };
   })('the exact text you can see')
   ```

   Two answers side by side settle colour, weight, size, font, the background behind the
   text and the box, in seconds. That is how a heading that looked "missing" turned out to be
   the authored white being applied where Apps ignores it and renders 32px.
5. **Fix in the generated code, then ask for one more screenshot of that page.** A visual fix
   is not finished until the second pair agrees. List in the log the differences that remain
   and why, and put anything systemic under `## For the converter team`.

Things this comparison catches that nothing else does: invisible text, a heading at the wrong
size or weight, a control that rendered off-screen, a grid whose columns do not line up, a
page that cannot scroll, an image placeholder where the original shows a picture, and text
that is right but formatted differently. Every one of those has happened on a real app.

### Symptom → where to look

| What the developer sees | Look at | Usually |
|---|---|---|
| A page is blank, or blank until a refresh | the console; `src/routes.tsx` | something threw while rendering OR while unmounting the previous page; each route is wrapped in a boundary, so read which one it names |
| A control renders but shows nothing / "No data" | the `use…Source` hook in `<Page>.bindings.ts`, then `src/lib/data.ts` | the query's filter or expansion fields, entity-id resolution, the folder id, or a list source handed on where an array was expected |
| A dropdown or grid editor has no options | the column's `options` in the page, `dropdownValues` in the grid component | a `{ data, totalRecords }` list source where an array was expected |
| A button does nothing, or only part of what it should | `<control>_<event>` in `<Page>.bindings.ts`, or the handler in `src/workflows.ts` for a Solution app | the handler is a TODO, its guard is false (an unset variable), one rule in the chain threw and stopped the rest, or the component never calls it |
| A Custom HTML control waits for a reply that never comes ("No response", a spinner that stays) | the console, then the handler in `src/workflows.ts` that answers that action | the handler threw before writing the response variable; the console names the statement |
| Typing behaves differently: a mask, decimals, a prefix, separators | the control in `src/components/ui/`, then the authored property in `<Page>.tsx` | an authored input property that reaches no component prop — the page shows what was authored, the component decides whether it is honoured |
| An image or document does not appear | `src/lib/app-media.ts` and `assetUrl` in `src/lib/runtime.ts`; the Network tab | a media asset resolved by title, an entity attachment that has to be downloaded before it can be shown, or an external URL the host refuses |
| A value set on one page is not there on another | `src/store/` and the `setAppVar` call in the first page's handler (`<Page>.bindings.ts` or `src/workflows.ts`) | an app variable written to the wrong name, a page that re-runs its load rules and overwrites it, or a reload on an inner page that skipped the start page |
| Data goes to the wrong entity or queue (DEV instead of PROD or the reverse), a runtime badge is missing | the start page's load handler | the app was cold-loaded on an inner page, so the variable that selects the environment was never set |
| A list stays on "Loading…" and the console says `pagination start … is not a multiple of page size` | `src/workflows.ts` (the query loop) and `fetchEntityRecords` in `src/lib/data.ts` | a `Skip`/`Top` paging loop whose last pass starts mid-page; the converter now carries `Skip` as `skip` and the runtime pages over it — an older output needs that runtime |
| Admin-only UI is missing, `Groups.Contains(…)` is always false | `userGroups` in `src/lib/sdk.ts`, the scope line of `uipath.json`, the external application | the Identity scopes are not granted, or the token predates them (clear site data, sign in again) |
| A Custom HTML control shows only its header and footer, the middle is empty | the root panel's class in `src/pages/<Page>.module.css` | a root with a blank authored height left every percentage height inside it with nothing to resolve against, and the iframe fell to the browser's 150px default; the root must be `height: 100%` |
| The Validation Station shows "could not load document" | the Network tab, `uipath:folder-key`, the bucket the `ContentValidationData` names | the document's bucket is in another folder, the bucket read URI is blocked by CORS locally (see First local run), or the record's `ContentValidationData` names a document that is not there |
| The value is right but reads wrong | `src/lib/compat.ts` | a VB-vs-JavaScript formatting difference — see the idioms below |
| Fonts, colour, weight or size differ | `src/pages/<Page>.module.css` | a control with a NAMED heading or label style takes its typography from Apps' preset, not from the authored properties; only `customized` uses what the designer set |
| The page does not scroll, or is cut off | `src/styles/tokens.css` | the page host scrolls and the page is as tall as its content |
| A backend call fails (400/403/404) | the Network tab, then `src/lib/data.ts` and `src/lib/resource-folders.ts` | a process needs its RELEASE key rather than the package id, a bucket its real Orchestrator name rather than the VB identifier, a choice set the tenant-wide flag — or `uipath.json` is missing a scope |
| Session values are empty (`CurrentUser.*`) | `src/lib/sdk.ts` | the claims the token actually carries |
| A validation message differs | `useControlValidation` in `src/lib/runtime.ts` | Apps checks by control KIND, only once a value is filled, and a pattern rule outranks a length rule on the same field |
| A popup, toast or spinner behaves differently | `src/lib/rules.ts`, `src/lib/overlays.tsx` | the rule's own options (modal, position, seconds) |
| A Custom HTML control is blank, or its button does nothing | the browser console (the frame logs there too), the control's error icon, `src/custom-html/<Page>/<Control>.*`, `src/custom-html/bridge.ts` | an external script that failed to load, an `App.*` call naming a variable the app does not declare (`invalid-variable-name`), a script relying on `alert` or popups (blocked), or — after a rewrite — a variable write the React version no longer makes |

### Differences that are not bugs

Measured on real apps. Reporting one of these as fixed, or "fixing" it, makes the converted
app wrong:

- A control with a named heading or label style shows Apps' preset, not the authored font,
  size, weight or colour. Only `customized` uses what the designer set.
- Apps' own button ignores an authored `url`, and its image an authored `icon`.
- A label authored white on a white page is invisible in BOTH apps. That is the app's own
  styling, not a conversion fault.
- Apps' grid shows an unexpanded relationship cell as `[object Object`; the converted grid
  shows the related record's name. Ours is better; leave it.
- Apps does not always re-render a label after a load rule changes what it reads, so the
  low-code app can show a stale value where the converted app shows the current one.
- Apps' Preview can fail to render the lower part of a long page, and can fail to fetch
  documents. An empty area on the Apps side is not proof the converted side is wrong.
- Apps does not draw what is below the fold until the page is scrolled to it, and it shows
  "Loading your app" for several seconds first. A screenshot of the Apps side is only
  evidence once it has been scrolled to the bottom and back and the page has settled —
  otherwise a whole section reads as something the converter invented.
- Apps wraps every control in a panel named after it (`forms-host-table-panel` around
  `forms-host-table-control`); the converted app has no such wrapper. Extra elements in the
  Apps DOM are not missing elements in ours.
- In a Solution app, fields a robot fills later (an audit's "processed by", "processed on")
  stay empty after the app approves an item; the app never wrote them in Apps either.
- The report's by-design notes that an asset or queue "is not declared by the Solution"
  mean the app reaches it by name in the install folder; that is how it ran in Apps too.
- The low-code app runs its workflows on a serverless robot over a live connection, and that
  connection can drop ("No heartbeat response from Apps", a page frozen on a spinner until a
  reload). The converted app runs them in the browser and cannot freeze that way; a step that
  is faster, or that works where the low-code app hung, is not a difference to fix.
- An `x:Members` In argument (`Req`, `ReqAction`) the report lists as by-design is read by the
  handler from the request it parsed; nothing is missing.

### Defects already found and fixed at least once

Every row happened on a real app. If what the developer describes matches one, check that
first — and if this project still has it, fix it here and put it under
`## For the converter team`, because it means the version that converted this app predates
the fix.

| Area | What it looked like | Where it was | What it needed |
|---|---|---|---|
| Data | Starting a process fails, 400 "Undefined process" | `src/lib/data.ts` | the SDK's `processKey` is the RELEASE key, not the package id — list the folder's releases, match the package id, start with the match's `key` |
| Data | A bucket upload or download says the bucket does not exist | `src/lib/data.ts`, `resource-folders.ts` | send the bucket's real Orchestrator name, not the VB identifier the expressions use |
| Data | A choice set is "not found" once deployed | `src/lib/data.ts` | list with the tenant-wide flag, not scoped to the app's install folder |
| Data | An entity query is refused for "not supplying expansion fields" | `src/lib/data.ts` | every fetch has to pass expansion fields |
| Data | A dropdown or grid shows only the first page of rows | `src/lib/data.ts` | follow the cursor to the end; Apps asks for everything |
| Data | `FetchOne` pulls the whole table | the page's binding | ask for one record, and express the authored start as a page |
| Data | A failed read leaves a silent "No data" | `src/store/controls.ts` | Apps shows an error toast; say what failed |
| Session | `CurrentUser.*` is empty | `src/lib/sdk.ts` | read the signed-in user from the access token's claims |
| Session | Signing in loses the page the user opened | `src/lib/sdk.ts` | stash the path before initialising, restore it after the callback |
| Session | Data calls fail right after sign-in, then recover | `src/lib/sdk.ts` | hold the first render until the SDK is authenticated |
| Expressions | A date renders as `Sun Mar 01 2026 00:00:00 GMT…` | `src/lib/compat.ts` | .NET's default, which is the invariant `MM/dd/yyyy` |
| Expressions | A date or number looks different on another machine | `src/lib/compat.ts` | Apps is invariant-culture; never `toLocaleString` |
| Expressions | A page is blank and the console says "unsupported .NET format specifier" | `formatDate` / `formatNumber` | implement the standard specifiers (`C`, `D3`, `E`, `G`, `N2`, `P1`, `X`, `s`, `u`, `o`…) |
| Expressions | `42 + 19.99` shows `61.989999999999995` | `src/lib/compat.ts` | decimal arithmetic through the `dec*` helpers |
| Expressions | `"…" & True` shows `true` | the concatenation | VB renders a Boolean as `True`/`False` |
| Expressions | A grid cell shows `True` where Apps shows `true` | the grid's cell text | a grid cell is not a text field |
| Expressions | `.join` or a spread throws on an unset list variable | the store default | an unset list variable is an empty list |
| Components | A mask, prefix, decimals or separators are ignored while typing | `src/components/ui/` | the authored property reached no component prop |
| Components | A grid's dropdown editor has no options | the grid component | unwrap the `{ data }` list source |
| Components | A bold button renders regular | `src/styles/tokens.css` | a zero-specificity reset, so the authored weight wins |
| Components | A heading is invisible, or the wrong font or size | the page's CSS module | a named heading or label style overrides the authored typography |
| Components | Leaving a page with a document viewer blanks the app | the viewer component, `src/routes.tsx` | guard the unmount cleanup, and keep every route in its own boundary |
| Components | An entity attachment shows no image | the image component | download the attachment and show it through an object URL |
| Layout | A long page cannot scroll | `src/styles/tokens.css` | the page host scrolls; the page is as tall as its content |
| Components | An icon draws at 24px whatever size the author set | `src/styles/tokens.css` | Material Icons pins `font-size` on its own class; the glyph must inherit from the control, and everything under a mis-sized icon sits too high |
| Components | An open dropdown has no blue ring | `src/styles/tokens.css` | Apps draws 2px `#0067DF` on the trigger while its panel is open, and 1px on the grid's search box |
| Components | A grid's row icons grey out while another row is being edited | the edit grid component | Apps keeps them lit; only a disabled grid dims them |
| Components | A grid's rows stop short of the right edge | the edit grid component | a column with no authored width takes `flex: 1` and shares the free space, as Apps' grid does |
| Components | A dropdown, multi-select or uploader is invisible to an end-to-end selector | the component registry | Apps tags both the dropdown and the multi-select `forms-host-combo-box-control`, and its uploader `upload-file-input` on the file input — there is no `forms-host-file-picker-control` in its vocabulary |
| Project | The whole app is blank and the console shows an unresolved import | the emitted imports | an import naming a file the project does not contain |
| Project | The app runs but `npm run build` fails | the pages and components | a prop passed to a component that never declared it, or a name used without importing it |
| Workflows | A paging loop over an entity throws "not a multiple of page size" on its last pass | `src/workflows.ts`, `fetchEntityRecords` in `src/lib/data.ts` | carry `Skip` as a row offset and read the page it falls in, dropping the rows before it |
| Session | `CurrentUser.Groups` is always empty | `src/lib/sdk.ts`, `uipath.json` | read the group ids from the Identity user record and their names by bulk load, with `PM.User.Read PM.Group.Read` granted |
| Layout | A page's percentage-high panels collapse; a Custom HTML iframe is 150px tall | the root panel's class in the page's CSS module | a root with a blank authored height is `height: 100%`, as Apps stretches it |
| Project | A reload on an inner page runs it with empty app variables | `src/App.tsx`, `src/routes.tsx` | a cold load on an inner page goes to the start page first (`DEEP_LINKS` off) |
| Validation Station | The station lets the user save a draft Apps never offered | `src/components/ui/ui-validation-station.tsx` | save-as-draft stays off on the web component after every render |
| Validation Station | A document that failed to load shows a blank station | the same component | the failure is reported in the console and the station shows its error state |

## Custom HTML controls

A Custom HTML control is a small web page the app author wrote: an HTML, a CSS and a
JavaScript document, sometimes external stylesheets and scripts, and an `App` object the
script uses to talk to the app. The converter does NOT translate it. It keeps the author's
code verbatim and runs it the way Apps does, so the converted app works on day one:

- the documents are `src/custom-html/<Page>/<Control>.html|.css|.js`, imported as text by
  the page and passed as `code={{ html, css, js, cssExternal, jsExternal, bridge }}`;
- `UiCustomHtml` renders them in an `<iframe sandbox="allow-scripts allow-forms">`, built in
  Apps' order (external CSS, the CSS, the HTML, external JS one by one, the HTML's own
  `<script>`s, the JS document, then a `controlLoad` event);
- the frame shows a spinner until the control has loaded, and an error icon naming any
  external stylesheet or script that failed to load; a disabled control takes no clicks and
  is out of the tab order, as in Apps;
- the frame's `App` object is Apps' bridge, and reaches the app's DECLARED variables only:

| In the author's script | What it does | The same thing in generated React |
|---|---|---|
| `await App.getVariable('v')` | the variable's current value; rejects `{ code: 'invalid-variable-name' }` for a name the app does not declare | `useAppVar('v')` in render, `getAppVar('v')` in a handler |
| `await App.setVariable('v', x)` | sets it; everything bound to it re-renders, exactly as an assignment in a rule does | `setAppVar('v', x)` |
| `App.onVariableChange('v', cb)` | `cb(value)` whenever the variable takes a value not deeply equal to the last one it saw — compared as Apps compares, so re-setting an equal value does not fire — from anywhere, including this script's own writes; no initial call; returns an unsubscribe | a component that reads `useAppVar('v')` re-renders — no subscription to write |
| `App.setHeight(h)` | sets the frame's height: a number or numeric string is px, anything else must be a valid CSS height | the component's own height in its CSS |
| `localStorage`, `sessionStorage`, `document.cookie` | work as in a browser, shared by every Custom HTML control in this app and no other; the page keeps them in its own storage as `uiapp-custom-html:<app>:<area>:<key>`, `<app>` being `storageScope` in `src/custom-html/bridge.ts` | the app's own `localStorage` / `sessionStorage`, reading and writing the same keys (`uiapp-custom-html:<app>:local:<key>`) so saved values carry over |

**Leaving it verbatim is correct.** Rewrite a control as React only when the result is clearly
simpler to read and keeps every behaviour — it is optional, and the developer can ask for it.

Rewrite when ALL of these hold:
- the HTML is markup for this control (a button, a badge, a small card, a list built from a
  variable), not a whole page with its own `<head>`;
- the script only reacts to events on that markup and reads or writes app variables through
  `App`;
- there are no external scripts, no `<canvas>`, no third-party widget, no timers driving
  layout.

Keep it verbatim when any of these hold — the rewrite would be a reimplementation, not a
translation: external libraries (charts, editors, maps), a full HTML document, hundreds of
lines of DOM code, or behaviour you cannot exercise to compare. Say in the log that you kept
it and why.

**To rewrite one:**
1. Read all three documents and list every `App.*` call, every DOM event handler, and every
   state the markup shows (loading, disabled, empty).
2. Write `src/components/custom/<Control>.tsx` and a `<Control>.module.css` beside it. Move the
   CSS in, scoped by the module; keep the class names the markup used so the rules still match.
   Replace `App.getVariable`/`onVariableChange` with `useAppVar`, `App.setVariable` with
   `setAppVar`, `onclick="…"` with `onClick`. Fonts the CSS `@import`s go in
   `src/styles/tokens.css` or the page's `index.html`, not in a module.
3. In `<Page>.tsx`, replace `<UiCustomHtml ctl="X" className={s.x} code={…} />` with
   `<X ctl="X" className={s.x} />` — keep `ctl` and the class, so provenance, hiding and
   layout still apply — and honour `disabled`/`hidden` the way `UiCustomHtml` does. Remove
   that control's `?raw` imports. Leave `src/custom-html/` files another control still uses.
4. Verify: `npm run build`; then the same steps in both versions with the browser console
   open. Every variable the original wrote must be written with the same value at the same
   moment — that is what other controls and rules react to — and a screenshot of the two
   (Path C) must agree.
5. Log it: which controls you rewrote, which you kept, and why.

**Never** add `allow-same-origin` to the frame (a `srcdoc` frame would then share the app's
origin, storage and session with the author's script), hand the frame a token, or widen the
bridge beyond app variables. Differences from Apps:
- `alert`/`confirm`/`prompt` and popups are blocked, as Apps blocks them by default. Where the
  app relied on them being allowed, add `allow-modals` or `allow-popups` to the frame's
  `sandbox` in `src/components/ui/ui-custom-html.tsx` — never `allow-same-origin`.
- `setVariable` does not reject a value of the wrong type (Apps answers `type-mismatch`).
- A relative URL in the author's HTML (`<img src="logo.png">`) resolves against this app, not
  against Apps; use an absolute URL, or put the file in `public/`.

## Validation Station and Multi File Uploader

The two controls only a Solution app has. Both are converted; what follows is where their
behaviour lives, because it is spread over the component, the runtime and the workflow.

**Validation Station** — `UiValidationStation` in `src/components/ui/ui-validation-station.tsx`,
built on `@uipath/ui-widgets-validation-station`. The web component itself is staged out of
`node_modules` into `public/du-vs-wc` by `npm run stage-du-wc` (`scripts/stage-du-wc.mjs`),
which runs before every `npm run dev` and `npm run build`; a station that never appears
usually means that folder is missing — run the script, or `npm install` first.

- Its **data source** is the `ContentValidationData` of the current record — the document's
  id and bucket — bound in `<Page>.tsx` or set from a workflow (`Controls.<Page>.<Station>.DataSource`).
- Its **companion app variable** (`stationVar`, the variable Apps created for the control)
  holds `Taxonomy`, `ExtractionResult`, `SelectedDocumentType`, `SelectedField` and
  `BusinessRules`; the first four are mirrored onto the control, so `Controls.<Page>.<Station>.SelectedField`
  reads the same thing. Every expression about the station reads this variable.
- The **workflow commands** — Save Validation Control State, Set Validation Control Field
  Focus, Set Validation Control Field Value — are `validationSave`, `validationFocusField` and
  `setValidationField` in `src/lib/runtime.ts`, addressed to the station by its variable, each
  with the robot activities' own 30-second timeout. Save
  writes the document's `output.zip` in its bucket folder; the file's timestamp in the bucket
  is the server-side proof that a save happened, whatever the UI said.
- **Read-only** (`Disabled`) is the widget's `isReadonly`; a disabled station is dimmed
  (`data-disabled`) and takes no edits. Apps never enables save-as-draft, and neither does this.
- A document that cannot be loaded is reported in the console as
  `[uiapp-convert] the Validation Station could not load document …` and the station shows its
  error state; see First local run for the two usual causes.

**Multi File Uploader** — `UiMultiFileUpload` in `src/components/ui/`. The control itself only
collects files into a `list:File` value; what happens to them is the workflow's: in Apps the
recipe is a For Each over the files with an Upload Storage File whose destination path is
the full path including the file name, and that becomes a loop over `storageUpload` in the
handler. An upload that "does nothing" is therefore the handler, the bucket name or the
folder, not the control. The control has no upload progress of its own in Apps either.

## The generated project

| Path | What it is |
|---|---|
| `src/pages/<Page>.tsx` | the page's JSX: one element per control, `ctl` is the authored name |
| `src/pages/<Page>.bindings.ts` | that page's event handlers and source hooks — where a standalone app's rules live |
| `src/workflows.ts` | a Solution app's code-behind workflows, one exported handler per event (`<Page>_<Control>_<event>`); the report's `workflows.byWorkflow[].handler` names them |
| `src/pages/<Page>.module.css` | that page's authored styles, one class per control |
| `src/components/ui/` | the control components, plus `ui-base.tsx` (shared props, `Guarded`) |
| `src/lib/runtime.ts` | the accessors expressions call: `getAppVar`/`setAppVar`, control props, validation |
| `src/lib/rules.ts` | navigation, toasts, spinners, confirmations |
| `src/lib/data.ts` | every backend call: entities, choice sets, processes, queues, buckets, tasks |
| `src/lib/compat.ts` | the VB-vs-JavaScript behaviour differences. Read this before writing a formatting fix |
| `src/lib/resource-folders.ts` | which folder each backend resource lives in, and the keys to reach it |
| `src/store/` | app variables, control state and data sources (Redux Toolkit) |
| `src/styles/tokens.css` | every colour and font, plus the app-wide layout rules |
| `src/routes.tsx` | page name → route, `START_PATH`, and the `DEEP_LINKS` switch (off: a cold load on an inner page starts at the start page) |
| `src/components/ui/ui-validation-station.tsx`, `scripts/stage-du-wc.mjs`, `public/du-vs-wc/` | the Validation Station and the web component it stages; only present when the app has one |
| `src/custom-html/` | Custom HTML controls' own code, verbatim: `<Page>/<Control>.{html,css,js}`, plus `bridge.ts` (the variables a script may reach) and `boot.js` (the `App` object, storage and loading order inside the frame). Only present when the app has such a control |

## VB → TypeScript, as the generated code does it

- `&` concatenates with `Nothing` as `""`; a Boolean in a concatenation is `True`/`False`
  (`boolText`), a date is the invariant `MM/dd/yyyy` (`formatDate`).
- Apps' VB engine runs under the invariant culture: dates and numbers render the same for
  every viewer. Never reach for `toLocaleString`.
- A grid CELL prints a boolean as `true`/`false`; a text field prints `True`/`False`.
- `.ToString(format)` on a date or number goes through `formatDate` / `formatNumber`, which
  implement the .NET format strings; `String.Format` goes through `formatString`.
- Decimals are exact: `dec`, `decAdd`, `decMul`, `decRound` from `src/lib/compat.ts`.
- `If(c, a, b)` is `c ? a : b`; `Nothing` is `null`; an unset list variable reads as `[]`.
- LINQ maps onto array methods: `Where`→`filter`, `Select`→`map`, `First`→`firstOrThrow`,
  `Any`→`some`, `Sum`→`reduce`. `ThisRow` inside a list template is the `row` parameter.

## Workflow → TypeScript, as the generated code does it

A Solution app's workflow becomes one `async` handler in `src/workflows.ts`. Its In arguments
and variables are locals, typed from the XAML (`T | null | undefined` for a reference type);
the VB inside it goes through the same rules as the section above. Activity by activity:

| In the workflow | In the handler |
|---|---|
| `Sequence` | the statements in order |
| `If`, `IfElseIfV2`, `Switch` | `if` / `else if` / `switch` on the same expression |
| `While`, `DoWhile` (and the Interruptible forms), `ForEach`, `ForEachRow`, `RepeatNumberOfTimesX`, `Break`, `Continue` | `while`, `do … while`, `for (const x of …)` typed from `TypeArguments`, `break`, `continue` |
| `TryCatch`, `Throw`, `Rethrow`, `RetryScope`, `TimeoutScope`, `CheckTrue`/`CheckFalse` | `try … catch … finally`, `throw`, a retry loop, a timed `Promise.race`, a throwing condition check |
| `Assign`, `MultipleAssign` | an assignment: a local, `setAppVar`, `setControlProp`, or a dictionary write as `setAppVar(name, { ...(getAppVar(name) ?? {}), [key]: value })` |
| `ResetAppsValues` | `resetAppVar` / `resetControl` |
| `Return`, `TerminateWorkflow`, `Delay`, `CommentOut` | `return`, a thrown termination, `await sleep(ms)`, nothing |
| `InvokeWorkflowFile` | a call to the other workflow's handler, with its arguments |
| `OpenAppsPage`, `OpenAppsUrl`, `CloseAppsPopOver`, `ShowAppsToast`, `ShowHideAppsSpinner`, `SubmitAction` | `openPage`, `openUrl`, `closePopover`, `showMessage`, `showSpinner`, `submitAction` from `src/lib/rules.ts` — a spinner with a blank `Show` hides, as Apps does |
| `LogMessage`, `WriteLine`, `AddLogFields`, `RemoveLogFields` | `logMessage`, `addLogFields`, `removeLogFields` |
| the collection activities (`BuildCollection`, `AddToCollection`, `FilterCollection`, `ReadListItem`, …) and the DataTable activities (`AddDataRow`, `FilterDataTable`, `JoinDataTables`, `OutputDataTable`, …) | array code: a DataTable is an array of row objects, a `ListSource` is `{ data, totalRecords }` read through `listData` |
| the text and date activities (`CombineText`, `SplitText`, `IsMatch`, `Matches`, `FormatDateAsText`, `AddOrSubtractFromDate`, …), `DeserializeJson`, `ChangeType`, `FormatValue` | string and date helpers from `src/lib/compat.ts`; JSON through `jsonParse` / `jsonGet` / `jsonText` / `jsonValues` / `jsonBool` / `jsonStringify` |
| `QueryEntityRecords` (and the builder form), `GetEntityRecordById`, `Create`/`Update`/`DeleteEntityRecord`, their `Multiple` forms, `Upload`/`Download`/`DeleteFileFromRecordField` | `fetchEntityRecords(entity, { filterGroup, sortOptions, expansionLevel, pageSize, skip, timeoutMs })`, `entityRecordById`, `entityRecordCreate`/`Update`/`Delete`, `entityRecordsCreate`/…, `entityFileUpload`/`Download`/`Delete` in `src/lib/data.ts`. `Top` is the page size and `Skip` the row offset; the entity is resolved by NAME in the tenant, never by the authored GUID; `ScopeValue` must be `Tenant` |
| `GetRobotAsset`, `SetAsset` | `orchestratorAsset`, `orchestratorAssetSet` — by name, in the install folder |
| `UploadStorageFile`, `DownloadStorageFile`, `DeleteStorageFile`, `ListStorageFiles`, `ReadStorageText`, `WriteStorageText` | `storageUpload`, `storageDownload`, `storageDelete`, `storageList`, `storageReadText`, `storageWriteText` — the bucket by its Orchestrator name |
| `StartJob`, `BeginProcess`, `RunJob`, `InvokeProcess`, `StopJob`, `GetJobs` | `jobStart`, `jobRun`, `jobStop`, `jobList` — a process by its RELEASE |
| `AddQueueItem`, `GetQueueItems`, `SetTransactionStatus` | `addToQueue(queue, content, { folderPath })`, `queueItems`, `queueCompleteTransaction`; `AddTransactionItem` is refused (a browser holds no transaction) |
| `OrchestratorHttpRequest`, `NetHttpRequest` | `orchestratorRequest` (the user's token, this tenant), `httpRequest` (no token, an absolute URL) |
| `SaveDuValidationStation`, `DuValidationStationSetFieldFocus` | `validationSave`, `validationFocusField`, addressed by the station's variable |
| `ContinueOnError="True"` on any Orchestrator activity | the call wrapped so a failure is logged and the handler goes on |
| an activity none of the above (`SendInterimResult`, a Flowchart, an activity of an unknown package) | a `throw new Error("<Activity> was not converted … (activity <location>)")` marker, and a `workflow-activity-unconverted` issue in the report |

Two things the handler does that the workflow did not have to: it answers the Custom HTML
control's request by writing the response variable (so a handler that throws first leaves the
control waiting), and it runs in the browser with the user's token, so every call above is
subject to the scopes in `uipath.json` and the folder in `uipath:folder-key`.

## What you must not do

- Do not change the report, the log, or the converter.
- Do not rename generated symbols, reorder files, or reformat code you did not need to touch.
- Do not remove a `notConverted…` marker without replacing it with a real implementation.
- Do not fix `source-app` or `by-design` issues — the one exception is the optional rewrite of
  a `custom-html-verbatim` control, under [Custom HTML controls](#custom-html-controls).
- Do not claim a fix works because it should. Say what you ran and what you saw.
