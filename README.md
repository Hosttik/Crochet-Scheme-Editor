# Crochet Scheme Editor

Browser-based semantic editor for crochet charts and written patterns.

## v1.11

The editor combines an SVG canvas with a document model that understands guides, parametric rows, crochet row shaping, editable stitch-to-stitch topology, mixed/rich rapports and how each row is physically constructed. v1.11 adds continuous path guides and persistent manual stitch-to-guide attachment while keeping one-shot snapping and long-lived document relationships as separate concepts.

### Editing and productivity

- 8 vector crochet symbols shared by palette, canvas, Repeat preview and SVG export
- core notation uses `ch`, `sl st`, `sc`, `hdc`, `dc`, `tr` and `p` abbreviations; SC is an upright `+`, HDC/DC/TR use perpendicular top bars, and Magic Ring is a simple circle
- free placement, multi-select, marquee selection and group move
- larger invisible SVG hit targets make thin stitches easier to select without changing their printed appearance
- Smart Place/Select: clicking or dragging an existing stitch while a placement tool is active selects/grabs that stitch instead of placing an accidental duplicate
- `Esc` returns to Select; clicking the currently active palette stitch again also cancels placement
- `Space + drag` temporarily activates the hand/pan interaction; middle-mouse panning remains available
- arrow keys nudge the current manual selection by 1 document unit; `Shift+Arrow` nudges by 10
- keyboard zoom/navigation: `+`, `-`, `0` for 100%, `F` for Fit All and `Shift+F` for Fit Selection
- contextual floating selection toolbar provides duplicate, group/ungroup, Flip, Mirrored Copy, rotate and delete next to the selected motif
- permanent manual groups: group / ungroup, click one member to select the motif, Alt+click to select a single stitch inside it
- per-element visual colors with quick presets, native custom color picker and reset-to-default
- color applies to a single stitch, multi-selection, a manual group or an entire selected parametric row; Alt+click inside a group still allows coloring one member independently
- Flip mirrors the current manual selection around an axis through its own center; Mirrored Copy creates a separate adjacent reflected object; Rotate 180° remains a separate transform
- Repeat tool with three modes and live preview before creation:
  - Linear: create N motif copies with ΔX / ΔY
  - Circular: rotate copies around the selection center by default, or optionally around a guide center
  - Along guide: walk copies along Arc, Line, Curve, Grid or Radial Grid geometry using path spacing and orientation controls
- Repeat ghost preview is shown for one stitch or one complete manual group; temporary multi-selection is explained as a temporary motif and does not render ghosts
- Repeat numeric fields allow an empty intermediate edit state, so values can be fully erased before typing a replacement
- repeated Ctrl/Cmd+D acts as repeat-last-transform: duplicate once, move/rotate the duplicate, then press Ctrl/Cmd+D again to repeat the same per-stitch translation and rotation delta
- repeated motif copies are grouped independently so every generated copy can immediately be moved as one object
- Duplicate, paste, Repeat and Mirrored Copy preserve element colors
- Duplicate, Repeat, Flip and Mirrored Copy intentionally detach generated/manual transformed copies from persistent path attachments so copies do not jump back to an original guide later
- semantic Layers tree is moved after the stitch library and collapsed by default; it still collapses parametric rows and manual groups
- palette captions are visually hidden to save space; full names and abbreviations remain available through hover/focus labels
- rotation handles, copy/paste/duplicate and layer ordering
- hide/lock elements
- collapsible left and right sidebars
- Undo / Redo for document geometry and guide changes

### Guides, snapping and persistent attachment

- Arc, Line, cubic Bezier Curve, Rectangular Grid and Radial Grid guides
- Line exposes independent start/end handles
- Curve exposes start/end plus two Bezier control-point handles
- continuous path guides can be moved directly on the canvas; Arc keeps radius editing and grids keep their specialized controls
- hold `Shift` while rotating a rectangular grid to snap the angle to 15° increments
- shared screen-space snapping engine with hysteresis
- snapping is visible in the canvas toolbar; `S` switches between Snap and Free placement
- Top / Center / Bottom snap anchors
- along/tangent and perpendicular/radial snap orientation modes
- manual stitches can be persistently attached to Arc, Line or Curve independently of one-shot snapping
- an attachment stores normalized path position `t`, Keep/Tangent/Perpendicular orientation, normal path offset and rotation offset
- attached stitches follow guide edits and can slide along their path when dragged or nudged
- attachment survives autosave/JSON reload and can be explicitly detached
- Grid and Radial Grid remain snap/grid primitives for now; persistent attachment is intentionally limited to continuous paths until row/column/ring/sector addressing is modeled explicitly

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

- project JSON schema is v14; v1-v13 remain loadable through runtime validation/migration
- schema v13 introduced optional six-digit hex visual color per stitch; default black is omitted from storage
- schema v14 adds Line/Curve guide persistence and optional manual `guideAttachment` metadata
- manual group ids, topology parent ids, manual topology overrides, mixed/rich row programs, row construction semantics and generated-offset baselines are persisted and validated
- local multi-project storage in IndexedDB
- automatic migration of the legacy single autosave into the first local project
- autosave per active project
- project renames update the local project selector immediately and persist through autosave
- JSON and SVG export
- SVG export serializes each visible stitch using its actual element color and the same corrected vector glyph used in the editor
- visual colors are presentation metadata; they do not yet generate yarn/color-change instructions in written patterns
- GitHub Pages deployment from `main`

## Engineering baseline

Core geometry, snapping, continuous path evaluation, guide attachment, guide manipulation, selection, productivity transforms, row generation, shaping, row construction, row-sequence expansion, rich rapport compilation, stitch topology, project validation, history and written-pattern generation live in pure modules outside the React rendering layer.

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
- continuous path geometry and persistent guide attachment
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

Next larger product milestones are crochet-native row-boundary semantics (counted turning/start chains, skipped first stitches and exact joined-round closure), row-number annotations/legend generation, and document output features such as image underlays, tiled printing and free-form lasso selection. A future color-domain milestone could turn visual colors into explicit yarn/color-change semantics, but only after defining row-boundary behavior clearly.
