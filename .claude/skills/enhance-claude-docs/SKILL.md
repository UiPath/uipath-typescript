---
name: enhance-claude-docs
description: Analyze recent PR review comments and update Claude documentation files with new insights. Fetches PRs merged in the last N days, extracts reviewer feedback, and proposes documentation improvements. Triggers on "update claude docs", "enhance docs from PRs", "analyze PR comments".
---

# Enhance Claude Docs

Analyzes review comments from PRs merged in `UiPath/uipath-typescript` and updates Claude documentation files (`CLAUDE.md`, `Agents.md`, `agent_docs/`) with documentation-worthy insights not already captured.

---

## Arguments

- `days_back` (positional, default: `7`) — how many days back to scan for PR activity.

Example invocations:
- `/enhance-claude-docs` — last 7 days
- `/enhance-claude-docs 14` — last 14 days

---

## Step 1: Compute Date Range

Compute the start date for the PR search. Handle both macOS and Linux date commands:

```bash
# Try macOS first
START_DATE=$(date -v-${DAYS_BACK}d +%Y-%m-%d 2>/dev/null) || \
START_DATE=$(date -d "${DAYS_BACK} days ago" +%Y-%m-%d 2>/dev/null)
END_DATE=$(date +%Y-%m-%d)
```

Store `START_DATE` and `END_DATE` for use in the PR body later.

---

## Step 2: Fetch Merged PRs

Fetch only PRs that were **merged** in the date range. PRs that are still open or were closed without merging are skipped — they'll be picked up in a future run when (and if) they merge.

```bash
gh api "repos/UiPath/uipath-typescript/pulls?state=closed&sort=updated&direction=desc&per_page=100" \
  --jq "[.[] | select(.merged_at != null and .merged_at >= \"${START_DATE}\") | {number, title, state: \"merged\", user: .user.login, merged_at}]"
```

If no merged PRs found, report "No merged PRs found in the last N days" and stop.

---

## Step 3: Fetch Review Threads via GraphQL

Use GitHub's GraphQL API to fetch **review threads** (not individual comments) for each PR. This gives us thread resolution status and the full conversation in one call.

### GraphQL query (batch per PR)

```bash
gh api graphql -f query='
{
  repository(owner: "UiPath", name: "uipath-typescript") {
    pullRequest(number: {pr_number}) {
      title
      state
      author { login }
      reviewThreads(first: 100) {
        nodes {
          isResolved
          isOutdated
          path
          line
          comments(first: 30) {
            nodes {
              author { login }
              body
              createdAt
            }
          }
        }
      }
    }
  }
}'
```

### Thread classification

For each thread, classify it into one of three buckets:

| Bucket | Criteria | Action |
|--------|----------|--------|
| **Resolved** | `isResolved: true` | Analyze for insights |
| **Effectively resolved** | `isResolved: false`, but has replies where the PR author acknowledged the feedback (e.g., "done", "fixed", "changed to X", "good point, updated", or any reply indicating the feedback was accepted and acted upon) | Analyze for insights |
| **Unresolved / Rejected** | `isResolved: false`, and either no replies, or the PR author pushed back / debated without acting on it, or the thread is an open question with no conclusion | **Skip entirely** |

**Important:** Do NOT use keyword matching for the "effectively resolved" bucket. Read the full thread conversation and use semantic understanding to judge whether the PR author acknowledged and acted on the feedback. The signal could be anything — a one-word "done", a detailed explanation of what they changed, or even just agreement followed by a code change.

### Additional filtering

After thread classification, also discard threads where:
- All comments are from bots (user login ends with `[bot]`)
- The reviewer's comment is fewer than 10 characters (too short to contain insight)
- The thread is purely automated (`/`, `<!--` prefixes)

Collect all remaining **resolved + effectively resolved** threads with their PR context (PR number, title, state).

---

## Step 4: Read Current Documentation

Read all five documentation files:

1. `CLAUDE.md`
2. `Agents.md`
3. `agent_docs/architecture.md`
4. `agent_docs/conventions.md`
5. `agent_docs/rules.md`

---

## Step 5: Analyze Threads for Insights

For each resolved/effectively-resolved thread, perform a two-stage analysis:

### Stage 1: Validity and resolution extraction

Read the **full thread conversation** and determine:

1. **Was the feedback valid?** — Did the reviewer raise a legitimate concern about a pattern, convention, architecture decision, or quality issue? Or was it a misunderstanding, a personal preference, or something the PR author correctly pushed back on?
2. **What was the resolution?** — If valid, what specifically changed? Extract the concrete action taken (e.g., "switched from NetworkError to ErrorFactory", "moved folderId from positional param to options object", "added unit test for bound methods").
3. **Is it generalizable?** — Is this a one-off fix for this specific PR, or does it reveal a pattern/rule that applies to future work?

Skip threads where the feedback was invalid, the resolution is unclear, or the lesson is not generalizable.

### Stage 2: Documentation mapping

For each thread that passes Stage 1, determine if it contains a documentation-worthy insight:

| Signal | Target file |
|--------|-------------|
| Reviewer correcting a pattern violation or convention (including anti-patterns) | `agent_docs/conventions.md` (add inline **NEVER** next to the relevant convention) |
| Explaining WHY a convention exists or should be followed | `agent_docs/conventions.md` |
| New testing guidelines or quality rules | `agent_docs/rules.md` (testing & quality only) |
| New project structure info, service patterns, or architecture decisions | `agent_docs/architecture.md` |
| New commands, quick-reference items, or workflow changes | `Agents.md` |
| Top-level pointers or high-level project changes (rare) | `CLAUDE.md` |

### Ignore (skip these)

- One-off bug fixes with no general lesson
- Typo corrections or nit fixes
- Insights already documented in the existing files
- Subjective style preferences without team consensus
- Threads where the resolution was just "removed" or "deleted" with no broader lesson

### Deduplication

If multiple threads across different PRs express the same insight, consolidate into a single documentation change and cite all source PRs.

---

## Step 6: Propose and Apply Changes

If no actionable insights are found, report:

```
No documentation-worthy insights found in {X} PRs with {Y} comments from {START_DATE} to {END_DATE}.
```

And stop. Do not create a PR.

If actionable insights exist:

1. For each insight, determine the correct file and section.
2. Edit the files using the Edit tool. Follow existing formatting, heading levels, and conventions in each file.
3. For `agent_docs/conventions.md`, add conventions and anti-patterns to the relevant section. Anti-patterns go inline as **NEVER** next to the related convention — only when they add a non-obvious *why* or call out a specific trap. Do not add NEVERs that merely restate the convention in negative form.
4. For `agent_docs/rules.md`, add only testing guidelines, integration test rules, documentation/JSDoc rules, or quality checklist items. This file does not contain coding conventions or anti-patterns — those belong in `conventions.md`.
5. For `agent_docs/architecture.md`, update tables or sections as appropriate.
6. For `Agents.md`, update the quick reference or add new sections.

### Content rules for doc edits

The text written into the doc files must be self-contained guidance, not a changelog.

- **Do not include source PR references** (`#327`, `Source: PR #184`, etc.) in the file content — they create permanent cross-link noise in the source PRs.
- **Do not include @-mentions** (`@swati354`, `reviewer @maninder noted`) in the file content — handles don't belong in long-lived docs.
- Rewrite each insight as a generalized rule/convention; don't quote the original comment verbatim.

Provenance belongs in the PR body (Step 7) and the terminal output (Step 8) — not inside the docs.

---

## Step 7: Create or Update PR

### Check for existing PR

```bash
gh pr list --repo UiPath/uipath-typescript --label "claude-docs-update" --state open --json number,headRefName
```

### Ensure label exists

```bash
gh label create "claude-docs-update" --repo UiPath/uipath-typescript --description "Auto-generated Claude docs update from PR review analysis" --color "0E8A16" 2>/dev/null || true
```

### Branch naming

```bash
BRANCH_NAME="claude-docs-update/$(date +%Y-%m-%d)"
```

### If existing open PR found

1. Check out the existing PR branch.
2. Commit changes with message: `docs: update claude docs from PR review analysis (${START_DATE} to ${END_DATE})`
3. Push to the existing branch.
4. Regenerate the PR body from scratch by reading the **full diff** of the branch against `main` (`gh pr diff`). The diff is the source of truth — it captures all changes across all previous runs. Generate the PR body in the same format as "If no existing PR" below, using `gh pr edit` to update.

### If no existing PR

1. Create and check out the new branch from `main`.
2. Stage and commit all changed documentation files.
   - Commit message: `docs: update claude docs from PR review analysis (${START_DATE} to ${END_DATE})`
3. Push the branch.
4. Create the PR:

```bash
gh pr create \
  --repo UiPath/uipath-typescript \
  --title "docs: update Claude docs from PR review analysis" \
  --label "claude-docs-update" \
  --reviewer "ninja-shreyash" \
  --body "$(cat <<'EOF'
## Summary
Weekly analysis of PR comments ({START_DATE} -> {END_DATE}).
Analyzed {X} PRs with {Y} comments. Found {Z} actionable insights.

## Changes
### {file_path}
- **{Change description}**
  Source: PR #{N} -- @{reviewer} commented on `{file}:{line}`:
  > "{original comment}"

### No changes
- {files not modified} -- no relevant insights found

## PRs Analyzed
| PR | Title | Comments |
|----|-------|----------|
| #{N} | {title} | {count} |
EOF
)"
```

**PR body rules:**
- Replace all `{placeholders}` with actual values.
- The **Changes** section must list every file modified with the specific change, source PR, reviewer, and original comment quote.
- The **No changes** section must list files that were read but had no relevant insights.
- The **PRs Analyzed** table must list every merged PR that was fetched, regardless of whether it yielded insights.

---

## Output

After completion, report:

```
## Claude Docs Enhancement Summary

**Date range:** {START_DATE} to {END_DATE}
**PRs analyzed:** {X}
**Comments reviewed:** {Y}
**Actionable insights:** {Z}

### Changes made
- {file}: {brief description of changes}

### PR
{PR URL or "No PR created -- no actionable insights found"}
```
