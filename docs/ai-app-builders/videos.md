---
title: AI App Builders Video Gallery
hide:
  - toc
---

# AI App Builders Video Gallery

The four builder walkthroughs each build the same app — an IT ticketing portal backed by a Data Fabric entity — starting from a plain-language prompt and ending with the app live on a UiPath tenant. Only the builder changes: the UiPath Coded Apps skill, the SDK and the deploy pipeline are identical every time. The Codex clip is a short overview of the UiPath Sites plugin rather than a full build.

<div class="vg">

  <a class="vg-card" href="../lovable/#watch-the-walkthrough">
    <span class="vg-thumb vg-lovable">
      <span class="vg-play" aria-hidden="true"></span>
      <span class="vg-dur">8:45</span>
    </span>
    <span class="vg-body">
      <span class="vg-head"><span class="vg-mono" style="background:#ff4d84">Lv</span><span class="vg-title">Lovable</span></span>
      <span class="vg-desc">Importing the skill as a workspace skill, answering Lovable's setup questions, then deploying from Lovable Cloud.</span>
      <span class="vg-cta">Watch and read the guide</span>
    </span>
  </a>

  <a class="vg-card" href="../replit/#watch-the-walkthrough">
    <span class="vg-thumb vg-replit">
      <span class="vg-play" aria-hidden="true"></span>
      <span class="vg-dur">6:37</span>
    </span>
    <span class="vg-body">
      <span class="vg-head"><span class="vg-mono" style="background:#e8632b">Re</span><span class="vg-title">Replit</span></span>
      <span class="vg-desc">Loading the skill from a link, storing credentials in Replit Secrets, then deploying from the shell.</span>
      <span class="vg-cta">Watch and read the guide</span>
    </span>
  </a>

  <a class="vg-card" href="../vercel/#watch-the-walkthrough">
    <span class="vg-thumb vg-vercel">
      <span class="vg-play" aria-hidden="true"></span>
      <span class="vg-dur">6:25</span>
    </span>
    <span class="vg-body">
      <span class="vg-head"><span class="vg-mono" style="background:#111">&#9650;</span><span class="vg-title">Vercel (v0)</span></span>
      <span class="vg-desc">Picking the skill from v0's marketplace, adding credentials as environment variables, then deploying from the chat.</span>
      <span class="vg-cta">Watch and read the guide</span>
    </span>
  </a>

  <a class="vg-card" href="../bolt/#watch-the-walkthrough">
    <span class="vg-thumb vg-bolt">
      <span class="vg-play" aria-hidden="true"></span>
      <span class="vg-dur">7:17</span>
    </span>
    <span class="vg-body">
      <span class="vg-head"><span class="vg-mono" style="background:#1a6cf5">Bo</span><span class="vg-title">Bolt</span></span>
      <span class="vg-desc">Adding the skill from Bolt's Skills library, putting credentials in a <code>.env</code>, then deploying inside the WebContainer.</span>
      <span class="vg-cta">Watch and read the guide</span>
    </span>
  </a>

  <a class="vg-card" href="../../plugins/codex/#watch-the-overview">
    <span class="vg-thumb vg-codex">
      <span class="vg-play" aria-hidden="true"></span>
      <span class="vg-dur">0:38</span>
    </span>
    <span class="vg-body">
      <span class="vg-head"><span class="vg-mono" style="background:#0f9d77">Cx</span><span class="vg-title">Codex</span></span>
      <span class="vg-desc">A short overview of the UiPath Sites plugin, which builds and deploys coded apps from Codex with no CLI or skill setup of your own.</span>
      <span class="vg-cta">Watch and read the guide</span>
    </span>
  </a>

</div>

<style>
.md-typeset .vg {
  --vg-hair: var(--md-default-fg-color--lightest);
  --vg-surface: color-mix(in srgb, var(--md-default-fg-color) 3%, var(--md-default-bg-color));
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.2rem;
  margin: 1.6rem 0;
}
.md-typeset .vg-card,
.md-typeset .vg-card:hover {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--vg-hair);
  border-radius: 0.7rem;
  overflow: hidden;
  background: var(--vg-surface);
  color: var(--md-default-fg-color);
  text-decoration: none;
  transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease;
}
.md-typeset .vg-card:hover {
  transform: translateY(-2px);
  border-color: var(--md-typeset-a-color);
  box-shadow: 0 4px 14px rgba(0,0,0,.13);
}
.md-typeset .vg-card:focus-visible { outline: 2px solid var(--md-typeset-a-color); outline-offset: 2px; }

.md-typeset .vg-thumb {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16 / 9;
}
.md-typeset .vg-lovable { background: linear-gradient(135deg,#ff4d84,#ff7a59); }
.md-typeset .vg-replit  { background: linear-gradient(135deg,#e8632b,#f2a33c); }
.md-typeset .vg-vercel  { background: linear-gradient(135deg,#111,#444); }
.md-typeset .vg-bolt    { background: linear-gradient(135deg,#1a6cf5,#12b8ff); }
.md-typeset .vg-codex   { background: linear-gradient(135deg,#0f9d77,#054d3d); }

.md-typeset .vg-play {
  width: 3rem; height: 3rem; border-radius: 50%;
  background: rgba(0,0,0,.5); border: 2px solid rgba(255,255,255,.9);
  display: flex; align-items: center; justify-content: center;
  transition: transform .14s ease, background .14s ease;
}
.md-typeset .vg-play::after {
  content: ""; display: block; margin-left: 0.22rem;
  border-style: solid; border-width: 0.55rem 0 0.55rem 0.9rem;
  border-color: transparent transparent transparent #fff;
}
.md-typeset .vg-card:hover .vg-play { transform: scale(1.08); background: rgba(0,0,0,.68); }

.md-typeset .vg-dur {
  position: absolute; right: 0.6rem; bottom: 0.6rem;
  background: rgba(0,0,0,.72); color: #fff;
  font-size: 0.65rem; font-weight: 600;
  padding: 0.1rem 0.4rem; border-radius: 0.2rem;
}

.md-typeset .vg-body { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.9rem 1rem 1rem; flex: 1; }
.md-typeset .vg-head { display: flex; align-items: center; gap: 0.5rem; }
.md-typeset .vg-mono {
  width: 1.6rem; height: 1.6rem; border-radius: 0.4rem; flex: none;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 0.72rem;
}
.md-typeset .vg-title { font-size: 1rem; font-weight: 600; }
.md-typeset .vg-desc { font-size: 0.76rem; color: var(--md-default-fg-color--light); flex: 1; line-height: 1.55; }
.md-typeset .vg-desc code { font-size: 0.9em; }
.md-typeset .vg-cta { font-size: 0.76rem; font-weight: 600; color: var(--md-typeset-a-color); }
.md-typeset .vg-cta::after { content: " \2192"; }
</style>

## Not using one of these?

Any AI coding tool that can load a skill file can follow the same path. Point it at the [UiPath Coded Apps skill](https://github.com/UiPath/skills/blob/main/skills/uipath-coded-apps/SKILL.md) and describe what you want built. See [Getting Started](getting-started.md) for the parts that are common to every builder.
