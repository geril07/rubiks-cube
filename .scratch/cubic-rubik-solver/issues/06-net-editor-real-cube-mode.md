# 06 — Net Editor + Real-cube Mode

Status: ready-for-agent

## Parent

Builds on slice 04 (the solver) and slice 05 (facelet conversion + validation). Adds the second product mode: the user paints their physical cube's state into a 2D net editor and the app solves it.

## What to build

The 2D unfolded-cube Net Editor and the Real-cube Mode flow. The user opens the editor, paints their real cube's stickers, validates, and Solve animates the solution on the 3D cube.

End-to-end behavior:
- The Net Editor is a 2D unfolded-cube UI: six faces laid flat in the standard cross/T layout. Each face is a 3×3 grid of Facelets. Clicking a Facelet cycles its color through W/Y/R/O/B/G. There's a center-color hint per face (the fixed center is pre-filled and locked, since centers define the face — matches the BOY scheme).
- A "Validate" button (or automatic on Solve) calls `validateFacelets` from slice 05. On success, enables Solve. On failure, highlights the offending stickers and shows which check failed (counts / feasibility / parity) in plain language.
- On Solve (Enter or button): the validated facelets are converted to a Cube State via `fromFacelets`, the 3D cube adopts this state as its new live model (Real-cube Mode takes over the 3D view per CONTEXT.md), the solver runs against it, and the Solution animates on the 3D cube with the same move counter + notation display as Virtual Mode.
- There is one solver, one animator, one 3D view — Real-cube Mode differs from Virtual Mode only in where the input state comes from.
- Reset (from slice 03) returns the on-screen cube to solved in both modes. The Net Editor retains its painted Facelets independently (per CONTEXT.md's Reset definition) — to re-apply the real-cube state after Reset, the user re-loads from the editor.
- Color counts are shown live (e.g. "W: 9/9, R: 7/9") to help the user notice mistakes before Validate.

## Acceptance criteria

- [ ] Net Editor renders six faces in a 2D unfolded layout (standard cross/T), each a 3×3 grid of Facelets
- [ ] Center Facelet of each face is pre-filled with the BOY center color and locked (centers are fixed)
- [ ] Clicking a non-center Facelet cycles its color through W/Y/R/O/B/G
- [ ] Live color counts shown (e.g. "W: 9/9, R: 7/9") so the user can spot mistakes early
- [ ] Validate (button or auto-on-Solve) calls `validateFacelets`; on failure highlights offending stickers and names the failed check in plain language
- [ ] Solve (Enter or button) is disabled until validation passes; on Solve, converts facelets → Cube State via `fromFacelets`, the 3D cube adopts this state as its live model, the solver runs, and the Solution animates on the 3D cube
- [ ] Move counter + notation display work identically to Virtual Mode during Real-cube Solve
- [ ] Reset returns the 3D cube to solved in both modes; the Net Editor retains its painted Facelets independently
- [ ] Re-applying the real-cube state after Reset works (re-load from editor → Solve again)
- [ ] One solver, one animator, one 3D view — no duplicated render layer; Real-cube Mode only changes the input-state source

## Blocked by

- 04-layer-by-layer-solver-solve-button.md (needs the solver)
- 05-facelet-conversion-validation.md (needs facelet conversion + validation)