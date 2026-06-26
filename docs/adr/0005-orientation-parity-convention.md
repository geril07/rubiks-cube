# Orientation parity convention

ADR-0003 fixes orientation at the glossary level (corner twist 0/1/2 = how far the U/D sticker has rotated from the U/D face; edge flip 0/1, F/B moves flip edges). This ADR pins the *specific* per-slot rule that makes each coordinate a homomorphism, so the parity invariants (corner-twist sum ≡ 0 mod 3, edge-flip sum ≡ 0 mod 2) hold for every Legal state. The rule lives in `facelet.ts:parityOf` and will be reused by the solver's `edgeOrientation`.

**Corner twist** is the position of the U/D-coloured sticker within the slot's cyclic `[U/D, R/L, F/B]` facelet ordering: 0 if on the U/D face, else 1 or 2. Which of R/L or F/B is twist 1 vs 2 is decided per-corner by the body-diagonal parity `sign(x·y·z)` of the slot's outward diagonal: parity +1 (URF, ULB, DRB, DLF) → R/L is twist 1; parity −1 (URB, ULF, DRF, DLB) → F/B is twist 1. This matches Kociemba's `cornerFacelet` orderings and makes the per-slot twist delta under any face turn state-independent, so the coordinate is a homomorphism and the sum ≡ 0 mod 3 invariant holds.

**Edge flip** uses the position-dependent Kociemba rule: the edge's primary color (its U/D color if it has one, else its F/B color) is oriented when it sits on the U/D face of a U/D slot, or on the F/B face of a middle slot. This makes F/B flip all four of their edges while U/D/L/R preserve all of them, so the flip sum is even for every Legal state.

## Considered options (rejected)

- **Swap R/L and F/B for D-slots.** The "obvious" fix — read the twist the same way for U-slots but swap the R/L-vs-F/B meaning for D-slots. It passes all 18 single moves but fails compositions (`F R' U2`, `R U R' U'`, `F R U R' F'`) because it is not a homomorphism: the per-slot twist delta becomes state-dependent. The body-diagonal-parity rule is the homomorphism-correct generalization.
- **Axis-mapping orientation (`solve/orientation.ts:cornerOrientation`).** Maps the U/D sticker's axis to y→0, z→1, x→2. Operationally adequate for the solver's "is this corner oriented?" question, but NOT cyclically consistent: a single R move gives corner-twist sum 4 ≡ 1 mod 3. Do not use it for parity checks — use the slot-ordered facelet read in `parityOf` instead.
- **Body-diagonal-angle quaternion approach.** Computing twist from the angle between the U/D sticker and the body diagonal. Removed (`cornerTwistOf`, `bodyDiagonal`, `colorRecord` are gone). The slot-ordered read off facelets is correct and simpler — do not reintroduce it.

## Consequences

The convention is pinned but split across two readers: `parityOf` reads it off facelets (for validation), `cornerOrientation`/the future `edgeOrientation` read it off the quaternion (for solving). They must agree on the same convention or validation and solving diverge. The solver's `edgeOrientation` (slice 04) must implement Bug B's position-dependent primary-color rule, not a naive "U/D sticker on U/D face" check.
