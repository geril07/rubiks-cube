# Cubic Rubik Solver 3D

A 3D Rubik's cube application: scramble, manually turn, and algorithmically solve a virtual cube. Built with vanilla TypeScript and Three.js.

## Stack

- **TypeScript** (vanilla, no framework)
- **Three.js** — 3D rendering and quaternion-based cubie model
- **Vite** — dev server and production bundler
- **Vitest** — test runner

## Commands

```sh
npm run dev       # Vite dev server (hot-reload)
npm run build     # tsc type-check + Vite production build
npm test          # vitest run (216 tests)
```

## Features

- Interactive 3D cube with smooth face-turn animations
- Keyboard shortcuts: `U D L R F B` = CW, hold `Shift` = CCW, `2` after a face = double turn; `Space` = Scramble, `Enter` = Solve, `Esc` = Stop
- Keyboard-friendly double-tap detection (press `R` then `2` for `R2`)
- Layer-by-layer (LBL) solver built on compact cubie coordinates — no BFS at solve time, only precomputed table lookups
- Solver runs in a **Web Worker** — the ~3s one-time initialisation (solution-table construction) happens on page load in parallel with the UI, never blocking the main thread. Solving a fully scrambled cube returns in <50ms.
- Move counter, notation highlighting, mid-solve Stop
- WCA-legal 20-move scrambles
- 216 tests across 15 test files

## Solver architecture

The solver runs in a four-phase layer-by-layer pipeline, each phase operating on a **FastState** (compact cubie coordinate — four Int8Arrays, 40 bytes). No Three.js dependency in the solver.

| Phase | Method | Time |
|-------|--------|------|
| Cross (D-layer edges) | Precomputed BFS predecessor table — exact shortest path by lookup | <1ms |
| F2L corners (D-layer corners) | BFS per corner over {U + 2 side faces} depth 8, preserved cross + prior corners | ~30ms |
| Middle edges (E-layer) | 32 hand-coded clean insertion algs, DFS-verified | <1ms |
| Last layer (U layer) | Macro-based BFS: ~300 F2L-preserving macros discovered from solved, BFS table over ~62K LL states, reconstructed by chain lookup | <1ms (table builds ~2s once) |

The first three phases are deterministic and run in <50ms combined. The last-layer table is built once and cached. The cross table (331K entries, Int32Array) is also a one-time build. Both tables live in module-level singletons.

Solver keys:

- `src/cube/solve/lbl.ts` — phase orchestrator
- `src/cube/solve/index.ts` — public API (`solve()`, `solveFast()`, `prepareSolver()`)
- `src/cube/solve/solve-worker.ts` — Web Worker entry point, eager table build on load
- `src/cube/solve/tables.ts` — FastState, move tables, edge advance
- `src/cube/solve/search.ts` — generic BFS and IDA*
- `src/cube/solve/orientation.ts` — corner twist and edge flip (read off quaternion)

## Convention notes

Our CW convention differs from standard cube notation's: the "sexy move" `R U R' U'` has order 4 here (not 6). This breaks standard OLL/PLL algs; all algs are either hand-coded (middle inserts) or discovered by DFS macro search (last layer).

## Project structure

```
src/
  main.ts                — App entry
  style.css              — UI styles
  cube/                  — Domain (pure TS)
    model.ts             — CubeState, solvedState
    moves.ts             — applyMove, rotation grid
    notation.ts          — Move ↔ string
    scramble.ts          — 20-move WCA scrambles
    facelet.ts           — Facelet ↔ CubeState conversion
    rotation.ts          — Quaternion frame helpers
    solve/               — LBL solver
  render/                — Three.js scene, camera, CubeView
  ui/                    — Controls panel, layout
test/
  cube/
    solve/               — Solver tests (perf, equivalence, per-phase)
```

## License

MIT
