# Slot naming and orientation convention

Slots are named by the faces they touch in canonical order — U before D, R before L, F before B — giving 8 corners (`URF, URB, ULF, ULB, DRF, DRB, DLF, DLB`) and 12 edges (`UR, UF, UB, UL, DR, DF, DB, DL, FR, FL, BR, BL`).

Cubies are identified by their color signature and located at a slot: the model is `slot -> (cubieId, orientation)`, not a flat array. Identity and location are distinct, so we can say "the URF piece is at the DLB slot, twisted 1."

Orientation uses the standard cubie-library convention: corner twist is 0/1/2 measured by how far the U/D sticker has rotated from the U/D face; edge flip is 0/1, with the non-obvious property that F/B moves flip edges and U/D/L/R moves do not. This asymmetry surprises people but produces clean solver code and preserves parity invariants; the alternative ("first-color sticker on first face") is more intuitive but uglier and breaks invariants. Recorded so the solver and move tables stay consistent with one definition.