# 02 — All 18 Moves + notation + Move Queue + keyboard

Status: ready-for-agent

## Parent

Builds on slice 01's proven animation seam. Scales from one move to the full 18-move algebra with notation parsing/printing and a Move Queue that serializes all input.

## What to build

Full manual play. The user can perform any of the 18 Moves via keyboard or on-screen face buttons; moves queue and animate back-to-back; notation is parsed and printed.

End-to-end behavior:
- All 18 Moves are defined as pure permutation functions over the Cube State, per ADR-0002 and ADR-0003: `face ∈ {U, D, L, R, F, B}`, `amount ∈ {1, 2, −1}`, with clockwise defined along each face's inward-pointing normal (U-CW about +Y, D-CW about −Y, etc.) baked into the tables. The model is `slot → (cubieId, orientation)` per CONTEXT.md.
- `notation.ts` parses and prints Singmaster notation: `R`, `R2`, `R'` map to `(R, 1)`, `(R, 2)`, `(R, −1)` respectively. Round-trips: `print(parse(s)) = s` for canonical strings; `parse(print(m)) = m` for any Move.
- The animator from slice 01 is generalized: any Move enqueues and animates via the pivot-attach technique with the correct axis and sign per face.
- Keyboard map: `U D L R F B` for quarter CW, Shift+key for prime (CCW), `2`-suffix behavior for double (e.g. `R` then `2` = `R2`, or hold a modifier — implementer's choice, but must be documented in the code). Space/Enter/Esc are reserved for later slices.
- On-screen buttons for each face (U D L R F B) with a prime modifier toggle, so non-keyboard users can play.
- A notation display shows the running move history as a string (e.g. `R U R' U2 F`), most recent appended; clears on Reset.
- The Move Queue serializes everything: mashing keys or clicking buttons during an animation just appends; nothing is dropped or interleaved.

## Acceptance criteria

- [ ] All 18 Moves defined as pure functions over the Cube State; clockwise baked per face per ADR-0002 (U-CW = +Y, D-CW = −Y, etc.)
- [ ] `notation.ts` parses Singmaster (`R`, `R2`, `R'`) → Moves and prints Moves → Singmaster; round-trips both ways
- [ ] Keyboard input: `U D L R F B` = quarter CW, Shift = prime, `2` = double; documented in code
- [ ] On-screen face buttons (U D L R F B) with prime modifier toggle work for non-keyboard input
- [ ] Any of the 18 moves animates correctly via the pivot-attach technique with the correct axis and sign
- [ ] Move Queue serializes all input; rapid mashing drops nothing, plays back-to-back in order
- [ ] Notation display shows running move history; most recent appended, e.g. `R U R' U2 F`
- [ ] **Tier 1 domain tests pass:** for every Move, `apply ∘ inverse` = identity; `4× quarter turn` = identity; each move is a bijection on slots. Localizes faults to a specific permutation table.

## Blocked by

- 01-animated-face-turn-tracer-bullet.md (the animation seam must be proven first)