import type { CubeState } from '../model.ts'
import { solvedState } from '../model.ts'
import type { Move } from '../moves.ts'
import { applyMove } from '../moves.ts'
import { inverseMove } from './search.ts'
import { toFast, fastApplyInPlace, cloneFast } from './tables.ts'
import type { FastState } from './tables.ts'
import { isMiddleSolved } from './middle.ts'

// ── Last-layer state (position-indexed, packed into int32) ─────────────────
// Positions: corners 0=URF,1=URB,2=ULF,3=ULB  edges 0=UR,1=UF,2=UB,3=UL
// Pack: 7 bits per position × 4 = 28 bits. Each position pack:
//   cp(2) << 5 | co(2) << 3 | ep(2) << 1 | ef(1)

interface MacroEffect {
  destC: Int8Array // corner: position p → destC[p]
  deltaC: Int8Array
  destE: Int8Array // edge: position p → destE[p]
  deltaE: Int8Array
  moves: Move[]
}

function packLL(cp: Int8Array, co: Int8Array, ep: Int8Array, ef: Int8Array): number {
  let h = 0
  for (let i = 0; i < 4; i++) {
    h = (h * 128) + (cp[i] << 5) | (co[i] << 3) | (ep[i] << 1) | ef[i]
  }
  return h | 0
}

const SOLVED_KEY = packLL(
  new Int8Array([0, 1, 2, 3]), new Int8Array(4),
  new Int8Array([0, 1, 2, 3]), new Int8Array(4),
)

function fastToLLKey(f: FastState): number {
  const cp = new Int8Array(4), co = new Int8Array(4), ep = new Int8Array(4), ef = new Int8Array(4)
  for (let i = 0; i < 4; i++) {
    cp[f.cs[i]] = i; co[f.cs[i]] = f.ct[i]
    ep[f.es[i]] = i; ef[f.es[i]] = f.ef[i]
  }
  return packLL(cp, co, ep, ef)
}

// ── Macro discovery: DFS from solved for F2L-preserving sequences ──────────

function isF2lSolved(f: FastState): boolean {
  for (let i = 4; i <= 7; i++) {
    if (f.cs[i] !== i || f.ct[i] !== 0) return false
    if (f.es[i] !== i || f.ef[i] !== 0) return false
  }
  for (let i = 8; i <= 11; i++) {
    if (f.es[i] !== i || f.ef[i] !== 0) return false
  }
  return true
}

function buildMacros(faces: string[], maxDepth: number): MacroEffect[] {
  const FACES: Move['face'][] = ['U', 'D', 'R', 'L', 'F', 'B']
  const set = new Set(faces)
  const moves: Move[] = []
  for (const fc of FACES) {
    if (!set.has(fc)) continue
    moves.push({ face: fc, amount: 1 }, { face: fc, amount: 2 }, { face: fc, amount: -1 })
  }

  const start = cloneFast(toFast(solvedState()))
  const path: Move[] = []
  const best = new Map<string, Move[]>()

  function dfs(g: number, lastFace: string | null): void {
    if (g > 0 && isF2lSolved(start)) {
      const f = start
      let k = ''
      for (let i = 0; i < 4; i++) k += f.cs[i] + ',' + f.ct[i] + ','
      for (let i = 0; i < 4; i++) k += f.es[i] + ',' + f.ef[i] + ','
      if (!best.has(k) || g < best.get(k)!.length) {
        best.set(k, path.slice(0, g))
      }
    }
    if (g >= maxDepth) return
    for (const move of moves) {
      if (move.face === lastFace) continue
      fastApplyInPlace(start, move)
      path[g] = move
      dfs(g + 1, move.face)
      fastApplyInPlace(start, inverseMove(move))
    }
  }

  dfs(0, null)

  const macros: MacroEffect[] = []
  for (const [, moves] of best) {
    const f = cloneFast(toFast(solvedState()))
    for (const m of moves) fastApplyInPlace(f, m)
    macros.push({
      destC: new Int8Array([f.cs[0], f.cs[1], f.cs[2], f.cs[3]]),
      deltaC: new Int8Array([f.ct[0], f.ct[1], f.ct[2], f.ct[3]]),
      destE: new Int8Array([f.es[0], f.es[1], f.es[2], f.es[3]]),
      deltaE: new Int8Array([f.ef[0], f.ef[1], f.ef[2], f.ef[3]]),
      moves,
    })
  }
  return macros
}

// ── Precomputed solution table ─────────────────────────────────────────────
// BFS from solved to all reachable LL states. For each state, store the
// predecessor key and the macro index that leads back toward solved.
// Then solving any state = follow the chain back to solved.

interface SolutionTable {
  macros: MacroEffect[]
  // key → { predKey, macroIdx toward solved }
  pred: Map<number, { p: number; mi: number }>
}

let _table: SolutionTable | null = null

function buildTable(): SolutionTable {
  const ms = [...buildMacros(['U', 'R'], 12), ...buildMacros(['U', 'R', 'F'], 8)]
  // Dedup macros by effect (same destC/deltaC/destE/deltaE).
  const seen = new Map<string, number>()
  const unique: MacroEffect[] = []
  for (const m of ms) {
    const k = `${[...m.destC].join(',')},${[...m.deltaC].join(',')},${[...m.destE].join(',')},${[...m.deltaE].join(',')}`
    if (seen.has(k)) continue
    seen.set(k, unique.length)
    unique.push(m)
  }

  const pred = new Map<number, { p: number; mi: number }>()
  pred.set(SOLVED_KEY, { p: -1, mi: -1 })

  // BFS from solved outward.
  let frontier: number[] = [SOLVED_KEY]
  // Reusable unpack buffer.
  const cp = new Int8Array(4), co = new Int8Array(4), ep = new Int8Array(4), ef = new Int8Array(4)
  const ncp = new Int8Array(4), nco = new Int8Array(4), nep = new Int8Array(4), nef = new Int8Array(4)

  while (frontier.length > 0) {
    const nextFrontier: number[] = []
    for (const key of frontier) {
      // Unpack key into cp, co, ep, ef.
      let h = key
      for (let i = 3; i >= 0; i--) {
        const chunk = h % 128
        h = (h - chunk) / 128
        ef[i] = chunk & 1
        ep[i] = (chunk >> 1) & 3
        co[i] = (chunk >> 3) & 3
        cp[i] = (chunk >> 5) & 3
      }
      // Try each macro.
      for (let mi = 0; mi < unique.length; mi++) {
        const m = unique[mi]
        for (let i = 0; i < 4; i++) {
          const dc = m.destC[i]
          ncp[dc] = cp[i]
          nco[dc] = (co[i] + m.deltaC[i]) % 3
          const de = m.destE[i]
          nep[de] = ep[i]
          nef[de] = (ef[i] + m.deltaE[i]) % 2
        }
        const nk = packLL(ncp, nco, nep, nef)
        if (pred.has(nk)) continue
        pred.set(nk, { p: key, mi })
        nextFrontier.push(nk)
      }
    }
    frontier = nextFrontier
  }

  return { macros: unique, pred }
}

function table(): SolutionTable {
  if (_table === null) _table = buildTable()
  return _table
}

// Eagerly build the last-layer solution table (macro DFS + BFS over ~62K
// states, ~2-3s). Call once at startup (e.g. in a worker) so the first
// solveLastLayerFast call is instant.
export function prepareLastLayerTable(): void {
  table()
}

// ── Public API ─────────────────────────────────────────────────────────────

function isLLSolvedFast(f: FastState): boolean {
  for (let i = 0; i < 4; i++) {
    if (f.cs[i] !== i || f.ct[i] !== 0) return false
    if (f.es[i] !== i || f.ef[i] !== 0) return false
  }
  return true
}

export function isLastLayerSolved(s: CubeState): boolean {
  return isMiddleSolved(s) && isLLSolvedFast(toFast(s))
}

// FastState-native core: mutates f in place to the solved state. Looks up the
// precomputed BFS solution table and reconstructs the move sequence by following
// the predecessor chain to solved.
export function solveLastLayerFast(f: FastState): { state: FastState; moves: Move[] } {
  if (isLLSolvedFast(f)) return { state: f, moves: [] }
  if (!isF2lSolved(f)) throw new Error('solveLastLayer: F2L not solved')

  const t = table()
  let key = fastToLLKey(f)
  if (!t.pred.has(key)) {
    throw new Error('solveLastLayer: state not in solution table (macros incomplete)')
  }

  // Reconstruct macro sequence by following predecessor chain from target
  // back to solved. macroSeq = [C, B, A] where target = C(B(A(solved))).
  // To solve target → solved, apply inverse of each macro in order: C⁻¹, B⁻¹, A⁻¹.
  const macroSeq: number[] = []
  while (key !== SOLVED_KEY) {
    const node = t.pred.get(key)!
    macroSeq.push(node.mi)
    key = node.p
  }

  const moves: Move[] = []
  for (const mi of macroSeq) {
    const inv = t.macros[mi].moves.slice().reverse().map(inverseMove)
    moves.push(...inv)
  }

  for (const m of moves) fastApplyInPlace(f, m)
  return { state: f, moves }
}

// CubeState wrapper.
export function solveLastLayer(state: CubeState): { state: CubeState; moves: Move[] } {
  const r = solveLastLayerFast(toFast(state))
  let out = state
  for (const m of r.moves) out = applyMove(out, m)
  return { state: out, moves: r.moves }
}
