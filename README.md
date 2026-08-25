# Crochet Scheme Editor

Browser-based semantic editor for crochet charts and written patterns.

## v1.8

The editor combines an SVG canvas with a document model that understands guides, parametric rows, crochet row shaping, editable stitch-to-stitch topology, mixed/rich rapports and how each row is physically constructed. v1.8 adds productivity tools for building repeated motifs much faster.

### Editing and productivity

- 8 vector crochet symbols
- free placement, multi-select, marquee selection and group move
- permanent manual groups: group / ungroup, click one member to select the motif, Alt+click to select a single stitch inside it
- mirror a manual selection left/right or top/bottom while preserving the group's geometry and correcting stitch rotations
- Repeat tool with three modes:
  - Linear: create N motif copies with ΔX / ΔY
  - Circular: rotate copies around the center of a selected Arc, Grid or Radial Grid guide
  - Along guide: walk copies along Arc, Grid or Radial Grid geometry using path spacing and Keep / Tangent / Radial orientation
- repeated Ctrl/Cmd+D acts as repeat-last-transform: duplicate once, move/rotate the duplicate, then press Ctrl/Cmd+D again to repeat the same per-stitch translation and rotation delta
- repeated motif copies are grouped independently so every generated copy can immediately be moved as one object
- rotation handles, copy/paste/duplicate and layer ordering
- hide/lock elements
- zoom around pointer, pan, Fit All and Fit Selection
- collapsible left and right sidebars
- Undo / Redo for document geometry and guide changes

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
- quick next-row actions and +6 sequences for classic shaping rows
- explicit parent-stitch → child-stitch topology
- 1→1 normal stitches, 1→2 increases and 2→1 decreases
- topology connection lines for the selected child row
- click a +/− marker and move classic shaping changes to neighboring parent stitches
- mixed row rapports such as `3 SC, 1 CH, 1 DC`, repeated across the actual row count
- rich semantic rapports where `stitch`, `increase` and `decrease` are explicit AST operations
- one nested repeat-group level plus a root repeat, e.g. `[(2 SC, increase) × 3, 2 CH] × 4`
- the rich rapport compiler produces both child stitch types and exact parent-group topology from the same source

### Row construction semantics

- each parametric row may be marked as `spiral`, `joined round` or `turning row`
- construction direction is stored independently as along-guide or reverse-guide
- turning rows automatically alternate direction when the next row is generated
- joined/spiral rows preserve their direction across generated child rows
- joined and turning rows can store an auxiliary starting-chain count
- joined rounds may explicitly end with a slip-stitch join
- starting chains are deliberately auxiliary: they do not silently change row stitch totals or parent-child topology
- the selected row shows S/E markers, direction, turning/closure hints and starting-chain metadata on the SVG canvas
- written RU/EN instructions include starting chains, spiral/joined/turning semantics, direction and slip-stitch closure
- Markdown abbreviation legends include CH/ВП and SL ST/СС when construction semantics use them

### Persistence and export

- project JSON schema v12; v1-v11 remain loadable through runtime validation/migration
- manual group ids, topology parent ids, manual topology overrides, mixed/rich row programs and row construction semantics are persisted and validated
- rich programs are mutually exclusive with legacy shaping/sequence topology to avoid conflicting sources of truth
- local multi-project storage in IndexedDB
- automatic migration of the legacy single autosave into the first local project
- autosave per active project
- project renames update the local project selector immediately and persist through autosave
- JSON and SVG export
- SVG export currently serializes visible stitch glyphs only; guides and editor-only topology/construction overlays are not exported
- TXT and Markdown written-pattern export
- GitHub Pages deployment from `main`

## Engineering baseline

Core geometry, snapping, guide manipulation, selection, productivity transforms, row generation, shaping, row construction, row-sequence expansion, rich rapport compilation, stitch topology, project validation, history and written-pattern generation live in pure modules outside the React rendering layer.

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
- permanent manual grouping and productivity transforms
- parametric crochet rows and classic shaping semantics
- cyclic mixed-row rapport semantics
- rich rapport AST compilation into composition + topology
- row construction and work-direction semantics
- explicit and editable stitch topology
- generated written instructions
- local persistence
- rendering and React UI

The next domain milestone remains counted row-boundary semantics: turning/start chains that may count as the first stitch, skipped first stitches, explicit row start/end attachment and more exact joined-round closure behavior. Further productivity work can build on v1.8 with reusable linked motifs and local offsets inside parametric rows.
