# Cubic Rubik Solver

A 3D Rubik's cube application: scramble, manually turn, and algorithmically solve a virtual cube, plus accept a physical cube's state via a 2D net editor and solve it. Built with vanilla TypeScript and Three.js.

## Language

**Cube State**:
The canonical representation of a cube at a moment in time: 8 corners + 12 edges, each with a slot and orientation, plus 6 fixed centers. The single source of truth for the domain and the render layer: meshes' resting transforms are always derived from it (`mesh.position/quaternion = f(slot, orientation)`); during an animation the 9 turned cubies' transforms are temporarily overridden by the tween, and on completion re-derived from the model (kills floating-point drift — rendered transforms are never accumulated across moves).
_Avoid_: configuration, arrangement, sticker layout, facelet array

**Cubie**:
A movable physical piece of the puzzle. Either a corner (3 stickers) or an edge (2 stickers). Centers are not cubies.
_Avoid_: piece (ambiguous — a slot is also a "piece of the cube"), block, cubelet

**Corner**:
A cubie with 3 stickers. Occupies one of 8 corner slots and has orientation 0, 1, or 2.
_Avoid_: vertex

**Edge**:
A cubie with 2 stickers. Occupies one of 12 edge slots and has orientation 0 or 1.
_Avoid_: side piece

**Center**:
A fixed single-sticker piece defining its face's color. Centers never move; their orientation is invisible.
_Avoid_: middle piece

**Slot**:
One of 20 named positions a cubie can occupy (8 corner slots + 12 edge slots). Named by the faces it touches, in canonical order U-before-D, R-before-L, F-before-B (e.g. `URF`, `UR`, `DLB`).
_Avoid_: position (reserved for the abstract concept), location, coordinate

**Home**:
A cubie's solved destination: its home slot at orientation 0. The puzzle is solved when every cubie is home. A cubie is *identified* by its color signature (the set of face colors on its stickers) and *located* at a slot — identity and location are distinct.
_Avoid_: goal, target

**Orientation**:
How a cubie is twisted within its slot: a corner has 3 states (0/1/2, measured by how far the U/D sticker has rotated from the U/D face), an edge has 2 (0 or 1, flipped or not). The convention is the standard cubie-library one: F/B moves flip edges; U/D/L/R do not. Baked into the permutation tables, not left to callers.
_Avoid_: twist (keep informal), rotation

**Move**:
A single face turn identified by the pair `(face, amount)`: `face ∈ {U, D, L, R, F, B}` (the six faces, named by their fixed center), `amount ∈ {1, 2, −1}` (quarter CW, double, quarter CCW). 18 moves total. The canonical token is the pair, not the string `"R'"` — strings belong to `notation.ts`.
_Avoid_: rotation (too general), twist, turn (kept informal), quarter-turn

**Solution**:
A flat `Move[]` returned by the solver: `[R, U, R', U', ...]`. The minimal playback contract — the UI walks it one move at a time. The Layer-by-Layer solver works internally in phases (cross, corners, middle edges, last layer) but concatenates them into one array before returning; phase structure lives in the code, not the return type. A future teaching mode could wrap the same flat list with phase annotations as an optional view on top.
_Avoid_: sequence (too generic), algorithm, procedure

**Move Queue**:
The single FIFO of pending Moves owned by the animator. `enqueue(move)` appends; the animation loop pops one at a time and animates it to completion (per ADR-0004's animate-then-apply). Input during an animation (keyboard, buttons, a whole Solution) just appends — nothing is dropped or interleaved. Scramble = enqueue 20 random moves; Solve = enqueue the whole Solution; they play back-to-back.
_Avoid_: buffer, pipeline, playlist

**Stop**:
Clears the Move Queue and lets the current in-flight move finish animating (the model then reflects exactly the visible state, per ADR-0004). Not a hard interrupt — no mid-tween cancellation, which would require special-casing model advancement. Essential once Solve can enqueue 100+ moves.
_Avoid_: cancel, pause (different — pause would hold the queue, not clear it)

**Scramble**:
A random-move sequence of fixed length 20, generated with two constraints: no move immediately undoes the previous (no `R` then `R'`), no move on the same face back-to-back (no `R` then `R`). The WCA-style convention. Deliberately decoupled from the solver — `scramble.ts` depends only on the 18 Moves, never on `solve/`, so scrambling works before the solver exists and a solver bug never breaks scrambling. 20 random well-formed moves reliably produce a fully-scrambled cube; the no-undo/no-same-face rules are the quality filter that stops a would-be engineer from "fixing."
_Avoid_: shuffle, randomization

**Reset**:
Returns the on-screen cube to the solved state, in both Virtual and Real-cube Mode — a single mode-agnostic action. The Net Editor retains its painted Facelets independently; to re-apply a real-cube state after Reset, the user re-loads from the editor. Reset never silently reloads the entered real-cube state, because that would be indistinguishable from "undo my Solve" and confuse the model.
_Avoid_: clear, new

## Modes

**Virtual Mode**:
The default. The state to be solved is the live on-screen model — Scramble mutates it, manual turns mutate it, Solve runs the solver against it. The 3D cube *is* the live model.
_Avoid_: play mode, default mode

**Real-cube Mode**:
Entered by opening the Net Editor. The state to be solved is built fresh from the painted Facelets, converted to a Cube State via `facelet.ts`. The 3D cube adopts this state as its new live model, then animates the Solution. There is one solver, one animator, one 3D view — the mode differs only in where the input state comes from.
_Avoid_: physical mode, scanner mode

**Net Editor**:
The 2D unfolded-cube editor for Real-cube Mode: six faces laid flat, click each Facelet to cycle W/Y/R/O/B/G. Produces a facelet array; the solver never sees it directly — `facelet.ts` converts it to a Cube State first.
_Avoid_: input grid, facelet picker, scanner

**Legal**:
A Cube State that is reachable from solved — i.e. a physically possible configuration. The solver only runs on Legal states. Scrambled states are always Legal (generated from Moves); a Net Editor state must be validated before solving. "Solved" is a special case of Legal.
_Avoid_: valid (too generic), possible, solvable

**Validate Facelets**:
The pure conversion-boundary check in `facelet.ts`: `validateFacelets(facelets): { ok: true } | { ok: false, errors: ValidationError[] }`. Three checks, no more:
1. Color counts — exactly 9 of each of the 6 colors.
2. Piece feasibility — every corner's 3 facelets are a real corner signature, every edge's 2 facelets are a real edge signature.
3. Parity — corner-twist sum ≡ 0 mod 3, edge-flip sum ≡ 0 mod 2, corner and edge permutation parities equal.

On failure, reports which check and where (e.g. highlights offending stickers). The UI never enqueues a Solution without a green validation. We never auto-correct a painted state — the user entered it, we solve it or refuse, we don't silently change it.
_Avoid_: sanity check, input check

## Testing

**Domain Tests**:
The three-tier property suite for the `cube/` layer (pure TS, no Three.js):
- **Tier 1 (per-move):** for every Move, `apply ∘ inverse` = identity, `4× quarter turn` = identity, and the move is a bijection on slots. Localizes faults to a specific permutation table.
- **Tier 2 (round-trip):** `solve(scramble(state))` returns a Solution that solves it; `fromFacelets(toFacelets(state))` = state for any Legal state. Pins the whole pipeline.
- **Tier 3 (solver guarantee):** for N seeded random scrambles (≈100), the solver returns a `Move[]` that solves the state and whose length is within the LBL sanity ceiling (~200 moves). Catches regressions and infinite loops.
_Avoid_: unit tests (too generic), snapshots

**Face**:
One of U (up, +Y), D (down, −Y), L (left, −X), R (right, +X), F (front, +Z), B (back, −Z). Named by its fixed Center; never moves. A move targets a fixed cube-frame slot, not a world-relative slice.
_Avoid_: side, direction

**Clockwise (CW)**:
Defined looking at a face from outside the cube along its inward-pointing normal. So U-CW is about +Y, D-CW is about −Y — same `amount`, opposite world axes. Baked into the permutation tables, not left to callers.
_Avoid_: "positive rotation", "right-hand turn"

**Amount**:
The magnitude/direction of a Move: `1` (quarter CW), `2` (double, 180°), `−1` (quarter CCW). Printed as `R`, `R2`, `R'` respectively.
_Avoid_: power, exponent, direction

**Facelet**:
A single sticker position on the unfolded 2D net. A serialization/conversion format for I/O — not the canonical state.
_Avoid_: sticker (informal), color square

## Presentation

**Color scheme (Western/BOY)**:
The fixed face-to-color map for v1: White=U, Yellow=D, Red=R, Orange=L, Green=F, Blue=B. The dominant scheme on physical cubes worldwide and in tutorials, so it matches what users hold when entering their real cube in the net editor. Color is presentation only — the domain reasons about cubie IDs, never hues — so a future "pick your scheme" setting would remap presentation alone, not the model.
_Avoid_: cube colors, sticker colors