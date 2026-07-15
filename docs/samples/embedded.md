---
hide:
  - toc
title: Sample Gallery
---

<style>
/* Option A — themed embed: keep the docs header + left nav, widen the content
   column, and let the gallery (in ?embed=1 mode, no hero) sit inside it. */
.md-content { max-width: 100%; }
.md-content__inner { max-width: 100%; }
.md-main__inner { max-width: 100%; }
.md-grid { max-width: 100%; }
.gallery-embed {
  display: block; width: 100%; height: calc(100vh - 4rem);
  border: 1px solid var(--md-default-fg-color--lightest); border-radius: 10px;
}
</style>

# Sample Gallery

Browse, filter, and clone the official `@uipath/uipath-typescript` sample apps. Each card links to the source and copies a ready-to-run `degit` command.

<iframe class="gallery-embed" src="../gallery/index.html?embed=1" title="UiPath TypeScript SDK Sample Gallery" loading="lazy"></iframe>
