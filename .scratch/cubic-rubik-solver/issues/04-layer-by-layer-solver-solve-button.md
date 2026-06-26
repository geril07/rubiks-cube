# 04 — Layer-by-Layer Solver + Solve button

Status: ready-for-agent

## Parent

Builds on the full 18-move algebra from slice 02. Adds the headline feature: the cube solves itself.

## What to build

The user can scramble the cube, hit Solve, and watch the cube animate its own solution move-by-move. The solver is Layer-by-Layer (beginner method), pure TS, returning a flat `Move[]`.

End-to-end behavior:
- `solve/lbl.ts` implements the Layer-by-Layer method in pure TS over the Cube State. Internally works in phases (cross → first-layer corners → middle edges → last layer, with last-layer sub-steps as needed) but concatenates all phases into one flat `Move[]` before returning, per CONTEXT.md's Solution definition.
- `solve/index.ts` exposes `solve(state): Move[]` as the single solver entry point.
- The solver only runs on Legal Cube States (per CONTEXT.md). Scrambled states are always Legal (generated from Moves), so Virtual Mode is safe; Real-cube Mode validation comes in slice 05.
- Enter key or "Solve" button runs the solver against the current Cube State, enqueues the returned Solution into the Move Queue, and the animator plays it back-to-back with eased turns. A move counter shows progress (e.g. `47 / 120`).
- The notation display shows the full Solution as a running string; the current move is highlighted as it plays.
- If the user hits Scramble or performs manual moves mid-Solve, those just enqueue after the Solution (per Move Queue semantics) — the solver already ran against the state at Solve-time; newly-enqueued moves play after.
- Stop works as in slice 03: clears the remaining queued Solution moves, lets the current one finish.

## Acceptance criteria

- [ ] `solve/lbl.ts` implements Layer-by-Layer in pure TS over the Cube State; `solve/index.ts` exposes `solve(state): Move[]`
- [ ] Solver works internally in phases but returns one flat `Move[]` (phase structure in code, not return type)
- [ ] Solver only runs on Legal states (asserted/guarded at the call site)
- [ ] Enter key or "Solve" button runs the solver and enqueues the returned Solution; animator plays it back-to-back
- [ ] Move counter shows progress (`current / total`)
- [ ] Notation display shows the full Solution with the current move highlighted as it plays
- [ ] After a Scramble + Solve, the cube is visibly solved and the Cube State is solved
- [ ] Stop mid-Solve clears the remaining queue, lets the current move finish; model reflects visible state
- [ ] **Tier 2 domain tests pass:** `solve(scramble(state))` returns a Solution that, when applied, yields the solved state, for a sample of seeded random scrambles
- [ ] **Tier 3 domain tests pass:** for ~100 seeded random scrambles, the solver returns a `Move[]` that solves the state and whose length is within the LBL sanity ceiling (~200 moves) — catches infinite loops and regressions

## Blocked by

- 02-all-18-moves-notation-queue-keyboard.md (needs the full 18-move algebra and Move Queue; does NOT need slice 03)