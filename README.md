# Crochet Scheme Editor

Browser-based semantic editor for crochet charts and written patterns.

## v1.4

The editor combines an SVG canvas with a document model that understands guides, parametric rows, crochet row shaping and editable stitch-to-stitch topology between adjacent rows.

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
- explicit parent-stitch → child-stitch topology
- 1→1 normal stitches, 1→2 increases and 2→1 decreases
- topology connection lines for the selected child row
- click a +/− marker and move that increase/decrease to a neighboring parent stitch
- reset manual topology back to evenly distributed positions
- manual topology keeps row count and geometry unchanged and participates in Undo/Redo + autosave
- written RU/EN instructions list exact manual increase positions or decrease pairs
- TXT and Markdown pattern export

### Persistence and export

- project JSON schema v8; v1-v7 remain loadable through runtime validation/migration
- topology parent ids and manual topology overrides are persisted and validated
- local multi-project storage in IndexedDB
- automatic migration of the legacy single autosave into the first local project
- autosave per active project
- JSON and SVG export
- GitHub Pages deployment from `main`

## Engineering baseline

Core geometry, snapping, guide manipulation, selection, row generation, shaping, stitch topology, project validation, history and written-pattern generation live in pure modules outside the React rendering layer.

Every pull request runs:

- strict TypeScript
- Vitest unit tests
- Vite production build
- Playwright Chromium E2E flows
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
- explicit and editable stitch topology
- generated written instructions
- local persistence
- rendering and React UI

The next domain milestone is mixed row semantics: multiple stitch types and operations inside one row, richer repeat groups, and validation that compares the written pattern with the actual topology graph.
