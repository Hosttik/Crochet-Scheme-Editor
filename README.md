# Crochet Scheme Editor

Browser-based semantic editor for crochet charts and written patterns.

## v1.2

The editor combines an SVG canvas with a document model that understands guides, parametric rows and crochet row shaping.

### Editing

- 8 vector crochet symbols
- free placement, multi-select, marquee selection and group move
- rotation handles, copy/paste/duplicate and layer ordering
- hide/lock elements
- zoom around pointer, pan, Fit All and Fit Selection
- collapsible left and right sidebars
- document-wide Undo / Redo

### Guides and snapping

- Arc, Rectangular Grid and Radial Grid guides
- direct manipulation of guide center/radius/rotation
- shared screen-space snapping engine with hysteresis
- Top / Center / Bottom anchors
- along/tangent and perpendicular/radial orientation modes

### Semantic crochet rows

- generate rows along Arc or Radial guides
- live preview before generation
- parametric rows remain linked to guides
- ordered pattern rows with parent-row relationships
- evenly distributed increases and decreases
- quick next-row actions and +6 sequences
- canvas shaping markers
- generated RU/EN written instructions
- TXT and Markdown pattern export

### Persistence and export

- project JSON schema v6; v1-v5 remain loadable through runtime validation/migration
- local multi-project storage in IndexedDB
- automatic migration of the legacy single autosave into the first local project
- autosave per active project
- JSON and SVG export
- GitHub Pages deployment from `main`

## Engineering baseline

Core geometry, snapping, guide manipulation, selection, row generation, shaping, project validation, history and written-pattern generation live in pure modules outside the React rendering layer.

Every pull request runs:

- strict TypeScript
- Vitest unit tests
- Vite production build
- Playwright Chromium E2E smoke flow
- public GitHub Pages endpoint smoke check

## Local development

```bash
npm install
npm run dev
```

Verification:

```bash
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## GitHub Pages

Published URL:

https://hosttik.github.io/Crochet-Scheme-Editor/

The Vite production base path is `/Crochet-Scheme-Editor/`.

## Architecture

The SVG DOM is a rendering layer, not the source of truth. The current architecture separates:

- document model and runtime schema migration
- stitch definitions
- guide geometry and manipulation
- snapping
- selection and viewport geometry
- parametric crochet rows and shaping semantics
- generated written instructions
- local persistence
- rendering and React UI

The next major domain milestone is stitch topology: explicit parent-stitch → child-stitch relationships between adjacent rows. That will enable exact non-uniform increases/decreases, mixed repeats, connection visualization and stronger pattern validation.
