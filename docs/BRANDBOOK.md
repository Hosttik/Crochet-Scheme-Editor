# Crochet Scheme Editor — UI v2 Brandbook

## Product character

Crochet Scheme Editor is a technical authoring tool, not a decorative craft app. The interface should feel precise, calm and dependable: the canvas is the work surface, controls stay compact, and the UI should expose state explicitly rather than rely on visual novelty.

The closest interaction references are Figma, Illustrator and CAD-like editors, adapted to crochet notation rather than generic vector graphics.

## Core principles

1. **Canvas first.** The scheme remains the visual focus. Chrome supports the work rather than competing with it.
2. **Expert density.** Prefer compact controls, short labels and progressive disclosure over large cards or consumer-app spacing.
3. **Neutral chrome, explicit state.** Surfaces are neutral; blue is reserved for active tools, selection, focus and primary actions.
4. **Real behavior before visual affordance.** Do not expose dead buttons or speculative commands. New UI must call the authoritative editor action/state.
5. **Domain language.** Use crochet symbols and crochet terminology. Do not introduce generic “basic shapes” unless the product explicitly adds that capability.
6. **Stable interaction model.** Tool selection, guide creation, inspector editing and layer actions should behave consistently across mouse and keyboard input.

## Workbench anatomy

Desktop UI v2 is organized as:

- application menu;
- compact command bar;
- 44 px tool rail;
- 248–288 px crochet element library;
- flexible canvas;
- 300–340 px right inspector with `Options / Layers` tabs;
- 28–32 px status surface.

The workbench is React-owned. Panels and editor controls should render directly in their intended layout. DOM reparenting, hidden duplicate controls and click-through compatibility UIs are migration techniques only and are not part of the target architecture.

## Dimensions

- application / command chrome: 44–56 px;
- tool rail: 44 px;
- left library: 248–288 px on standard desktop, allowed to contract on narrow desktop;
- right inspector: 300–340 px, allowed to contract on narrow desktop;
- status: 28–32 px;
- standard controls: 32 px;
- compact controls: 28 px;
- icon size: 16–18 px by default.

A 900 px-wide desktop remains a supported regression target. At constrained widths, remove duplicate chrome before reducing the canvas to unusable dimensions; canonical commands remain accessible from the application menu.

## Color and surfaces

Use the design tokens in `src/ui/design-tokens.css` as the source of truth.

- neutral application/canvas backgrounds;
- white or near-white control surfaces;
- subtle neutral borders;
- primary interaction blue `#3478f6`;
- soft blue active-selection background;
- red only for destructive operations / destructive state;
- muted text for secondary metadata and helper copy.

Do not use unrelated accent colors to distinguish ordinary tools or panels.

## Typography

Use the application system sans stack. Typography should be compact and functional:

- product/section labels: medium or semibold;
- body/control text: regular/medium;
- metadata and keyboard hints: smaller muted text;
- avoid decorative typefaces and excessive uppercase.

## Icon language

Use one coherent outline SVG language, visually compatible with Lucide-style 16–18 px icons.

- no emoji as editor chrome;
- no mixing text glyphs such as `↑`, `⇊`, `◎` with the main icon system when a matching SVG icon exists;
- icons must preserve meaning at compact sizes;
- destructive icons inherit the destructive state instead of being permanently visually loud.

Crochet diagrams themselves are not UI icons and retain their domain geometry.

## Crochet element library

The left library is optimized for rapid symbol acquisition:

- search first;
- Favorites appear before regular categories when non-empty;
- categories are collapsible and preserve their UI-only state;
- search temporarily expands matching categories and restores the user's collapsed state when search is cleared;
- regular desktop target is a compact four-column grid, with three columns permitted at narrow widths;
- the active placement item uses the interaction blue state;
- favorite stars are explicit separate affordances, not nested buttons;
- favorite state is a local UI preference and must not mutate project data;
- up to six favorites may surface as direct placement shortcuts in the command bar when horizontal space permits;
- **library glyph strokes are intentionally lighter than canvas-authored stitch geometry** so dense symbol grids remain legible; changing library presentation must not change the actual stitch exported or placed on canvas.

## Tool rail

The Tool Rail is for editing modes and creation categories, not a second command bar.

Primary modes:

- Select;
- Hand / Pan;
- Selection flyout where needed;
- Guides flyout;
- Ruler.

Active state uses blue. Icons stay neutral when inactive.

### Guides flyout

The Guides control is a creation flyout. Choosing Line / Arc / Curve / Parabola / Rectangular Grid / Radial Grid immediately creates a real guide through the same editor command used elsewhere.

Keyboard behavior:

- `Enter`, `Space` or `ArrowDown` opens the flyout;
- `ArrowUp / ArrowDown` moves among guide types;
- `Home / End` jumps to first/last;
- `Escape` closes the flyout and restores focus to the Guides trigger;
- pointer click outside closes without creating anything.

Guide visual stroke and guide hit target are separate concepts. Guides may stay visually thin while exposing a larger invisible pointer-acquisition width.

## Application menu

Desktop menus follow conventional application-menu behavior:

- triggers: File / Edit / View / Settings / Help;
- `ArrowLeft / ArrowRight` moves between menu triggers and switches an already-open menu;
- `ArrowDown`, `Enter` or `Space` opens the current menu and focuses the first command;
- inside a menu, `ArrowUp / ArrowDown`, `Home / End` navigate commands;
- `Escape` closes and restores focus to the corresponding trigger;
- visible shortcut labels are presentation only; expose actual shortcuts semantically with `aria-keyshortcuts`.

Application commands are semantic IDs connected to App-owned editor callbacks/state. Do not synthesize keyboard events or find/click hidden DOM controls to invoke editor behavior.

## Command search

`Ctrl/⌘ K` opens the command search surface.

- search spans the same real application commands available from menus;
- `ArrowUp / ArrowDown` changes active command;
- `Enter` executes;
- `Escape` closes and restores a stable previous focus target;
- menu-triggered command search restores focus to the menu trigger rather than to a transient menu item.

## Right inspector

The right side has two semantic tabs: `Options` and `Layers`.

- only the active panel is presented as visible content;
- tabs use roving `tabIndex`;
- `ArrowLeft / ArrowRight`, `Home / End` switch tabs and move focus;
- `aria-controls` / `aria-labelledby` connect each tab with its panel;
- editor selection/property controls live in Options;
- Layers renders directly in its panel and keeps real visibility, locking, selection and ordering behavior.

Inspector sections favor compact property grids and collapsible advanced blocks rather than large cards.

## Selection and geometry

Selection blue is consistent across:

- selection bounds;
- handles;
- active tools;
- active tabs;
- snapping feedback.

Hit targets may be larger than their visible handles. Resize, rotation, guide and anchor affordances must remain usable without visually increasing diagram stroke weight.

Floating selection actions must be positioned from the actual transformed selection bounds. For compact symbols, especially chain/oval stitches with a rotation handle above the symbol, the toolbar should move below the selection rather than cover the rotation control.

## Snapping

Snapping is evaluated in screen-space tolerance so behavior remains stable across zoom levels.

- a placement crosshair directly over a continuous guide path must acquire that path;
- continuous line/curve guides are not limited to configured division points;
- guide orientation may apply tangent/perpendicular rotation according to the selected orientation mode;
- round/oval center-based crochet symbols such as chain, slip stitch and magic ring align their **center** to the guide rather than using the standard bottom stitch anchor;
- snap lock/hysteresis should reduce flicker without making a candidate impossible to release.

## Mirror / reflection

Directional mirror and custom-axis mirror are separate operations.

A custom mirror axis is real editor state consisting of a point and angle. Moving the axis, editing X/Y or changing its angle must alter the actual reflection transform and its ghost preview; reflection must never silently fall back to the selection center once a custom axis is active.

## Repeat

Repeat uses live ghost preview and commits only on explicit creation.

Defaults should preserve author intent:

- for one stitch, linear repeat defaults to **frame-to-frame** spacing using the stitch's visual extent rather than a magic fixed step;
- for an existing sequence, continue its measured step vector;
- for a motif/group, preserve motif span and avoid adding an accidental second gap;
- manual repeat-field edits remain sticky until the selection transaction changes.

## Focus and accessibility

Every interactive control must be reachable and understandable without relying on color alone.

- use native buttons/inputs where possible;
- icon-only controls require accessible names;
- focus-visible uses the shared blue focus ring;
- hidden panels must not retain active focusable content;
- keyboard navigation conventions should match familiar desktop authoring applications.

## Internal UI kit

The product uses its own small internal visual kit. Current primitives include:

- `Button`;
- `IconButton`;
- `ToolButton`;
- `PanelHeader`;
- `SegmentedControl`;
- `Divider`.

Prefer extending these primitives when a pattern recurs. Do not adopt MUI, Ant Design, Chakra or another visual system as the foundation. A headless primitive library can be introduced selectively where it materially reduces interaction/accessibility risk without replacing the visual language.

## Migration discipline

UI v2 work is accepted only when behavior remains authoritative and regression-covered. Prefer small structural moves with focused tests over a large rewrite.

`App.tsx` remains the primary state owner today. Split it only at stable state/interaction boundaries; decomposition is a maintainability task, not a prerequisite for every visual improvement.
