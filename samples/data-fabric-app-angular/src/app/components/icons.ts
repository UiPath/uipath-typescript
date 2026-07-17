import { Component } from '@angular/core'

/**
 * Minimal inline icon set (Lucide path data) — the Angular counterpart of
 * the React sample's `lucide-react` imports. Each icon is a tiny standalone
 * component rendering a 16×16 stroke SVG that inherits `currentColor`.
 */

const HOST_STYLE = `
  :host { display: inline-flex; align-items: center; justify-content: center; }
  svg { width: 1em; height: 1em; }
`

const SVG_ATTRS = `xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`

@Component({
  selector: 'icon-database',
  styles: HOST_STYLE,
  template: `<svg ${SVG_ATTRS}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>`,
})
export class IconDatabase {}

@Component({
  selector: 'icon-list-checks',
  styles: HOST_STYLE,
  template: `<svg ${SVG_ATTRS}><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>`,
})
export class IconListChecks {}

@Component({
  selector: 'icon-refresh',
  styles: HOST_STYLE,
  template: `<svg ${SVG_ATTRS}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,
})
export class IconRefresh {}

@Component({
  selector: 'icon-search',
  styles: HOST_STYLE,
  template: `<svg ${SVG_ATTRS}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
})
export class IconSearch {}

@Component({
  selector: 'icon-x',
  styles: HOST_STYLE,
  template: `<svg ${SVG_ATTRS}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
})
export class IconX {}

@Component({
  selector: 'icon-chevron-down',
  styles: HOST_STYLE,
  template: `<svg ${SVG_ATTRS}><path d="m6 9 6 6 6-6"/></svg>`,
})
export class IconChevronDown {}

@Component({
  selector: 'icon-chevron-left',
  styles: HOST_STYLE,
  template: `<svg ${SVG_ATTRS}><path d="m15 18-6-6 6-6"/></svg>`,
})
export class IconChevronLeft {}

@Component({
  selector: 'icon-chevron-right',
  styles: HOST_STYLE,
  template: `<svg ${SVG_ATTRS}><path d="m9 18 6-6-6-6"/></svg>`,
})
export class IconChevronRight {}

@Component({
  selector: 'icon-log-out',
  styles: HOST_STYLE,
  template: `<svg ${SVG_ATTRS}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>`,
})
export class IconLogOut {}

@Component({
  selector: 'icon-sun',
  styles: HOST_STYLE,
  template: `<svg ${SVG_ATTRS}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
})
export class IconSun {}

@Component({
  selector: 'icon-moon',
  styles: HOST_STYLE,
  template: `<svg ${SVG_ATTRS}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
})
export class IconMoon {}

@Component({
  selector: 'icon-download',
  styles: HOST_STYLE,
  template: `<svg ${SVG_ATTRS}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>`,
})
export class IconDownload {}

@Component({
  selector: 'icon-plus',
  styles: HOST_STYLE,
  template: `<svg ${SVG_ATTRS}><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
})
export class IconPlus {}

@Component({
  selector: 'icon-pencil',
  styles: HOST_STYLE,
  template: `<svg ${SVG_ATTRS}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
})
export class IconPencil {}

@Component({
  selector: 'icon-trash',
  styles: HOST_STYLE,
  template: `<svg ${SVG_ATTRS}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
})
export class IconTrash {}
