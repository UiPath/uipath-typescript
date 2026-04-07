---
name: enhance-claude-docs
description: Analyze recent PR review comments and update Claude documentation files with new insights. Fetches merged, open, and closed PRs from the last N days, extracts reviewer feedback, and proposes documentation improvements. Triggers on "update claude docs", "enhance docs from PRs", "analyze PR comments".
---

# Enhance Claude Docs

Analyzes PR review comments from `UiPath/uipath-typescript` and updates Claude documentation files (`CLAUDE.md`, `Agents.md`, `agent_docs/`) with documentation-worthy insights not already captured.

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

## Step 2: Fetch PRs

Fetch all PRs updated in the date range:

```bash
gh api "repos/UiPath/uipath-typescript/pulls?state=all&sort=updated&direction=desc&per_page=100" \
  --jq "[.[] | select(.updated_at >= \"${START_DATE}\") | {number, title, state, user: .user.login, updated_at}]"
```

If no PRs found, report "No PRs found in the last N days" and stop.

---

## Step 3: Fetch Comments for Each PR

For each PR, fetch both types of comments:

### Review comments (inline code comments)

```bash
gh api "repos/UiPath/uipath-typescript/pulls/{pr_number}/comments" --paginate \
  --jq '[.[] | {id, user: .user.login, body, path, line: .original_line, created_at}]'
```

### Conversation comments (issue-style thread comments)

```bash
gh api "repos/UiPath/uipath-typescript/issues/{pr_number}/comments" --paginate \
  --jq '[.[] | {id, user: .user.login, body, created_at}]'
```

### Filtering

Discard comments that match any of these:
- **Bot comments**: user login ends with `[bot]`
- **Too short**: body is fewer than 10 characters
- **Automated**: body starts with common bot prefixes (`/`, `<!--`)

Collect all remaining comments with their PR context (PR number, title, state).

---

## Step 4: Read Current Documentation

Read all five documentation files:

1. `CLAUDE.md`
2. `Agents.md`
3. `agent_docs/architecture.md`
4. `agent_docs/conventions.md`
5. `agent_docs/rules.md`

---

## Step 5: Analyze Comments for Insights

Review each comment and determine if it contains a documentation-worthy insight. Use these criteria:

### Docs-worthy (act on these)

| Signal | Target file |
|--------|-------------|
| Reviewer correcting a pattern violation not yet in rules | `agent_docs/rules.md` |
| Explaining WHY a convention exists or should be followed | `agent_docs/conventions.md` |
| New project structure info, service patterns, or architecture decisions | `agent_docs/architecture.md` |
| New commands, quick-reference items, or workflow changes | `Agents.md` |
| Top-level pointers or high-level project changes (rare) | `CLAUDE.md` |

### Ignore (skip these)

- One-off bug fixes with no general lesson
- Typo corrections
- Insights already documented in the existing files
- Unresolved debates or discussions without clear resolution
- Subjective style preferences without team consensus
- Comments that are questions rather than directives

### Deduplication

If multiple comments across different PRs express the same insight, consolidate into a single documentation change and cite all source PRs.

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
3. For `agent_docs/rules.md`, add new items under the appropriate "NEVER" subsection or create a new subsection if needed. Follow the existing pattern: bold "NEVER" + action, followed by explanation with rationale.
4. For `agent_docs/conventions.md`, add to the relevant section or create a new subsection following existing patterns.
5. For `agent_docs/architecture.md`, update tables or sections as appropriate.
6. For `Agents.md`, update the quick reference or add new sections.

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
4. Update the PR body with the new analysis using `gh pr edit`.

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
  --reviewer "shreyash0502" \
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
| PR | Title | State | Comments |
|----|-------|-------|----------|
| #{N} | {title} | {state} | {count} |
EOF
)"
```

**PR body rules:**
- Replace all `{placeholders}` with actual values.
- The **Changes** section must list every file modified with the specific change, source PR, reviewer, and original comment quote.
- The **No changes** section must list files that were read but had no relevant insights.
- The **PRs Analyzed** table must list every PR that was fetched, regardless of whether it yielded insights.
- State values: `merged`, `open`, `closed`.

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
