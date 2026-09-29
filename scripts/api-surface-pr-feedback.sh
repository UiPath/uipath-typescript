#!/usr/bin/env bash
# Labels and comments the PR with the public API report.
# Expects GH_TOKEN, PR, CODE (0 unchanged, 1 breaking, 2 additions only).
set -uo pipefail

MARKER='<!-- api-surface-report -->'
LABEL='breaking-change'
REPO="${GITHUB_REPOSITORY:?}"

report=$(cat api-surface-report.txt 2>/dev/null || echo '(report missing)')

case "${CODE}" in
  1)
    body="${MARKER}
### This PR changes the public API in a breaking way

Existing consumer code may stop compiling. If that is intended, it needs a release note and a major version bump — not a patch. If it is not, keep the old signature as a deprecated overload.

<details><summary>What changed</summary>

\`\`\`
${report}
\`\`\`

</details>"
    ;;
  2)
    body="${MARKER}
Public API changed, nothing breaking. New members, or a deprecation notice.

<details><summary>What changed</summary>

\`\`\`
${report}
\`\`\`

</details>"
    ;;
  *)
    body=''
    ;;
esac

# The label must come off again if the break is fixed mid-review.
if [ "${CODE}" = "1" ]; then
  gh label create "$LABEL" --repo "$REPO" --color 'B60205' \
    --description 'Changes the public API in a way that can break consumers' 2>/dev/null || true
  gh pr edit "$PR" --repo "$REPO" --add-label "$LABEL" || echo "could not add label"
else
  gh pr edit "$PR" --repo "$REPO" --remove-label "$LABEL" 2>/dev/null || true
fi

# One sticky comment, edited in place, instead of one per push.
existing=$(gh api "repos/$REPO/issues/$PR/comments" --paginate \
  --jq "[.[] | select(.body | startswith(\"$MARKER\"))] | .[0].id" 2>/dev/null)

if [ -z "$body" ]; then
  if [ -n "${existing:-}" ] && [ "${existing}" != "null" ]; then
    gh api -X PATCH "repos/$REPO/issues/comments/$existing" \
      -f body="${MARKER}
No public API changes in this PR." >/dev/null || true
  fi
  exit 0
fi

if [ -n "${existing:-}" ] && [ "${existing}" != "null" ]; then
  gh api -X PATCH "repos/$REPO/issues/comments/$existing" -f body="$body" >/dev/null \
    && echo "updated comment $existing"
else
  gh pr comment "$PR" --repo "$REPO" --body "$body" && echo "posted comment"
fi
