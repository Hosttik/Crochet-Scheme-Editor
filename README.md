# Crochet Scheme Editor

Browser-based vector editor for crochet diagrams.

## MVP 0.1

Current functionality:

- React + TypeScript + Vite
- SVG-based editor canvas
- 8 vector crochet symbols
- free stitch placement
- select, drag and delete
- ±15° manual rotation
- zoom around pointer
- Space + drag / middle mouse pan
- snapping with Top / Center / Bottom source anchors
- snap-to-vertices mode
- orientation modes: keep current, along target, perpendicular
- sticky snap hysteresis
- undo / redo
- save/load project JSON
- vector SVG export
- automatic GitHub Pages deployment from `main`

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## GitHub Pages

Every push to `main` triggers `.github/workflows/deploy-pages.yml`.

Expected URL:

https://hosttik.github.io/Crochet-Scheme-Editor/

The Vite production base path is `/Crochet-Scheme-Editor/`.

> GitHub Pages from a private repository requires a GitHub plan that supports private-repository Pages. The published Pages site is normally public even when the source repository is private.

## Architecture

The document model, stitch definitions and SVG renderer are separate concepts. The SVG DOM is a rendering layer rather than the source of truth. Stitch instances are represented semantically by symbol ID, position and rotation, which leaves room for radial guides, advanced snapping, pattern automation and AI-generated operations later.

## Next technical milestones

1. Extract geometry and snapping from `App.tsx` into pure modules.
2. Restore strict typecheck as a required CI step.
3. Add custom arc, rectangular grid and radial grid guides.
4. Expand the stitch symbol library to the full target notation set.
5. Add multi-select, copy/paste and better rotation handles.
6. Add PDF export.
