# Crochet Scheme Editor

Browser-based vector editor for crochet diagrams.

## MVP 0.3

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
- snap-to-stitch-vertices mode
- orientation modes: keep current, along target/tangent, perpendicular/radial
- sticky snap hysteresis
- custom Arc guides
- custom Rectangular Grid guides
- custom Radial Grid guides
- guide visibility and numeric parameter editing
- guide intersections participate in the same snapping engine as stitches
- document-wide undo / redo for stitches and guides
- save/load project JSON (schema v2; v1 remains loadable)
- vector SVG export with construction guides excluded
- automatic GitHub Pages deployment from `main`

## Guide model

Guides are semantic document objects, not SVG-only decorations:

- `ArcGuide`: center, radius, start/end angle, divisions
- `GridGuide`: origin, rows, columns, X/Y spacing, rotation
- `RadialGridGuide`: center, rings, ring spacing, sectors, start angle

Each guide generates snap candidates. Arc and radial candidates expose tangent orientation, so `Along` follows the curve and `Perpendicular` produces the radial orientation.

## Engineering baseline

Geometry, guide geometry and snapping are implemented as pure modules outside the React UI. Unit tests cover stitch anchors, screen-space tolerance, hysteresis, orientation, arc points, rectangular grid intersections and radial grid intersections.

Every pull request runs strict TypeScript checks, unit tests and the Vite production build. A separate CI smoke check verifies that the public GitHub Pages endpoint remains reachable.

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

The document model, stitch definitions, guide geometry, snapping engine and SVG renderer are separate concepts. The SVG DOM is a rendering layer rather than the source of truth. This leaves room for smart layouts, pattern automation and AI-generated document operations later.

## Next technical milestones

1. Add direct manipulation for guides (drag center/radius/rotation handles).
2. Expand the stitch symbol library to the full target notation set.
3. Add multi-select, copy/paste and better stitch rotation handles.
4. Add explicit runtime project schema validation and migrations.
5. Add PDF export.
