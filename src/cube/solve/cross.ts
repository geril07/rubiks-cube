import type { CubeState, EdgeSlot } from '../model.ts'
import type { Move } from '../moves.ts'
import { applyMove } from '../moves.ts'
import { ALL_MOVES, inverseMove } from './search.ts'
import { toFast, fastApplyInPlace, edgeAdvance, EDGE_SLOTS } from './tables.ts'
import type { FastState } from './tables.ts'
import { edgeOrientation } from './orientation.ts'

export const CROSS_EDGES: EdgeSlot[] = ['DF', 'DR', 'DB', 'DL']

// id-index (in EDGE_SLOTS order) of each cross edge — solved means es[i]===i.
export const CROSS_IDS: number[] = CROSS_EDGES.map((id) => EDGE_SLOTS.indexOf(id))

export function isCrossSolved(s: CubeState): boolean {
  for (const id of CROSS_EDGES) {
    const e = s.edges.find((x) => x.id === id)!
    if (e.slot !== id) return false
    if (edgeOrientation(e) !== 0) return false
  }
  return true
}

export function isCrossSolvedFast(f: FastState): boolean {
  for (const i of CROSS_IDS) {
    if (f.es[i] !== i) return false
    if (f.ef[i] !== 0) return false
  }
  return true
}

// ── Cross solution table ───────────────────────────────────────────────────
// The cross sub-state — the (slot, flip) of each of the 4 cross edges — is
// closed under face turns: a move's effect on an edge depends only on its
// current slot (tables.edgeAdvance), so the 4 edges evolve independently and
// never collide (the underlying move permutation is a bijection on slots). A
// BFS from the solved cross therefore reaches every legal cross sub-state with
// an exact shortest distance. Storing the predecessor + move index per state
// makes solving a lookup + chain reconstruction: no search, no backtracking,
// no per-scramble variance. (Replaces the prior IDA* with a max-single-edge
// heuristic, whose depth-7/8 solves blew up to ~1s on hard scrambles.)

// Pack 4 (slot, flip) pairs into a base-24 int: each pair → slot*2+flip (0..23).
function packCross(es: Int8Array, ef: Int8Array): number {
  let h = 0
  for (let k = 0; k < CROSS_IDS.length; k++) {
    h = h * 24 + (es[k] * 2 + ef[k])
  }
  return h | 0
}

const CROSS_KEY_SPACE = 24 ** 4 // 331776 — superset; only valid states are visited
const SOLVED_CROSS_KEY = packCross(new Int8Array(CROSS_IDS), new Int8Array(CROSS_IDS.length))

interface CrossTable {
  pred: Int32Array // [key] = predecessor key (root self-loops to itself)
  mi: Int8Array // [key] = ALL_MOVES index from predecessor to here (-1 = root)
}

let _crossTable: CrossTable | null = null

function buildCrossTable(): CrossTable {
  const pred = new Int32Array(CROSS_KEY_SPACE).fill(-1)
  const mi = new Int8Array(CROSS_KEY_SPACE).fill(-1)
  pred[SOLVED_CROSS_KEY] = SOLVED_CROSS_KEY

  // Reusable unpack buffers.
  const es = new Int8Array(CROSS_IDS.length)
  const ef = new Int8Array(CROSS_IDS.length)

  let frontier: number[] = [SOLVED_CROSS_KEY]
  while (frontier.length > 0) {
    const next: number[] = []
    for (const key of frontier) {
      // Unpack key → (es, ef) for the 4 cross edges.
      let h = key
      for (let k = CROSS_IDS.length - 1; k >= 0; k--) {
        const v = h % 24
        h = (h - v) / 24
        ef[k] = v & 1
        es[k] = v >> 1
      }
      for (let moveIdx = 0; moveIdx < ALL_MOVES.length; moveIdx++) {
        const move = ALL_MOVES[moveIdx]
        let nk = 0
        for (let k = 0; k < CROSS_IDS.length; k++) {
          const [ns, nf] = edgeAdvance(es[k], ef[k], move)
          nk = nk * 24 + (ns * 2 + nf)
        }
        nk = nk | 0
        if (pred[nk] !== -1) continue
        pred[nk] = key
        mi[nk] = moveIdx
        next.push(nk)
      }
    }
    frontier = next
  }
  return { pred, mi }
}

function crossTable(): CrossTable {
  if (_crossTable === null) _crossTable = buildCrossTable()
  return _crossTable
}

// Eagerly build the cross solution table. Call once at startup (e.g. in a
// worker) so the first solveCrossFast call is instant.
export function prepareCrossTable(): void {
  crossTable()
}

// ── Public API ─────────────────────────────────────────────────────────────

// FastState-native core: takes/returns a FastState, mutating it in place to the
// solved-cross state. The move sequence is an exact BFS-table lookup — no
// search, no backtracking, no per-scramble variance.
export function solveCrossFast(f: FastState): { state: FastState; moves: Move[] } {
  if (isCrossSolvedFast(f)) return { state: f, moves: [] }
  const es = new Int8Array(CROSS_IDS.length)
  const ef = new Int8Array(CROSS_IDS.length)
  for (let k = 0; k < CROSS_IDS.length; k++) {
    es[k] = f.es[CROSS_IDS[k]]
    ef[k] = f.ef[CROSS_IDS[k]]
  }
  const key = packCross(es, ef)
  const t = crossTable()
  if (t.pred[key] === -1) throw new Error('solveCross: state not in solution table')

  // Reconstruct macro sequence by following predecessor chain from target back
  // to solved. seq = [m_n, ..., m_1] where target = m_n(...m_1(solved)). To
  // solve target → solved, apply the inverse of each in order: m_n⁻¹, ..., m_1⁻¹.
  const seq: number[] = []
  let k = key
  while (k !== SOLVED_CROSS_KEY) {
    seq.push(t.mi[k])
    k = t.pred[k]
  }
  const moves: Move[] = seq.map((mi) => inverseMove(ALL_MOVES[mi]))
  for (const m of moves) fastApplyInPlace(f, m)
  return { state: f, moves }
}

// CubeState wrapper: converts to FastState, solves, and applies the moves to the
// real CubeState for the returned state. The moves are identical to
// solveCrossFast's; only the state representation differs.
export function solveCross(state: CubeState): { state: CubeState; moves: Move[] } {
  const r = solveCrossFast(toFast(state))
  let out = state
  for (const m of r.moves) out = applyMove(out, m)
  return { state: out, moves: r.moves }
}
