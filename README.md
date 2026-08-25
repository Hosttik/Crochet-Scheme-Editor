# Crochet Scheme Editor

Browser-based semantic editor for crochet charts and written patterns.

## v1.10

The editor combines an SVG canvas with a document model that understands guides, parametric rows, crochet row shaping, editable stitch-to-stitch topology, mixed/rich rapports and how each row is physically constructed. v1.10 adds visual styling without changing crochet instruction semantics: stitches can carry independent colors, while Repeat preview follows semantic selection boundaries instead of raw selection count.

### Editing and productivity

- 8 vector crochet symbols
- free placement, multi-select, marquee selection and group move
- Smart Place/Select: clicking or dragging an existing stitch while a placement tool is active selects/grabs that stitch instead of placing an accidental duplicate
- mode-aware canvas cursors distinguish placement, selection and panning
- contextual floating selection toolbar provides duplicate, group/ungroup, mirror, rotate and delete next to the selected motif
- permanent manual groups: group / ungroup, click one member to select the motif, Alt+click to select a single stitch inside it
- per-element visual colors with quick presets, native custom color picker and reset-to-default
- color applies to a single stitch, multi-selection, a manual group or an entire selected parametric row; Alt+click inside a group still allows coloring one member independently
- mirror a manual selection left/right or top/bottom while preserving the group's geometry and correcting stitch rotations
- Repeat tool with three modes and live preview before creation:
  - Linear: create N motif copies with ΔX / ΔY
  - Circular: rotate copies around the selection center by default, or optionally around an Arc, Grid or Radial Grid center
  - Along guide: walk copies along Arc, Grid or Radial Grid geometry using path spacing and Keep / Tangent / Radial orientation
- Repeat ghost preview is shown for one stitch or one complete manual group; a group is treated as one composite object and previews the whole motif, while temporary multi-selection or several groups do not render ghosts
- repeated Ctrl/Cmd+D acts as repeat-last-transform: duplicate once, move/rotate the duplicate, then press Ctrl/Cmd+D again to repeat the same per-stitch translation and rotation delta
- repeated motif copies are grouped independently so every generated copy can immediately be moved as one object
- Duplicate, paste and Repeat preserve element colors
- Productivity controls are contextual and only appear for compatible manual selections
- semantic Layers tree collapses parametric rows and manual groups instead of presenting every stitch as a permanently flat list
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
- the row editor uses progressive disclosure: common stitch/count/shaping/orientation controls stay visible, while rapport, construction, distribution mode and precise offsets live under Advanced settings
- generated child-row offsets remain structural; a manually changed offset reopens Advanced after reload
- parametric-row regeneration preserves existing per-stitch colors; when a uniformly colored row grows, newly generated stitches inherit that row color

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

- project JSON schema is v13; v1-v12 remain loadable through runtime validation/migration
- schema v13 adds optional six-digit hex color per stitch; default black is omitted from storage
- manual group ids, topology parent ids, manual topology overrides, mixed/rich row programs, row construction semantics and generated-offset baselines are persisted and validated
- rich programs are mutually exclusive with legacy shaping/sequence topology to avoid conflicting sources of truth
- local multi-project storage in IndexedDB
- automatic migration of the legacy single autosave into the first local project
- autosave per active project
- project renames update the local project selector immediately and persist through autosave
- JSON and SVG export
- SVG export serializes each visible stitch using its actual element color; guides and editor-only topology/construction overlays are not exported
- TXT and Markdown written-pattern export
- visual colors are deliberately presentation metadata in v1.10; they do not yet generate yarn/color-change instructions in written patterns
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
- stitch definitions and visual styling
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

The next usability candidates are keyboard nudge, align/distribute, reusable linked motifs and local offsets inside parametric rows. A future color-domain milestone could turn visual colors into explicit yarn/color-change semantics, but only after defining row-boundary behavior clearly. The next core domain milestone remains counted row-boundary semantics: turning/start chains that may count as the first stitch, skipped first stitches, explicit row start/end attachment and more exact joined-round closure behavior.
