# Crochet Scheme Editor

Browser-based vector editor for crochet diagrams.

## MVP 0.2

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

## Engineering baseline

Geometry and snapping are implemented as pure modules outside the React UI. The snapping engine has unit coverage for candidate generation, anchor alignment, screen-space tolerance, orientation modes, self-exclusion and hysteresis.

Every pull request runs strict TypeScript checks (including Vite client/CSS imports), unit tests and the Vite production build.

## Local development

```bash
npm install
npm run dev
```

Verification commands:

```bash
npm run typecheck
npm test
npm run build
```

## GitHub Pages

GitHub Pages is configured to use **GitHub Actions** as its publishing source.

Every push to `main` triggers `.github/workflows/deploy-pages.yml`.

Published URL:

https://hosttik.github.io/Crochet-Scheme-Editor/

The Vite production base path is `/Crochet-Scheme-Editor/`.

## Architecture

The document model, stitch definitions, geometry engine, snapping engine and SVG renderer are separate concepts. The SVG DOM is a rendering layer rather than the source of truth. Stitch instances are represented semantically by symbol ID, position and rotation, which leaves room for radial guides, advanced snapping, pattern automation and AI-generated operations later.

## Next technical milestones

1. Add custom arc, rectangular grid and radial grid guides.
2. Expand the stitch symbol library to the full target notation set.
3. Add multi-select, copy/paste and better rotation handles.
4. Add project schema validation and migrations.
5. Add PDF export.
