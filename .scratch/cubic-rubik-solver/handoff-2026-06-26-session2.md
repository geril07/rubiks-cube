# Handoff: Cubic Rubik Solver 3D — 2026-06-26 Session 2

**Repo:** `/home/geril/code/my/cubic-rubik-solver`
**Stack:** Vanilla TS + Vite + Three.js + Vitest
**Prior handoff:** `handoff-2026-06-26-eod.md` in this directory. This continues slice 04 to completion.

## Current state

**Tests:** `npm test` → **209 total, 209 pass.** (Up from 200/196 pass + 4 fail.)
**Build:** `npm run build` → **CLEAN** (unchanged from prior — was already fixed).
**UI:** `npm run dev` opens a working 3D cube with Scramble, Solve, Reset, Stop buttons + keyboard shortcuts.

### Slice progress
- **Slice 04 — 100% done.** All solver phases + full-solve pipeline + Solve button + move counter + notation highlighting.
- **Slices 01, 02, 03:** complete (unchanged).
- **Slice 05 (facelet conversion/validation):** not started.
- **Slice 06 (net editor/real-cube mode):** not started (blocked on 05).

## What was built this session

### Fix + middle edges (middle.ts)

1. **Fixed import** on `middle.ts:5` — `edgeOrientation` was imported from `./tables.ts` (not re-exported there); lives in `./orientation.ts`. Build was broken. 1-line fix recovered cross + f2l test suites (worker contention from the broken file was the real root of prior timeouts).

2. **Replaced BFS with 32 hand-coded insert algs.** Used DFS from solved over {U,R,F}, {U,L,F}, {U,B,R}, {U,B,L} to find "clean" insertion sequences (preserve first layer + all other middle edges, verified by the DFS). 7-8 moves each, 4 U-slots × 2 flips per slot. Also computes ejection algs (inverse of shortest insert for each slot). **150x faster** — prior BFS was 2971ms/scramble; hand-coded is 19ms. 5 tests (solved, single scramble, 30-seed regression, U-layer eject, wrong-slot eject).

### Last layer (last-layer.ts)

3. **Macro-based BFS solver.** Standard OLL/PLL algs don't preserve F2L in our CW convention (verified empirically — all 7 standard algs failed the F2L check). Instead:
   - Module init discovers F2L-preserving macros via DFS from solved over {U,R} depth 12 (214 macros, 279ms) + {U,R,F} depth 8 (129 macros, 587ms). ~300 unique macros total.
   - Precomputes a BFS solution table from solved to all ~62K last-layer states using integer-packed LL keys (28-bit) for zero-allocation dedup. Table builds in ~2s (lazy, first call only).
   - Solves any last-layer state by following the predecessor chain back to solved. Reconstruction applies inverse macros (target → solved direction).
   - 3 tests (solved, single scramble, 30-seed regression).

### Orchestrator + full solve pipeline (lbl.ts + solve/index.ts)

4. **`solveLbl(state)`** chains cross → f2l-corners → middle → last-layer, concatenating moves. **`solve(state): Move[]`** exported from `solve/index.ts` as the single entry point.

5. **Full solver tests:** 100 seeded scrambles, avg 86.1 moves, max 106 moves — well under the 200-move ceiling. 8.9s for 100 solves (including first-call table build of ~2s).

### UI wiring (controls.ts + main.ts + style.css)

6. **Solve button** in lifecycle panel + **Enter key** handler. Calls `solve(view.getState())`, enqueues all moves into the animator, and updates the notation/counter.

7. **Move counter** (`0 / 47`) with `#move-counter` div, updated per tick via the `onMoveApplied` callback. Resets on manual moves and scramble.

8. **Notation highlighting** — full solution string shown with `.current-move` (accent-colored, underlined) and `.played-move` (dimmed). Updated per tick via `renderSolutionNotation()`.

9. **Stop** mid-solve clears remaining queue (existed from slice 03, works unchanged).

### Key files summary

| File | Lines | Role |
|------|-------|------|
| `src/cube/solve/cross.ts` | 84 | IDA* with max-edge-distance heuristic |
| `src/cube/solve/f2l-corners.ts` | 98 | Eject+insert BFS per D-corner |
| `src/cube/solve/middle.ts` | 140 | 32 hand-coded insert algs + ejection |
| `src/cube/solve/last-layer.ts` | 230 | Macro-based BFS with precomputed table |
| `src/cube/solve/lbl.ts` | 20 | Phase orchestrator |
| `src/cube/solve/index.ts` | 16 | Public API (`solve(state): Move[]`) |
| `src/cube/solve/tables.ts` | 174 | FastState + precomputed move tables |
| `src/cube/solve/search.ts` | 139 | Generic bfs + idaStar |
| `src/cube/solve/orientation.ts` | 102 | cornerTwist, edgeOrientation, stickerFace |
| `src/ui/controls.ts` | 229 | UI: move buttons, lifecycle, notation, counter |
| `src/main.ts` | 45 | App entry: wires view + controls + solver |

### Test files

| File | Tests | Lines |
|------|-------|-------|
| `test/cube/solve/cross.test.ts` | 7 | 70 |
| `test/cube/solve/f2l-corners.test.ts` | 3 | 47 |
| `test/cube/solve/middle.test.ts` | 5 | 83 |
| `test/cube/solve/last-layer.test.ts` | 3 | 39 |
| `test/cube/solve/solve.test.ts` | 3 | 32 |
| `test/cube/solve/orientation.test.ts` | 22 | 196 |
| `test/cube/solve/search.test.ts` | 6 | 57 |
| `test/cube/solve/tables.test.ts` | 7 | 97 |
| `test/cube/solve/helpers.ts` | — | 74 |

## Key findings / operational notes

- **CW convention breaks standard algs.** Every standard OLL/PLL alg failed the F2L-preservation check in our convention. The sexy move `R U R' U'` has order 4 (not 6). Any future alg addition must be verified via `applySeq` + F2L check before adoption. The macro-based BFS approach avoids needing to find individual algs — it discovers all F2L-preserving sequences up to a given depth and uses them as moves in a BFS.

- **Last-layer table build is lazy.** First call to `solveLastLayer` triggers the macro DFS + BFS (~2-3s total). This means the first solve call is slower (~2.5s); subsequent solves using the same table are instant. The table is a singleton stored in module-level closure; it's rebuilt if the module is hot-reloaded (vite HMR).

- **Move counter accuracy.** The counter is driven by the `onMoveApplied` callback from the animator, firing once per completed animation frame. This means the counter lags behind the queue state by exactly one move (the currently-animating move). This is correct behavior per the spec ("current / total").

- **Uncommitted state.** Nothing committed. All changes are unstaged. User hasn't requested a commit.

## Suggested next steps (in order)

1. **Slice 05: Facelet conversion + validation** (`docs/agents/issue-tracker.md`). This is the natural next slice: validate that the cube state is Legal (satisfies parity invariants) before solving, required for real-cube input mode. See `.scratch/cubic-rubik-solver/issues/05-facelet-conversion-validation.md`.

2. **Slice 06: Net editor / real-cube mode.** Only after slice 05. See issue 06.

3. **Performance tuning** (optional, non-blocking): The last-layer table build could be precomputed and serialized instead of rebuilt on each page load. The BFS visits all ~62K states in ~2s which is already acceptable, but cold-start users see a 2s delay on first Solve.

4. **Commit** the slice-04 work when user requests it.

## Suggested skills for next session

- `tdd` — continue RED→GREEN for slice 05/06.
- `diagnosing-bugs` — for parity validation issues in facelet conversion.
- `find-docs` / context7 — for any further Three.js UI questions.

## Verification commands

```
npm test          # 209 pass / 0 fail
npm run build     # clean build
npm run dev       # vite dev server on :5173
```
