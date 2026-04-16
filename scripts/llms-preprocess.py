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
_PARAM_HEADINGS = ("Parameters", "Type Parameters")


def preprocess(soup: BeautifulSoup, _output: str) -> None:
    """Entry point called by mkdocs-llmstxt for each page included in any output.

    The plugin calls this once per included page per llmstxt block; we apply
    the same transformations to every page — the shrink is non-destructive
    and benefits both the coded-action-apps and the large llms-full-content
    outputs.

    The second parameter (the per-page markdown output path) is required by
    the plugin's calling convention. We don't need it here — the underscore
    prefix marks it intentionally unused.
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
        table = _find_param_table(heading)
        if table is None:
            continue
        kind = _heading_text(heading)
        ul = _build_param_list(soup, table, kind)
        # Skip replacement if no rows rendered — leaves the original table
        # intact so malformed input never silently disappears.
        if ul.find("li") is not None:
            table.replace_with(ul)


def _find_param_table(heading: Tag) -> Tag | None:
    """Return the <table> sibling if `heading` introduces a Parameters or
    Type Parameters table with a populated <tbody>; otherwise None."""
    if _heading_text(heading) not in _PARAM_HEADINGS:
        return None
    table = heading.find_next_sibling()
    if table is None or table.name != "table" or table.find("tbody") is None:
        return None
    return table


def _build_param_list(soup: BeautifulSoup, table: Tag, kind: str) -> Tag:
    """Build a <ul> bullet list with one <li> per row in `table`'s <tbody>.
    Rows with fewer than two cells are skipped (defensive — shouldn't happen
    in valid TypeDoc output)."""
    ul = soup.new_tag("ul")
    rows = table.find("tbody").find_all("tr", recursive=False)
    for row in rows:
        cells = row.find_all(["td", "th"], recursive=False)
        if len(cells) >= 2:
            ul.append(_render_param_row(soup, cells, kind=kind))
    return ul


def _render_param_row(
    soup: BeautifulSoup,
    cells: list[Tag],
    kind: str,
) -> Tag:
    """Render one parameter row as a single `<li>` element.

    Format B:
        <li>{name}: {type} — {description}</li>
        → md:  - `options?`: `T` — Query options including folderId…

    For Type Parameters (two columns: type param, default type), emits:
        <li>{type param} = {default}</li>
    skipping the default when absent or identical to the type param.
    """
    li = soup.new_tag("li")
    # Column 0 — parameter name (or type parameter). Move children (rather than
    # copy text) so inner <code>/<a> formatting is preserved.
    _move_children(li, cells[0])
    if kind == "Type Parameters":
        _append_type_parameter_default(li, cells)
    else:
        _append_parameter_type_and_description(li, cells)
    return li


def _append_type_parameter_default(li: Tag, cells: list[Tag]) -> None:
    """Append `= default` for a Type Parameters row, skipping the default
    when it's absent, a dash placeholder, or identical to the type param."""
    default_text = cells[1].get_text(strip=True)
    param_text = cells[0].get_text(strip=True)
    if default_text and default_text != "-" and default_text != param_text:
        li.append(NavigableString(" = "))
        _move_children(li, cells[1])


def _append_parameter_type_and_description(li: Tag, cells: list[Tag]) -> None:
    """Append `: type` and optional ` — description` for a Parameters row."""
    li.append(NavigableString(": "))
    _move_children(li, cells[1])
    if len(cells) >= 3 and cells[2].get_text(strip=True):
        li.append(NavigableString(" — "))
        _move_children(li, cells[2])


def _move_children(destination: Tag, source: Tag) -> None:
    """Move all child nodes from `source` into `destination`, preserving order.

    BeautifulSoup's `.append()` re-parents a node (removes it from the source's
    `.contents`). Popping from `source.contents[0]` in a while loop keeps the
    iteration correct despite that mutation — we repeatedly grab the current
    first child until there are none left.
    """
    while source.contents:
        destination.append(source.contents[0])


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
        if _has_single_code_child(a):
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
