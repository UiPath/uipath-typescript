"""
Preprocess hook for mkdocs-llmstxt.

Strips TypeDoc boilerplate from HTML before markdown conversion to shrink
llms-full-content.txt below the WebFetch ingestion threshold. All
transformations preserve unique documentation content; only repetitive
scaffolding and intra-file link wrappers are removed or collapsed.

Targeted artifacts (verified against the CI-pinned build of main):

  1. <hr>                                 — 103 occurrences; methods already
                                            separated by <h3> headings.
  2. Nested "(): void" return blocks      — 26 occurrences; TypeDoc boilerplate
                                            for `() => void` return types.
  3. Parameters / Type Parameters tables  — 119 total; collapsed to bullet
                                            lists. Preserves param name, type,
                                            and description. Works for any row
                                            count (single- and multi-row).
  4. "Prerequisites: Initialize the SDK"  — 16 occurrences; duplicates the
                                            Authentication docs and adds no
                                            new information per-method.
  5. Intra-docs <a> cross-reference links — 600+ occurrences; `<a>` tags whose
                                            only child is a <code> element are
                                            type cross-references. The link
                                            text (the type name) is preserved;
                                            the href is dropped because every
                                            target is already in the same
                                            aggregated llms-full-content.txt.

Wired up in mkdocs.yml under the large llmstxt plugin block:

    plugins:
      - llmstxt:
          full_output: "llms-full-content.txt"
          preprocess: "scripts/llms-preprocess.py"
          ...

Contract (from mkdocs_llmstxt._internal.preprocess):
  preprocess(soup: BeautifulSoup, output: str) -> None
  - soup has already passed through `autoclean` (permalinks, images stripped)
  - output is the per-page markdown output path (not the aggregated llms*.txt)
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from bs4 import NavigableString

if TYPE_CHECKING:
    from bs4 import BeautifulSoup, Tag


_PREREQUISITES_PREFIX = "Prerequisites: Initialize the SDK first"


def preprocess(soup: BeautifulSoup, output: str) -> None:
    """Entry point called by mkdocs-llmstxt for each page included in any output.

    `output` is the path of the per-page markdown file being generated
    (e.g. `.../AssetServiceModel/index.md`), NOT the aggregated llms*.txt
    filename. The plugin calls this once per included page per llmstxt block;
    we apply the same transformations to every page — the shrink is a
    non-destructive win for both the coded-action-apps and the large output.
    """
    _remove_hrs(soup)
    _collapse_nested_void_returns(soup)
    _collapse_param_tables(soup)
    _strip_prerequisites_paragraphs(soup)
    _unwrap_type_cross_reference_links(soup)


def _remove_hrs(soup: BeautifulSoup) -> None:
    """Strip <hr> elements — TypeDoc places them between methods that already
    have <h3> headings, so the horizontal rule is pure visual redundancy."""
    for hr in soup.find_all("hr"):
        hr.decompose()


def _collapse_nested_void_returns(soup: BeautifulSoup) -> None:
    """Remove the nested "(): void" return block TypeDoc emits for methods
    whose return type is a cleanup function (`() => void`).

    Input pattern:
        <h4>Returns</h4>
        <p>Cleanup function to remove the handler</p>   ← keep
        <blockquote>(): void</blockquote>               ← remove
        <h5>Returns</h5>                                ← remove
        <p>void</p>                                     ← remove
        <h4>Example</h4>                                ← next section

    Anchoring on the inner <h5>Returns</h5> is the most reliable signal;
    the sibling <blockquote> and <p>void</p> always appear with it.
    """
    for h5 in soup.find_all("h5"):
        if _heading_text(h5) != "Returns":
            continue
        prev_sib = h5.find_previous_sibling()
        next_sib = h5.find_next_sibling()
        if (
            prev_sib is not None
            and prev_sib.name == "blockquote"
            and next_sib is not None
            and next_sib.name == "p"
            and next_sib.get_text(strip=True) == "void"
        ):
            prev_sib.decompose()
            next_sib.decompose()
            h5.decompose()


def _collapse_param_tables(soup: BeautifulSoup) -> None:
    """Replace Parameters and Type Parameters tables with a bullet list,
    regardless of row count. Table scaffolding (header row, separator row,
    and pipe-delimited data rows) is expensive relative to a `<li>` per row.

    Rendered shape (Format B — chosen in prior review):
        - `options?`: `T` — Query options including folderId…
        - `folderId`: `number` — The ID of the organization unit
        - `cursor?`: `string` — Pagination cursor from a previous response
    """
    for heading in soup.find_all("h4"):
        label = _heading_text(heading)
        if label not in ("Parameters", "Type Parameters"):
            continue
        table = heading.find_next_sibling()
        if table is None or table.name != "table":
            continue
        tbody = table.find("tbody")
        if tbody is None:
            continue
        rows = tbody.find_all("tr", recursive=False)
        if not rows:
            continue
        ul = soup.new_tag("ul")
        for row in rows:
            cells = row.find_all(["td", "th"], recursive=False)
            if len(cells) < 2:
                continue
            li = _render_param_row(soup, cells, kind=label)
            if li is not None:
                ul.append(li)
        # Only replace if at least one row rendered successfully; otherwise
        # leave the original table alone so nothing disappears silently.
        if ul.find("li") is not None:
            table.replace_with(ul)


def _render_param_row(
    soup: BeautifulSoup,
    cells: list[Tag],
    kind: str,
) -> Tag | None:
    """Render one parameter row as a single `<li>` element.

    Format B:
        <li>{name}: {type} — {description}</li>
        → md:  - `options?`: `T` — Query options including folderId…

    For Type Parameters (two columns: type param, default type), emits:
        <li>{type param} = {default}</li>
    skipping the default when absent or identical to the type param.
    """
    li = soup.new_tag("li")

    # Column 0 — parameter name or type parameter. Moving child nodes (rather
    # than copying text) preserves inner <code>/<a> formatting without a
    # re-parse step.
    for child in list(cells[0].contents):
        li.append(child)

    if kind == "Type Parameters":
        default_text = cells[1].get_text(strip=True)
        param_text = cells[0].get_text(strip=True)
        if default_text and default_text != "-" and default_text != param_text:
            li.append(NavigableString(" = "))
            for child in list(cells[1].contents):
                li.append(child)
    else:  # Parameters — three columns: name | type | description
        li.append(NavigableString(": "))
        for child in list(cells[1].contents):
            li.append(child)
        if len(cells) >= 3 and cells[2].get_text(strip=True):
            li.append(NavigableString(" — "))
            for child in list(cells[2].contents):
                li.append(child)

    return li


def _strip_prerequisites_paragraphs(soup: BeautifulSoup) -> None:
    """Remove the repeated "Prerequisites: Initialize the SDK first…" blurb.

    The authentication and getting-started pages cover SDK initialization in
    depth; repeating the line on every service method adds ~120 bytes per
    occurrence with no new information.
    """
    for p in soup.find_all("p"):
        if p.get_text(strip=True).startswith(_PREREQUISITES_PREFIX):
            p.decompose()


def _unwrap_type_cross_reference_links(soup: BeautifulSoup) -> None:
    """Unwrap <a> tags whose only meaningful content is a <code> element.

    TypeDoc wraps every type cross-reference in an <a> — e.g.
        <a href="../PaginatedResponse/"><code>PaginatedResponse</code></a>
    After markdown conversion these become `[\`PaginatedResponse\`](../PaginatedResponse/)`
    which bloats the file by ~30 bytes per link. Since every link target is
    already in the same aggregated llms-full-content.txt, the URL adds no
    value to an LLM consumer — unwrapping leaves the type name intact while
    dropping the `[...](...)` wrapper.

    Safety: only <a> tags whose non-whitespace content is a single <code>
    element are unwrapped. Prose links like
        <a href="...">Getting Started</a>
        <a href="...">UiPath Conversational Agents Guide</a>
    are preserved because their inner content is a plain text node, not a
    <code> tag.
    """
    for a in soup.find_all("a"):
        if not _has_single_code_child(a):
            continue
        a.unwrap()


def _has_single_code_child(tag: Tag) -> bool:
    """Return True when `tag`'s only meaningful child is a single <code>."""
    code_seen = False
    for child in tag.children:
        if isinstance(child, NavigableString):
            if child.strip():
                return False  # has real text content alongside — not just code
            continue
        if child.name == "code" and not code_seen:
            code_seen = True
            continue
        return False  # a second element child, or something other than code
    return code_seen


def _heading_text(element: Tag) -> str:
    """Get heading text without the trailing permalink marker.

    `autoclean` strips the permalink <a>, but the ¶ character can linger
    on some themes — defensive normalization keeps this script resilient
    to mkdocs-material theme changes.
    """
    return element.get_text().replace("¶", "").strip()
