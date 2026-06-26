# 01 — Animated face turn tracer bullet (R only)

Status: ready-for-agent

## Parent

None — this is the foundational tracer bullet for the whole project. Proves ADR-0004 (model-canonical + animate-then-apply) and ADR-0001 (cubie model as canonical state) end-to-end through the render layer.

## What to build

A thin vertical slice proving the highest-risk architectural seam: a single animated face turn. The user can press a button (or key) to turn the R face 90° CW and watch it animate smoothly; the Cube State stays correct before, during, and after.

This is deliberately thin — **only the R face, only `amount = 1`** — to isolate the risk in ADR-0004's pivot-attach technique. If the seam is wrong, it's cheaper to find out with one move than with all 18 permutation tables in the way.

End-to-end behavior:
- The 3D scene renders a solved 3×3×3 cube (27 cubies, black bodies + colored sticker faces, Western/BOY scheme) with OrbitControls so the user can look around.
- The Cube State (cubie model: 8 corners + 12 edges, slot + orientation, 6 fixed centers per CONTEXT.md) is initialized solved and is the single source of truth. Meshes' resting transforms are derived from it: `mesh.position/quaternion = f(slot, orientation)`.
- Pressing `R` (keyboard) or an on-screen "R" button enqueues a single `(R, 1)` move.
- The animator pops the move, creates a pivot `THREE.Group` at the origin, `pivot.attach`s the 9 cubies in the R slice (preserving world transforms), slerp-tweens the pivot's quaternion via `Quaternion.setFromAxisAngle(+X axis, +90°)` with ease-in-out (~250ms), then on completion: reparents the 9 cubies back to the scene, applies the move to the Cube State (animate-then-apply: model advances only now), and re-derives every mesh's transform from the model. The re-derive must match the tween's end pose exactly so there's no visible jump.
- Pressing R repeatedly queues moves; the Move Queue plays them back-to-back. After 4 R moves the cube is visibly solved again (R⁴ = identity) — this is the manual correctness check.
- A small notation display shows the move just played (`R`).

This slice intentionally omits: the other 17 moves, notation parsing, scramble, solve, real-cube mode. Those build on this proven seam.

## Acceptance criteria

- [ ] Solved cube renders correctly in 3D with Western/BOY colors (White U, Yellow D, Red R, Orange L, Green F, Blue B); OrbitControls let the user rotate the camera
- [ ] Cube State exists as the cubie model (8 corners + 12 edges with slot + orientation, 6 fixed centers) and is initialized solved
- [ ] Meshes' resting transforms are derived from the Cube State via a pure `f(slot, orientation)` function (no transform accumulation across moves)
- [ ] Pressing R (keyboard or button) animates the R slice rotating 90° CW about +X, smoothly with easing; the other 18 cubies do not move
- [ ] After the animation completes, the Cube State reflects the post-move state (model advances on completion, per animate-then-apply)
- [ ] After completion, mesh transforms are re-derived from the model (no FP drift accumulation)
- [ ] 4 consecutive R moves return the cube to visibly solved (manual correctness check)
- [ ] Rapidly pressing R 5+ times queues all moves; none are dropped, all play back-to-back in order
- [ ] Notation display shows the most recent move as `R`

## Blocked by

None — can start immediately.