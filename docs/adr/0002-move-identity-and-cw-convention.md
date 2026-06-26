# Move identity and clockwise convention

A Move is the pair `(face, amount)` — `face ∈ {U,D,L,R,F,B}`, `amount ∈ {1, 2, −1}` — not the string `"R'"`. Strings live only in `notation.ts` (parse/print), so `moves.ts` stays a pure algebra over enums.

Clockwise is defined looking at a face from outside the cube along its inward-pointing normal: U-CW is about +Y, D-CW is about −Y. Same `amount` can mean opposite world-space axes. This convention is baked into the 18 permutation tables rather than left to callers, so no sign juggling leaks across module boundaries.

Faces are named by their fixed centers, so a Move always targets a fixed cube-frame slot (e.g. R is always the +X slice) regardless of camera orientation. A future "turn the slice facing me" UI is a camera→face mapping layer on top, not a change to the Move model — recorded here to keep that option open without baking world-relative moves into the core.