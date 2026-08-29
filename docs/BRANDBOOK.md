# Crochet Scheme Editor — UI v2 Brandbook

Status: **implementation baseline**

This document defines the visual language and interaction rules for the desktop crochet-scheme editor. It is intentionally product-oriented rather than marketing-oriented: the editor canvas is the product, and chrome must stay quiet, compact and predictable.

## 1. Product character

The interface should feel:

- precise, technical and calm;
- familiar to users of Figma / Illustrator / Photoshop-class editors;
- dense enough for expert work without becoming visually noisy;
- neutral around the canvas so crochet symbols and guides remain the visual focus;
- explicit about state: selected tool, selected stitch, locked object, guide attachment, snapping and preview must always be obvious.

Avoid decorative UI, oversized cards, large empty paddings and novelty interactions.

## 2. UX principles

### Canvas first

The canvas gets the majority of usable space. Panels are tools around it, not the primary content.

### Context over duplication

Global commands live in the application menu / top command bar. Object-specific properties live in the right inspector. The floating selection toolbar only contains the highest-frequency direct actions.

### One predictable home for each action

- document operations: top menu / command bar;
- tools: left tool rail;
- crochet symbols: left library;
- selected object properties: right inspector;
- layer visibility / locking / ordering: right Layers tab;
- global secondary configuration: inspector accordions or explicit menu commands;
- canvas zoom / snapping status: canvas toolbar and bottom status bar.

### Preserve expert shortcuts

Keyboard behavior should follow mainstream editor conventions where possible. Visible shortcuts are hints, not a substitute for direct manipulation.

### No dead UI

A control must not be shown before it performs a real action. During migration, old functional controls are preferable to new decorative placeholders.

## 3. Desktop layout

Target desktop shell:

1. **Application menu** — thin row: File, Edit, View, Settings, Help.
2. **Command bar** — document actions, undo/redo, zoom, grid/guides, search/command access, autosave state and favorites.
3. **Left tool rail** — Select, Hand, selection modes, Guides flyout, Ruler and other creation tools.
4. **Left library panel** — crochet elements, search, favorites, categories. Collapsible.
5. **Canvas** — dominant center surface.
6. **Right inspector** — contextual object / guide properties.
7. **Right Layers tab** — visibility, locking, semantic grouping and ordering.
8. **Bottom status bar** — zoom, snapping state, counts and short feedback.

Nominal dimensions:

- command/menu chrome: 44–56 px per row;
- tool rail: 44 px;
- left library: 248–288 px;
- right inspector: 300–340 px;
- status bar: 28–32 px;
- minimum hit area: 28 px, preferred 32 px, pointer-sensitive canvas handles may use larger invisible hit targets.

## 4. Color system

The UI uses a neutral cold-gray shell with a single blue interaction accent. Crochet geometry remains black by default.

### Core tokens

| Token | Value | Use |
|---|---:|---|
| `--ui-bg-app` | `#eef2f7` | application background |
| `--ui-bg-canvas` | `#f5f7fa` | workspace around paper |
| `--ui-surface` | `#ffffff` | panels, menus, controls |
| `--ui-surface-subtle` | `#f8fafc` | grouped / secondary areas |
| `--ui-surface-hover` | `#f3f6fa` | neutral hover |
| `--ui-border` | `#d9e0e8` | standard border |
| `--ui-border-strong` | `#c7d0dc` | stronger separators |
| `--ui-text` | `#171b24` | primary text |
| `--ui-text-muted` | `#667085` | secondary text |
| `--ui-text-faint` | `#98a2b3` | tertiary text |
| `--ui-accent` | `#3478f6` | selected / active / focus |
| `--ui-accent-hover` | `#2468df` | active hover |
| `--ui-accent-soft` | `#edf4ff` | selected backgrounds |
| `--ui-danger` | `#d92d20` | destructive action |
| `--ui-success` | `#12a150` | saved / healthy state |
| `--ui-warning` | `#d97706` | attention state |

### Color rules

- Blue means interaction or selection, not decoration.
- Do not use multiple competing brand colors in editor chrome.
- Destructive red is reserved for destructive states/actions.
- Grid and guides stay visually lighter than crochet symbols.
- Selected objects use blue geometry/handles while the stitch glyph itself remains legible.

## 5. Typography

Primary family: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.

Scale:

- menu / compact labels: 11–12 px;
- body / controls: 12–13 px;
- panel titles: 12–13 px, semibold;
- important numeric values: 12–13 px, medium/semibold;
- no all-caps section titles by default;
- line-height: approximately 1.35–1.45.

The editor favors information density over marketing typography.

## 6. Spacing, radius and elevation

Spacing base: 4 px.

Preferred sequence: 4 / 8 / 12 / 16 / 24 / 32.

- control height: 32 px;
- compact control: 28 px;
- panel internal padding: 12–16 px;
- radius small: 6 px;
- radius medium: 8 px;
- floating toolbar/menu radius: 8–10 px;
- avoid pill shapes except statuses/tags.

Shadows are only for floating layers such as menus, popovers and the selection toolbar. Docked panels use borders, not shadows.

## 7. Iconography

Style: simple outline icons, 1.5–2 px optical stroke, 16–18 px standard size.

Preferred visual language: Lucide-style geometry. Do not mix emoji with product icons in the final UI.

Rules:

- icon-only controls require `aria-label` and tooltip;
- active tool gets blue icon + soft-blue background;
- destructive icon is red only on hover/confirmation context;
- crochet symbols are domain glyphs and must not be substituted with generic UI icons.

## 8. Component system

We maintain a small **internal editor UI kit** rather than adopting a visually opinionated external component library.

Required primitives:

- `IconButton`
- `ToolbarButton`
- `ToolRailButton`
- `Button` (`default`, `primary`, `danger`, `ghost`)
- `Select`
- `NumberField`
- `SearchField`
- `Checkbox` / `Switch`
- `SegmentedControl`
- `PanelSection`
- `AccordionSection`
- `Tabs`
- `DropdownMenu`
- `Popover`
- `Tooltip`
- `StatusBadge`
- `Divider`

All primitives consume design tokens; feature panels should not invent colors, radii or control heights.

## 9. UI-kit decision

### Do not use MUI / Ant Design / Chakra as the visual foundation

They solve generic business applications well but bring substantial styling and layout assumptions that work against a compact graphics editor. Overriding them would cost more than the value they provide.

### Headless primitives are acceptable later

Radix UI or an equivalent headless primitive library can be introduced selectively for difficult interaction primitives such as accessible dropdown menus, popovers, tooltips and tabs. It should not own the visual system.

### Initial implementation

The first migration stage uses the current React stack plus CSS design tokens and internal primitives. This avoids a dependency migration while the information architecture is still moving.

## 10. Tool behavior

### Left tool rail

Primary persistent tools:

- Select / Move;
- Hand / Pan;
- Selection flyout: rectangle / lasso;
- Guides flyout: line / arc / curve / parabola / rectangular grid / radial grid;
- Ruler;
- Row marker / other authoring tools where appropriate.

The Guides control is a creation flyout, not a second guide inspector. Opening it does not change the active canvas tool. Choosing an entry immediately creates that real guide through the same editor action used elsewhere. Escape closes the flyout and returns focus to its trigger.

Tool selection should not unexpectedly erase document selection unless required by the operation.

### Crochet library

- search at top;
- Favorites first;
- categories are collapsible;
- compact 4-column grid where labels remain readable;
- active placement symbol has a clear blue selected state;
- favorites use a star affordance and also appear in the command bar when space permits;
- library previews may use a lighter optical stroke than canvas-authored crochet geometry so a dense symbol grid stays readable without changing placed/exported stitches.

No generic “basic shapes” category exists unless the product later explicitly adds such a feature.

## 11. Right inspector

The right side is context-driven.

### Stitch selected

Show relevant controls only:

- position / rotation where supported;
- color;
- guide attachment;
- spacing / orientation properties when attached;
- lock / visibility;
- duplicate / delete and secondary productivity actions.

### Guide selected

Show guide-specific geometry:

- line: endpoints, length, angle, divisions, fit-to-project;
- arc: center, radius, start/end angle, divisions;
- curve/parabola: control points and divisions;
- grids: dimensions / spacing / radial parameters as applicable;
- visibility and lock state.

### Multiple stitches selected

Show shared actions and only properties that can be applied safely to the whole selection.

### Nothing selected

Show document/global inspector sections such as background, gauge, print, snapping, rows, row markers, legend/canvas and help without displacing the canvas.

## 12. Layers

Layers belong on the right as a first-class tab next to Inspector.

Required semantics already present in the application must be preserved:

- visibility;
- locking;
- semantic row/group relationships;
- ordering controls;
- selection from layers, including locked elements when inspection is allowed.

Options and Layers are true tab panels: only the selected panel participates in layout/focus. Arrow Left/Right changes tabs, Home/End jumps to the first/last tab, and focus follows selection.

## 13. Floating selection toolbar

Keep it intentionally small. It must never become a second inspector.

Preferred direct actions:

- duplicate;
- group / ungroup when relevant;
- rotate / mirror if there is sufficient room;
- delete.

The toolbar is positioned from the complete selection bounds and must avoid covering small stitches. Large configuration controls remain in the inspector.

## 14. Canvas feedback

- selected geometry: blue;
- guide attachment / snapping target: blue with distinct target marker;
- repeat/build preview: lower-opacity blue/gray ghost;
- locked objects remain selectable for inspection but clearly communicate locked state;
- guide hit targets may be larger than visible strokes;
- handles use larger invisible pointer targets than their visual dots;
- a placement crosshair directly over a continuous guide path must be able to acquire that path;
- chain, slip-stitch and magic-ring style center-based symbols align their center to a guide rather than drifting by a bottom-anchor offset;
- custom mirror-axis point and angle are authoritative for both preview and committed reflection;
- Repeat defaults should use visual frame-to-frame spacing for a single stitch instead of an unrelated fixed step.

## 15. Accessibility and input

- keyboard navigation for menus and form controls;
- application menu follows desktop menubar conventions: Down/Enter/Space opens, Up/Down moves within a menu, Left/Right moves across menus, Home/End moves to menu edges, Escape closes and restores trigger focus;
- right Options/Layers tabs use roving focus and Arrow Left/Right plus Home/End;
- floating creation flyouts close on Escape and return focus to the trigger;
- visible focus ring: `0 0 0 2px rgba(52,120,246,.22)` plus blue border where appropriate;
- icon-only buttons always have accessible names;
- no information encoded by color alone;
- minimum contrast target WCAG AA for text;
- pointer targets are deliberately larger than delicate crochet geometry.

## 16. Migration rule: functionality cannot regress

UI v2 is a presentation and information-architecture migration, not a feature reset. Existing capabilities must remain reachable throughout the migration, including at minimum:

- project create/open/save/import/export/autosave;
- undo/redo;
- stitch placement and chain bundles;
- selection, multi-selection, lasso, pan and keyboard workflows;
- guides: arc, line, curve, parabola, rectangular and radial grids;
- guide manipulation and attachment;
- snapping and orientation;
- duplicate/group/ungroup/repeat/mirror/rotate workflows;
- layers, visibility, locking and ordering;
- row authoring, topology and row markers;
- gauge and measurement rulers;
- background image tracing;
- legend and document output;
- tiled print;
- local project manager;
- Russian and English UI.

A new visual control must not replace an old working control until equivalent behavior has automated regression coverage.

## 17. Implementation sequence

1. **Foundation** — design tokens, neutral/blue visual shell, shared control geometry.
2. **Shell** — two-level top area, compact left rail + library, right inspector/layers structure.
3. **Command architecture** — File/Edit/View/Settings/Help and command search; wire existing actions before removing old buttons.
4. **Inspector migration** — move contextual properties into consistent sections.
5. **Library + favorites** — favorites persistence and command-bar quick access.
6. **Icon pass** — replace emoji/text placeholders with a coherent SVG icon set.
7. **Density/accessibility pass** — keyboard, focus, tooltips, overflow and small-screen behavior.
8. **Regression gate** — Playwright visual/interaction smoke tests for all major editor workflows.
