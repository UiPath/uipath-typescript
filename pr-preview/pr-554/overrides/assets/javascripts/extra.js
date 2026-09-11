function updateThemePictures() {
    const body = document.body;
    const mediaAttr = body.getAttribute("data-md-color-media") || "";
    const isDark = mediaAttr.includes("dark");

    const pictures = document.querySelectorAll("picture");

    pictures.forEach((picture) => {
        const darkSrc = picture.getAttribute("data-dark");
        const lightSrc = picture.getAttribute("data-light");

        const source = picture.querySelector("source");
        const img = picture.querySelector("img");

        if (isDark) {
            source.media = "all";
            source.srcset = darkSrc;
            img.src = darkSrc;
        } else {
            source.media = "not all";
            source.srcset = lightSrc;
            img.src = lightSrc;
        }
    });
}

// Run on load
updateThemePictures();

// Watch for changes to the theme
const observer = new MutationObserver(updateThemePictures);
observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-md-color-media"],
});

document$.subscribe(() => {
    document.querySelectorAll(".headerlink").forEach((link) => {
        link.setAttribute("data-clipboard-text", link.href);
    });
    
    // Add copy markdown button
    addCopyMarkdownButton();
});

function addCopyMarkdownButton() {
    // Remove existing button if it exists
    const existingButton = document.querySelector('.copy-markdown-btn');
    if (existingButton) {
        existingButton.remove();
    }
    
    // Look for content actions area or create one
    let actionsContainer = document.querySelector('.md-content__actions');
    
    if (!actionsContainer) {
        // Create actions container similar to MkDocs content actions
        actionsContainer = document.createElement('div');
        actionsContainer.className = 'md-content__actions';
        
        // Find the right place to insert it (after the page title)
        const contentHeader = document.querySelector('.md-content h1');
        if (contentHeader) {
            contentHeader.parentNode.insertBefore(actionsContainer, contentHeader.nextSibling);
        } else {
            // Fallback: insert at beginning of content
            const content = document.querySelector('.md-content__inner');
            if (content && content.firstChild) {
                content.insertBefore(actionsContainer, content.firstChild);
            }
        }
    }
    
    // Create copy markdown button
    const copyButton = document.createElement('a');
    copyButton.className = 'copy-markdown-btn md-content__button md-icon';
    copyButton.setAttribute('aria-label', 'Copy page as Markdown for LLMs');
    copyButton.setAttribute('title', 'Copy page as Markdown for LLMs');
    copyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
        </svg>
        <span class="copy-btn-text">Copy page</span>
    `;
    
    // Add click handler
    copyButton.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const markdownContent = extractMarkdownContent();
            await navigator.clipboard.writeText(markdownContent);
            
            // Show success feedback
            copyButton.style.color = '#4caf50';
            setTimeout(() => {
                copyButton.style.color = '';
            }, 1000);
            
        } catch (err) {
            console.error('Failed to copy markdown:', err);
            // Show error feedback
            copyButton.style.color = '#f44336';
            setTimeout(() => {
                copyButton.style.color = '';
            }, 1000);
        }
    });
    
    // Insert button into actions container
    if (actionsContainer) {
        actionsContainer.appendChild(copyButton);
    }
}

function extractMarkdownContent() {
    const title = document.querySelector('.md-content h1')?.textContent || document.title;
    const content = document.querySelector('.md-content__inner');
    
    if (!content) return '';
    
    let markdown = `# ${title}\n\n`;
    
    // Extract main content, excluding navigation and other UI elements
    const contentElements = content.querySelectorAll('h1, h2, h3, h4, h5, h6, p, pre, ul, ol, table, blockquote');
    
    contentElements.forEach(element => {
        const tagName = element.tagName.toLowerCase();
        const text = element.textContent.trim();
        
        if (!text) return;
        
        switch (tagName) {
            case 'h1':
                markdown += `# ${text}\n\n`;
                break;
            case 'h2':
                markdown += `## ${text}\n\n`;
                break;
            case 'h3':
                markdown += `### ${text}\n\n`;
                break;
            case 'h4':
                markdown += `#### ${text}\n\n`;
                break;
            case 'h5':
                markdown += `##### ${text}\n\n`;
                break;
            case 'h6':
                markdown += `###### ${text}\n\n`;
                break;
            case 'p':
                markdown += `${text}\n\n`;
                break;
            case 'pre':
                const codeContent = element.querySelector('code')?.textContent || text;
                const language = element.querySelector('code')?.className?.match(/language-(\w+)/)?.[1] || '';
                markdown += `\`\`\`${language}\n${codeContent}\n\`\`\`\n\n`;
                break;
            case 'ul':
                const ulItems = element.querySelectorAll('li');
                ulItems.forEach(li => {
                    markdown += `- ${li.textContent.trim()}\n`;
                });
                markdown += '\n';
                break;
            case 'ol':
                const olItems = element.querySelectorAll('li');
                olItems.forEach((li, index) => {
                    markdown += `${index + 1}. ${li.textContent.trim()}\n`;
                });
                markdown += '\n';
                break;
            case 'table':
                // Basic table extraction
                const rows = element.querySelectorAll('tr');
                rows.forEach((row, rowIndex) => {
                    const cells = row.querySelectorAll('td, th');
                    const cellTexts = Array.from(cells).map(cell => cell.textContent.trim());
                    markdown += `| ${cellTexts.join(' | ')} |\n`;
                    
                    // Add header separator
                    if (rowIndex === 0 && row.querySelector('th')) {
                        markdown += `| ${cellTexts.map(() => '---').join(' | ')} |\n`;
                    }
                });
                markdown += '\n';
                break;
            case 'blockquote':
                const lines = text.split('\n');
                lines.forEach(line => {
                    if (line.trim()) markdown += `> ${line}\n`;
                });
                markdown += '\n';
                break;
        }
    });
    
    return markdown;
}
/* ------------------------------------------------------------------
 * Sidebar nav collapse-state persistence
 *
 * Material re-renders the sidebar from scratch on every page load, so any
 * section the reader collapsed springs back open when they navigate. There is
 * no built-in setting for this (`navigation.expand` is the opposite knob), so
 * we remember which sections are open and reapply it.
 *
 * Keys are Material's positional toggle ids (`__nav_2_1_8`), which are stable
 * across pages but NOT across nav-tree edits — so state is fingerprinted
 * against the tree and dropped when the tree changes.
 * ------------------------------------------------------------------ */

const NAV_STATE_KEY = "uipath-sdk-docs.nav-open";
// Swap to localStorage to persist across tabs and future visits.
const navStore = () => window.sessionStorage;

function navToggles() {
    return document.querySelectorAll('.md-nav__toggle[id^="__nav"]');
}

// Cheap fingerprint of the nav tree: ids + labels. Any structural edit
// invalidates saved state rather than reopening the wrong sections.
function navSignature() {
    let hash = 5381;
    for (const toggle of navToggles()) {
        const label = document.querySelector(`label[for="${CSS.escape(toggle.id)}"]`);
        const text = label ? label.textContent.trim().split("\n")[0].trim() : "";
        for (const ch of `${toggle.id}:${text}|`) {
            hash = ((hash << 5) + hash + ch.charCodeAt(0)) | 0;
        }
    }
    return hash;
}

function readNavState() {
    try {
        const raw = navStore().getItem(NAV_STATE_KEY);
        if (!raw) return null;
        const saved = JSON.parse(raw);
        if (!saved || !Array.isArray(saved.open)) return null;
        if (saved.sig !== navSignature()) return null; // nav tree changed
        return new Set(saved.open);
    } catch (error) {
        // Storage blocked (private mode) or corrupt — fall back to defaults.
        console.warn(error);
        return null;
    }
}

// Only sections the reader *explicitly* opened are remembered. Sections that
// Material opens on its own because they contain the current page are handled
// by the pin below instead — otherwise every section you ever browsed through
// would accumulate as permanently open, recreating the fully-expanded sidebar.
function updateNavState(toggle) {
    const open = readNavState() ?? new Set();
    if (toggle.checked) {
        open.add(toggle.id);
    } else {
        open.delete(toggle.id);
    }
    try {
        navStore().setItem(
            NAV_STATE_KEY,
            JSON.stringify({ sig: navSignature(), open: [...open] })
        );
    } catch (error) {
        // Storage unavailable or full — fall back to default behaviour.
        console.warn(error);
    }
}

// Sections that must stay open regardless of saved state: the ancestors of the
// current page, otherwise the reader cannot see where they are.
function activeAncestorIds() {
    const ids = new Set();
    const active = document.querySelectorAll(
        ".md-nav--primary .md-nav__link--active"
    );
    for (const link of active) {
        if (link.closest(".md-nav--secondary")) continue; // table of contents
        let item = link.closest(".md-nav__item--nested");
        while (item) {
            const toggle = item.querySelector(
                ':scope > input.md-nav__toggle[id^="__nav"]'
            );
            if (toggle) ids.add(toggle.id);
            item = item.parentElement
                ? item.parentElement.closest(".md-nav__item--nested")
                : null;
        }
    }
    return ids;
}

function restoreNavState() {
    const saved = readNavState();
    if (!saved) return; // nothing stored yet — leave server-rendered state alone

    const pinned = activeAncestorIds();
    const root = document.documentElement;

    // Suppress the expand/collapse animation while we reconcile.
    root.setAttribute("data-md-nav-restoring", "");
    for (const toggle of navToggles()) {
        const shouldBeOpen = pinned.has(toggle.id) || saved.has(toggle.id);
        if (toggle.checked !== shouldBeOpen) toggle.checked = shouldBeOpen;
    }
    requestAnimationFrame(() =>
        requestAnimationFrame(() => root.removeAttribute("data-md-nav-restoring"))
    );
}

// Delegated so it survives Material swapping the nav out.
document.addEventListener("change", (event) => {
    const toggle = event.target;
    if (
        toggle instanceof HTMLInputElement &&
        toggle.classList.contains("md-nav__toggle") &&
        toggle.id.startsWith("__nav")
    ) {
        updateNavState(toggle);
    }
});

// Run immediately (the nav is already parsed by the time this script executes)
// to keep the reflow within the same frame, then again per page render in case
// instant navigation is ever enabled.
restoreNavState();
document$.subscribe(restoreNavState);
