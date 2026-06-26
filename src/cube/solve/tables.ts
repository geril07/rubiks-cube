import { applyMove, type Move } from '../moves.ts'
import { solvedState, type CubeState, type CubieState } from '../model.ts'
import { ALL_MOVES } from './search.ts'
import { edgeOrientation, stickerFace } from './orientation.ts'
import type { SearchSpace } from './search.ts'

export const CORNER_SLOTS = [
  'URF', 'URB', 'ULF', 'ULB', 'DRF', 'DRB', 'DLF', 'DLB',
] as const
export const EDGE_SLOTS = [
  'UR', 'UF', 'UB', 'UL', 'DR', 'DF', 'DB', 'DL', 'FR', 'FL', 'BR', 'BL',
] as const

const CORNER_IDX = new Map<string, number>(CORNER_SLOTS.map((s, i) => [s, i]))
const EDGE_IDX = new Map<string, number>(EDGE_SLOTS.map((s, i) => [s, i]))

// body-diagonal parity of a corner slot: sign(x·y·z) of the slot's outward
// diagonal. Per ADR-0005: parity +1 (URF, ULB, DRB, DLF) → R/L is twist 1;
// parity −1 (URB, ULF, DRF, DLB) → F/B is twist 1.
function slotParity(slot: string): number {
  let x = 0, y = 0, z = 0
  for (const ch of slot) {
    if (ch === 'R') x = 1
    else if (ch === 'L') x = -1
    else if (ch === 'U') y = 1
    else if (ch === 'D') y = -1
    else if (ch === 'F') z = 1
    else if (ch === 'B') z = -1
  }
  return Math.sign(x * y * z)
}

// Corner twist per ADR-0005 (body-diagonal-parity slot ordering), read off the
// quaternion. 0 = U/D sticker on a U/D face; 1/2 = on R/L or F/B, decided per
// slot by body-diagonal parity. This is the cyclically-consistent convention
// (unlike the axis-based cornerOrientation), so the per-slot twist delta under
// any face turn is state- and id-independent and the sum ≡ 0 mod 3 invariant
// holds for every Legal state.
export function cornerTwist(c: CubieState): 0 | 1 | 2 {
  const udHome = c.id[0] // every corner id starts with U or D
  const udFace = stickerFace(c, udHome)
  if (udFace === 'U' || udFace === 'D') return 0
  const rlIsTwist1 = slotParity(c.slot) > 0
  const onRL = udFace === 'R' || udFace === 'L'
  return (onRL === rlIsTwist1) ? 1 : 2
}

// Compact cubie coordinate: for each corner/edge id index, its current slot
// index plus discrete orientation. This is a bijection with the physical state
// (centers fixed) and advances by pure table lookup — no quaternion math.
export interface FastState {
  cs: Int8Array // 8: slot index per corner id index
  ct: Int8Array // 8: corner twist (0/1/2)
  es: Int8Array // 12: slot index per edge id index
  ef: Int8Array // 12: edge flip (0/1)
}

// Precomputed move tables: for each move (indexed 0..17 in ALL_MOVES order),
// for each source slot, the destination slot and the orientation delta added to
// whatever cubie is at that source slot. Position permutation and (for the
// ADR-0005 convention) orientation delta are id-independent, so a single table
// per move suffices.
interface MoveTable {
  cornerPerm: Int8Array // [srcSlot] -> destSlot
  cornerDelta: Int8Array // [srcSlot] -> twist delta
  edgePerm: Int8Array
  edgeDelta: Int8Array
}

const MOVE_INDEX = new Map<string, number>(ALL_MOVES.map((m, i) => [`${m.face}${m.amount}`, i]))
const MOVE_TABLES: MoveTable[] = ALL_MOVES.map((m) => buildMoveTable(m))

function buildMoveTable(move: Move): MoveTable {
  const after = applyMove(solvedState(), move)
  const cornerPerm = new Int8Array(8)
  const cornerDelta = new Int8Array(8)
  for (const c of after.corners) {
    // c.id was at home slot = c.id before the move; now at c.slot with twist.
    const src = CORNER_IDX.get(c.id)!
    const dest = CORNER_IDX.get(c.slot)!
    cornerPerm[src] = dest
    cornerDelta[src] = cornerTwist(c)
  }
  const edgePerm = new Int8Array(12)
  const edgeDelta = new Int8Array(12)
  for (const e of after.edges) {
    const src = EDGE_IDX.get(e.id)!
    const dest = EDGE_IDX.get(e.slot)!
    edgePerm[src] = dest
    edgeDelta[src] = edgeOrientation(e)
  }
  return { cornerPerm, cornerDelta, edgePerm, edgeDelta }
}

export function toFast(state: CubeState): FastState {
  const cs = new Int8Array(8)
  const ct = new Int8Array(8)
  for (const c of state.corners) {
    const i = CORNER_IDX.get(c.id)!
    cs[i] = CORNER_IDX.get(c.slot)!
    ct[i] = cornerTwist(c)
  }
  const es = new Int8Array(12)
  const ef = new Int8Array(12)
  for (const e of state.edges) {
    const i = EDGE_IDX.get(e.id)!
    es[i] = EDGE_IDX.get(e.slot)!
    ef[i] = edgeOrientation(e)
  }
  return { cs, ct, es, ef }
}

export function fastApply(s: FastState, move: Move): FastState {
  const t = MOVE_TABLES[MOVE_INDEX.get(`${move.face}${move.amount}`)!]
  const ncs = new Int8Array(8)
  const nct = new Int8Array(8)
  for (let i = 0; i < 8; i++) {
    const src = s.cs[i]
    ncs[i] = t.cornerPerm[src]
    nct[i] = (s.ct[i] + t.cornerDelta[src]) % 3
  }
  const nes = new Int8Array(12)
  const nef = new Int8Array(12)
  for (let i = 0; i < 12; i++) {
    const src = s.es[i]
    nes[i] = t.edgePerm[src]
    nef[i] = (s.ef[i] + t.edgeDelta[src]) % 2
  }
  return { cs: ncs, ct: nct, es: nes, ef: nef }
}

export function fastKey(s: FastState): string {
  let out = ''
  for (let i = 0; i < 8; i++) out += s.cs[i] + ',' + s.ct[i] + ','
  for (let i = 0; i < 12; i++) out += s.es[i] + ',' + s.ef[i] + (i < 11 ? ',' : '')
  return out
}

// In-place apply: mutate s in place. Safe because each id-index i reads only its
// own cs[i]/ct[i]/es[i]/ef[i] and writes the same position — no cross-position
// aliasing. Used by IDA* alongside fastApplyInPlace(s, inverse) for undo, so the
// search hot loop allocates nothing.
export function fastApplyInPlace(s: FastState, move: Move): void {
  const t = MOVE_TABLES[MOVE_INDEX.get(`${move.face}${move.amount}`)!]
  for (let i = 0; i < 8; i++) {
    const src = s.cs[i]
    s.cs[i] = t.cornerPerm[src]
    s.ct[i] = (s.ct[i] + t.cornerDelta[src]) % 3
  }
  for (let i = 0; i < 12; i++) {
    const src = s.es[i]
    s.es[i] = t.edgePerm[src]
    s.ef[i] = (s.ef[i] + t.edgeDelta[src]) % 2
  }
}

export function cloneFast(s: FastState): FastState {
  return {
    cs: new Int8Array(s.cs), ct: new Int8Array(s.ct),
    es: new Int8Array(s.es), ef: new Int8Array(s.ef),
  }
}

export const fastSpace: SearchSpace<FastState> = { apply: fastApply, keyOf: fastKey }

// Advance a single edge's (slot, flip) under a move — used to build per-edge
// distance heuristics (the single-edge sub-state is closed: a move's effect on
// an edge depends only on its current slot).
export function edgeAdvance(slot: number, flip: number, move: Move): [number, number] {
  const t = MOVE_TABLES[MOVE_INDEX.get(`${move.face}${move.amount}`)!]
  return [t.edgePerm[slot], (flip + t.edgeDelta[slot]) % 2]
}

export { CORNER_IDX, EDGE_IDX }
