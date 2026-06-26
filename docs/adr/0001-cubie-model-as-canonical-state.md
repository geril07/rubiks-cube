# Cubie model as canonical state

The Cube State is stored at the cubie level (8 corners + 12 edges, each with a slot and orientation; 6 fixed centers) rather than as 54 facelets. We chose this because the Layer-by-Layer solver reasons about pieces ("this corner to that slot, twisted how"), the 3D view maps a cubie's slot+orientation directly to a mesh transform with no sticker re-derivation, and the 18 moves are small invertible permutations over 20 pieces rather than 54 stickers.

The cost is a hand-written, tested cubie↔facelet bijection (`facelet.ts`) used only at the I/O boundary (the 2D net editor serializes to facelets; we convert to the cubie model to solve). Facelets remain a conversion format, never the canonical form.