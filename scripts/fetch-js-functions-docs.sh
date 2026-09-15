#!/usr/bin/env bash
#
# Materializes the JS Functions docs into docs/js-functions/ so MkDocs renders
# them as part of this site. The pages are authored in UiPath/coded-functions-js,
# next to the package and CLI they document; only the rendered output lives here.
#
# Same contract as the typedoc-generated directories (docs/api/,
# docs/coded-action-app-sdk/): gitignored, rebuilt on every docs build, never
# committed. Run before `mkdocs build`.
#
# Environment:
#   CODED_FUNCTIONS_DOCS_TOKEN  Read access to the source repo. It is an
#                               INTERNAL repo, so a workflow's default
#                               GITHUB_TOKEN cannot reach it. When unset, the
#                               fetch is skipped and placeholder pages are
#                               written instead so the build still succeeds --
#                               this is the fork-PR case, where GitHub withholds
#                               secrets from the workflow by design, and the
#                               local-build case.
#   JS_FUNCTIONS_DOCS_REF       Branch or tag to fetch. Defaults to main; set it
#                               to a tag (e.g. v0.2.0) to pin the published docs
#                               to a released version of the package.
#
set -euo pipefail

REPO="UiPath/coded-functions-js"
REF="${JS_FUNCTIONS_DOCS_REF:-main}"
TARGET="docs/js-functions"
CONFIG="mkdocs.yml"

# Pages the source repo does not publish in its own nav: its ADRs, the
# docs-folder README, and the requirements file for its standalone MkDocs site.
# Copying them would add orphan pages here that no nav entry points at.
UNPUBLISHED=("README.md" "requirements.txt" "decisions")

# Every js-functions page this site's config expects, as paths relative to
# $TARGET. Derived from mkdocs.yml (nav plus the llmstxt block) so the page list
# has exactly one source of truth.
referenced_pages() {
  grep -oE 'js-functions/[A-Za-z0-9._/-]+\.md' "$CONFIG" \
    | sed 's|^js-functions/||' \
    | sort -u
}

# mkdocs-llmstxt raises a KeyError during post-build for any page named in its
# sections that does not exist, so a partial tree fails the whole build rather
# than dropping one page. A placeholder keeps the build green when the docs were
# never fetched at all.
write_placeholder() {
  local rel="$1"
  local dest="${TARGET}/${rel}"
  mkdir -p "$(dirname "$dest")"
  cat > "$dest" <<PLACEHOLDER
# JS Functions documentation unavailable in this build

This page is authored in [\`${REPO}\`](https://github.com/${REPO}) as
\`docs/${rel}\`, and is fetched at docs build time by
\`scripts/fetch-js-functions-docs.sh\`.

The fetch was skipped because \`CODED_FUNCTIONS_DOCS_TOKEN\` was not set.
That is expected for fork pull requests, which GitHub runs without repository
secrets, and for local builds without the token exported.
PLACEHOLDER
}

if [ -z "${CODED_FUNCTIONS_DOCS_TOKEN:-}" ]; then
  echo "::warning::CODED_FUNCTIONS_DOCS_TOKEN is unset -- skipping the ${REPO} docs fetch. Writing placeholder pages so the build still completes; the JS Functions section will not show real content."
  rm -rf "$TARGET"
  while IFS= read -r page; do
    write_placeholder "$page"
  done < <(referenced_pages)
  exit 0
fi

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

# Tarball over `git clone` so the token travels in an Authorization header
# rather than inside a remote URL, where it would surface in git output.
echo "Fetching ${REPO}@${REF} docs..."
curl --fail --silent --show-error --location \
  --header "Authorization: Bearer ${CODED_FUNCTIONS_DOCS_TOKEN}" \
  --header "Accept: application/vnd.github+json" \
  --header "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/${REPO}/tarball/${REF}" \
  --output "${workdir}/source.tar.gz"

# The tarball's single top-level directory is <org>-<repo>-<sha>; strip it.
mkdir -p "${workdir}/source"
tar -xzf "${workdir}/source.tar.gz" -C "${workdir}/source" --strip-components=1

if [ ! -d "${workdir}/source/docs" ]; then
  echo "::error::${REPO}@${REF} has no docs/ directory -- nothing to publish." >&2
  exit 1
fi

rm -rf "$TARGET"
mkdir -p "$(dirname "$TARGET")"
mv "${workdir}/source/docs" "$TARGET"

for path in "${UNPUBLISHED[@]}"; do
  rm -rf "${TARGET:?}/${path}"
done

# The source pages were written for https://uipath.github.io/coded-functions-js/;
# any absolute self-link would bounce readers off this site. Point them at the
# section's new home. Relative links between the pages keep working as-is
# because the directory layout is preserved.
find "$TARGET" -name '*.md' -type f -exec \
  sed -i.bak \
    -e 's|https://uipath\.github\.io/coded-functions-js/|https://uipath.github.io/uipath-typescript/js-functions/|g' \
    {} +
find "$TARGET" -name '*.md.bak' -type f -delete

# A page renamed or removed upstream must fail loudly rather than publish a
# placeholder: the last good site stays live, and the nav plus the llmstxt block
# in mkdocs.yml get updated to match.
missing=()
while IFS= read -r page; do
  [ -f "${TARGET}/${page}" ] || missing+=("$page")
done < <(referenced_pages)

if [ ${#missing[@]} -gt 0 ]; then
  echo "::error::${REPO}@${REF} no longer provides these pages, which ${CONFIG} still references: ${missing[*]}. Update the JS Functions nav and llmstxt entries in ${CONFIG}." >&2
  exit 1
fi

echo "Fetched $(find "$TARGET" -name '*.md' -type f | wc -l | tr -d ' ') markdown pages into ${TARGET}/"
