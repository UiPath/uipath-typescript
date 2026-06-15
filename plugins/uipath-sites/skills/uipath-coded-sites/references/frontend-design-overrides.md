# Frontend Design Overrides

Use these rules when generating or materially changing the UI for a UiPath coded app through the Sites-compatible prompt flow. These rules affect visual presentation and styling quality only; they do not override the `uipath-coded-apps` skill's technical, functional, auth, build, project-structure, or deployment instructions.

## Visual-only ownership

- This file owns visual presentation only: professional app shell, typography, palette, spacing, hierarchy, interaction polish, responsive styling, and accessibility styling.
- It must not define, replace, or override coded-app functional behavior, SDK behavior, data-fetching patterns, pagination mechanics, validation behavior, auth/config, local validation, build, pack, publish, or deploy flow.
- For any functional UI concern, load and follow the relevant `uipath-coded-apps` reference. Examples include tables, pagination, text overflow, polling, master-detail, SDK-backed data rendering, loading/error behavior, validation, and action handling; this list is not exhaustive.
- Visual styling may wrap or refine those functional patterns, but must not change their mechanics.

The goal is to produce polished, purposeful application screens rather than generic generated dashboards. This file is an adapted, Codex/UiPath-specific interpretation of the Claude frontend-design guidance: keep the same design bar and decision coverage, but apply it to UiPath coded apps generated through the Sites experience.

For business workflow apps, prefer a professional modern enterprise look: crisp typography, calm surfaces, strong alignment, readable density, clear status colors, and a structured app shell. The UI should feel closer to a polished case-management or operations console than a playful demo or marketing site.

## Design thinking

- Before coding, decide the interface's purpose, audience, tone, constraints, and differentiating idea.
- Treat the user's prompt as a product brief, not just a component request.
- Identify the real user, the main job they are trying to complete, and the first decision or action the screen should support.
- Pick a strong aesthetic stance instead of drifting into a neutral default. For UiPath coded apps, the default stance should be professional, modern, operational, and business-user-friendly unless the user explicitly asks for a different mood.
- Decide what the user should remember about the app after seeing the first screen.
- Let the design concept drive concrete implementation choices: layout, typography, palette, motion, surfaces, density, and copy.
- A bold design does not mean a loud or playful design. Minimal, dense, editorial, industrial, or operational approaches usually fit business apps better than playful, novelty, retro, or decorative approaches.

## Product framing

- Build the first screen around the actual workflow the user asked for, not around setup text, marketing copy, or placeholder dashboard chrome.
- Prefer concrete app language over generic labels. Use terms from the user's domain in headings, table columns, empty states, filters, and actions.
- Design for repeated work use when the app is operational: fast scanning, clear status, obvious actions, and low-friction review.
- Do not invent large product areas the user did not request. Avoid speculative admin, settings, auth, storage, upload, or reporting flows unless needed for the requested workflow.
- If `@Sites` is used as the prompt entry point, keep product shaping focused on the coded-app workflow and final UiPath deployment target. Do not introduce Sites hosting, storage, auth, or starter-template requirements.

## Visual direction

- Choose a clear visual direction before coding. Examples: operations command center, analyst review bench, field-service cockpit, executive exception review, queue triage console, or process monitoring wall.
- Make the chosen direction visible through layout, density, type scale, color, surfaces, and interaction patterns.
- Avoid default SaaS sameness: plain white background, generic cards, default blue primary buttons, and filler charts are not enough.
- Use visual emphasis to guide the user's eye to the next meaningful action or decision.
- Make the interface feel work-ready, not decorative. Polish should clarify the workflow.
- Make each generated app visually distinct through layout, density, surface treatment, hierarchy, and domain-specific details. Do not rely on novelty fonts to create distinction.
- Favor one memorable design move over many weak flourishes: a strong split layout, durable navigation rail, compact control deck, precise status system, layered process map, or expressive but readable data treatment.

## Aesthetic modes

- Choose an aesthetic mode that fits the prompt rather than defaulting to generic enterprise UI.
- Refined minimal: restrained palette, precise spacing, sharp typography, quiet surfaces, crisp interaction states.
- Operational dense: compact controls, high information density, status-first hierarchy, keyboard-friendly affordances.
- Industrial technical: structured grids, mono accents, durable surfaces, signal-like color, strong dividers.
- Editorial analytic: large type, narrative hierarchy, comparison panels, strong annotations, confident whitespace.
- Futuristic command center: layered panels, luminous accents, dark or mixed surfaces, animated status changes, careful contrast.
- Warm human workflow: softer palette, approachable copy, rounded surfaces, clear guidance, calmer status language.
- Professional case workspace: dark or anchored side navigation, light content canvas, selected-list/detail split, compact metadata cards, subtle borders, restrained blue/teal accents, status pills, and dense but readable rows.
- Do not mix aesthetic modes randomly. Pick one primary mode and execute it consistently.

## Information architecture

- Put the primary workflow in the dominant area of the screen.
- Use secondary panels for filters, details, activity, metrics, or context only when they support the primary workflow.
- Group related controls and data together. Do not scatter filters, actions, and status indicators across unrelated regions.
- Use clear hierarchy: page title, workflow summary, primary action, main content, supporting metadata.
- Keep navigation minimal unless the requested app has multiple real sections.
- Avoid empty sidebars or nav items that do not lead to implemented views.

## Layout

- Start with a strong layout skeleton before styling details.
- For workflow, case-management, task inbox, Data Fabric, Orchestrator, and operations apps, prefer a professional app shell: anchored sidebar or rail, searchable list/table region, clear detail panel, compact summary cards, and action bar near the relevant record.
- Use spacing deliberately. Dense enterprise screens can be compact, but they still need breathing room and alignment.
- Align labels, metrics, and actions consistently so the screen is scannable.
- Prefer responsive CSS grid and flex layouts over fixed pixel positioning.
- Avoid fragile layouts that depend on one exact viewport size.
- On mobile or narrow widths, preserve the core workflow first. Collapse secondary panels below or behind obvious controls.
- Do not let cards, tables, or panels overflow horizontally unless there is an intentional scroll region.
- Use asymmetry, overlap, diagonals, split panes, stepped grids, or generous negative space when it strengthens the concept.
- For dense apps, use controlled density rather than cramped spacing.

## Typography

- Use a deliberate, professional type system optimized for dense business workflows.
- For enterprise/workflow apps, prioritize readability, scanning, and trust over novelty. Use sober UI fonts that work well for tables, metadata, status labels, buttons, and case IDs.
- Do not use playful, chunky, comic, retro, decorative, heavily rounded, handwritten, or novelty display fonts for body text, tables, row titles, labels, buttons, metadata, navigation, or numeric values.
- Avoid making typography distinctive by choosing an unusual font. Create distinction through spacing, hierarchy, weight, casing, and layout first.
- Acceptable choices include modern professional UI/editorial fonts or system UI stacks when they improve readability. It is better to use a clean, familiar UI font than an expressive font that weakens a work app.
- If a display font is used at all, limit it to a logo mark or one large brand/title treatment. Never use display fonts for operational text.
- Define CSS variables for font families, weights, sizes, line heights, and letter spacing.
- Use type scale to create hierarchy instead of relying only on bold text.
- Keep body text readable. Avoid tiny text for operationally important values.
- Use tabular numerals for metrics, timestamps, counts, and status-heavy data when appropriate.
- Use stronger weight contrast sparingly: section headings and selected records can be semibold, but dense row text should remain calm and legible.

## Color and surfaces

- Define CSS variables for core colors: background, surface, elevated surface, text, muted text, border, accent, danger, warning, success, and focus.
- Choose a palette with a clear point of view. For business apps, prefer calm neutral surfaces, strong readable text, subtle borders, and restrained accent colors.
- Use dominant colors and sharp accents intentionally. A dark navigation rail with a light content canvas, blue/teal accent, and semantic status pills is often a strong default for professional workflow apps.
- Use color semantically and consistently. Status colors should mean the same thing everywhere.
- Ensure text contrast is sufficient on all surfaces.
- Use backgrounds, gradients, subtle patterns, or layered surfaces to create atmosphere, but keep data legible.
- Keep atmospheric details subtle in enterprise apps. Avoid loud gradients, heavy shadows, glassmorphism, decorative noise, or effects that compete with data.
- Do not use color alone to communicate state. Pair status color with labels, icons, shape, or text.

## Components

- Design components for the actual data and actions in the request.
- Tables should have meaningful columns, readable density, row states, and obvious row-level actions when relevant.
- Cards should contain decision-supporting information, not filler summaries.
- Forms should have explicit labels, helper text where needed, validation states, and clear submission behavior.
- Buttons should use action-specific labels such as `Deploy app`, `Refresh processes`, or `Open details`, not vague labels like `Submit` unless appropriate.
- Empty states should explain what is missing and what the user can do next.
- Error states should explain the failure in operational language and provide a recovery path when possible.

## Interaction states

- Include the states a real app needs:
- Loading state for async data or SDK calls.
- Empty state for no records or no matching filters.
- Error state for failed calls or unavailable services.
- Selected state for active rows, cards, tabs, or filters.
- Disabled state for unavailable actions.
- Success or completion feedback after important actions.
- Hover and focus states for interactive elements.
- Do not leave important interactions visually ambiguous.

## Motion

- Use motion sparingly and intentionally.
- Good uses: staged page entry, panel reveal, row selection, status change, skeleton-to-content transition.
- A single well-orchestrated page load or state transition is usually stronger than many unrelated micro-animations.
- Use CSS-only motion when it is enough. Add animation libraries only if the project already uses them or the interaction clearly needs them.
- Avoid constant ambient animation that distracts from work.
- Keep durations short and easing purposeful.
- Respect reduced-motion preferences when adding animation.

## Anti-patterns

- Do not produce generic AI-looking UI: predictable centered hero, generic stat cards, purple gradients on white, vague charts, repeated rounded cards, or placeholder dashboards.
- Do not use novelty fonts, toy-like typography, excessive boldness, or playful branding in business workflow apps.
- Do not default to component-library visuals or color systems that could belong to any app.
- Do not add decorative effects that conflict with the workflow or reduce readability.
- Do not hide weak information architecture behind visual polish.
- Do not create the same visual solution for different domains.

## Data realism

- Use realistic sample data when backend data is not available yet.
- Match sample data to the domain in the prompt. For example, process names, queue names, job states, owners, timestamps, and exception labels should look plausible.
- Avoid lorem ipsum, generic `Item 1`, or repeated fake names unless the user explicitly asked for a wireframe.
- Make placeholder data easy to replace with real SDK/API data.

## Accessibility

- Use semantic HTML for headings, buttons, inputs, labels, lists, and tables.
- Ensure keyboard navigation works for primary controls.
- Provide visible focus states.
- Add accessible names for icon-only buttons.
- Keep color contrast high enough for text and controls.
- Do not remove outlines unless replacing them with an equally visible focus style.
- Respect reduced-motion preferences for non-essential animation.

## Responsiveness

- Verify the layout at desktop and mobile widths.
- Keep the primary workflow usable on small screens.
- Collapse secondary metadata, filters, or detail panels predictably.
- Ensure controls remain tappable on touch devices.
- Avoid text clipping in buttons, tabs, table headers, and status pills.

## Implementation discipline

- Prefer simple React state and straightforward component composition.
- Do not introduce a design system, routing layer, animation library, charting library, or state manager unless the requested app needs it.
- Keep styling close enough to the app to be understandable, but extract repeated tokens and patterns into CSS variables or small components.
- Do not create unused components, placeholder routes, or dead navigation.
- Preserve existing project structure when modifying an existing app unless the user asks for a redesign.
- Match implementation complexity to the chosen aesthetic. Expressive visual concepts may need richer CSS, layered surfaces, and more detailed motion; refined minimal concepts need restraint, exact spacing, typography, and subtle state polish.

## Validation

- Before calling the work complete, run the normal build command required by `uipath-coded-apps`.
- Fix build failures before saying the app is ready.
- Inspect the first viewport and confirm it shows the requested workflow.
- Check that loading, empty, error, selected, disabled, and success states exist where relevant.
- Confirm UI text is concrete and domain-specific.
- Confirm the app still follows the coded-app technical requirements from `uipath-coded-apps`.
