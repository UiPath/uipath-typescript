#!/usr/bin/env bash
# Posts the public API surface report onto the PR: a `breaking-change` label
# plus a comment when something breaking changed, a short comment when the API
# only gained things, and nothing at all when the public API is untouched.
#
# Deliberately never fails the build. The signal is the label, which the release
# process can read to decide whether notes and a major bump are needed.
#
# Expects: GH_TOKEN, PR, CODE (0 = no change, 1 = breaking, 2 = additions only)
# and api-surface-report.txt in the working directory.
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

The snapshot was regenerated and committed for you, so the change is visible in this PR's diff. Pull before your next push.

<details><summary>What changed</summary>

\`\`\`
${report}
\`\`\`

</details>"
    ;;
  2)
    body="${MARKER}
Public API gained new members. Nothing breaking.

The snapshot was regenerated and committed for you, so \`scripts/api-surface.txt\` in this PR is current. Pull before your next push.

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

# The label has to come off again when a break is fixed mid-review, or the
# release process reads a stale label and writes the wrong notes.
if [ "${CODE}" = "1" ]; then
  gh label create "$LABEL" --repo "$REPO" --color 'B60205' \
    --description 'Changes the public API in a way that can break consumers' 2>/dev/null || true
  gh pr edit "$PR" --repo "$REPO" --add-label "$LABEL" || echo "could not add label"
else
  gh pr edit "$PR" --repo "$REPO" --remove-label "$LABEL" 2>/dev/null || true
fi

# One sticky comment, edited in place, so a ten-push PR does not collect ten
# copies of the same report.
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
