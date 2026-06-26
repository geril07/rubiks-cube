# 05 — Facelet conversion + validation (pure domain)

Status: ready-for-agent

## Parent

Builds on the full 18-move algebra from slice 02. This is the pure-domain prefactoring that makes Real-cube Mode (slice 06) possible: the cubie↔facelet conversion and the three-check validation, both pure TS with no UI.

## What to build

The conversion boundary between facelets (the 54-sticker serialization format) and the Cube State (the canonical cubie model), plus the validation that blocks Solve on illegal painted states. No UI in this slice — it's verifiable by tests.

End-to-end behavior (library only, no UI):
- `facelet.ts` provides two pure functions:
  - `toFacelets(state): Facelets` — serializes a Cube State to the 54-sticker URFDLB-ordered array.
  - `fromFacelets(facelets): Cube State` — parses a 54-sticker array into the canonical cubie model.
- The bijection must hold: `fromFacelets(toFacelets(state)) = state` and `toFacelets(fromFacelets(facelets)) = facelets` for any Legal state.
- `validateFacelets(facelets): { ok: true } | { ok: false, errors: ValidationError[] }` implements exactly three checks per CONTEXT.md, no more:
  1. **Color counts** — exactly 9 of each of the 6 colors (W/Y/R/O/B/G).
  2. **Piece feasibility** — every corner's 3 facelets form a real corner color signature (one of the 8 valid corners); every edge's 2 facelets form a real edge signature (one of the 12 valid edges).
  3. **Parity** — corner-twist sum ≡ 0 mod 3, edge-flip sum ≡ 0 mod 2, corner and edge permutation parities equal.
- On failure, `errors` reports which check failed and where (which sticker positions are implicated) — enough for the Net Editor in slice 06 to highlight offending stickers.
- We never auto-correct a painted state (per CONTEXT.md's explicit rule): `fromFacelets` may assume valid input, or throw on invalid — it does not silently fix. The UI must call `validateFacelets` first and only call `fromFacelets` on a green validation.

## Acceptance criteria

- [ ] `toFacelets(state)` serializes a Cube State to a 54-sticker URFDLB-ordered array
- [ ] `fromFacelets(facelets)` parses a 54-sticker array into the canonical Cube State
- [ ] Bijection holds: `fromFacelets(toFacelets(state)) = state` and `toFacelets(fromFacelets(facelets)) = facelets` for any Legal state
- [ ] `validateFacelets` implements exactly three checks (counts, feasibility, parity) — no fourth, no fewer
- [ ] On failure, returns `{ ok: false, errors }` identifying which check and which sticker positions are implicated (enough for the Net Editor to highlight)
- [ ] On success, returns `{ ok: true }`
- [ ] `fromFacelets` does not auto-correct; it either assumes valid input or throws — the UI must validate first
- [ ] **Tier 2 domain tests pass:** `fromFacelets(toFacelets(state)) = state` for a sample of Legal states (seeded random scrambles); `validateFacelets(toFacelets(scramble(state)))` always returns `{ ok: true }`
- [ ] **Validation rejection tests pass:** hand-crafted illegal facelet arrays (wrong color count, impossible corner, parity violation) are each rejected by `validateFacelets` with the correct error category

## Blocked by

- 02-all-18-moves-notation-queue-keyboard.md (needs the Cube State model and move algebra; does NOT need slice 03 or 04)