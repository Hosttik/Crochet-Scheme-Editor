# v1.15.1 — Data Integrity & Stabilization

This release hardens the editor before the next feature milestone.

- Prevents pending autosave loss during local-project transitions and serializes deletion against queued writes.
- Makes JSON import a clean history boundary and extends Undo/Redo to persisted document settings.
- Unifies semantic selection and locking for groups and parametric rows.
- Introduces schema v18 with project-wide integrity checks, resource budgets and legacy v1-v17 migration compatibility.
- Stores lightweight project summaries separately from full documents and bounds/compresses large tracing images.
- Caps Repeat output, removes per-pointer snap sorting, and makes expensive numeric edits transactional.
- Waits for print images to decode, confirms destructive project deletion and surfaces persistence errors.
- Uses deterministic `npm ci`; Pages deployment is gated by the full Chromium Playwright suite.
