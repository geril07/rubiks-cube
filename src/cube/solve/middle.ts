import type { CubeState, EdgeSlot } from '../model.ts'
import type { Move } from '../moves.ts'
import { applyMove } from '../moves.ts'
import { inverseMove } from './search.ts'
import { toFast, fastApplyInPlace, EDGE_SLOTS } from './tables.ts'
import type { FastState } from './tables.ts'
import { isFirstLayerSolved } from './f2l-corners.ts'
import { edgeOrientation } from './orientation.ts'

export const MIDDLE_EDGES: EdgeSlot[] = ['FR', 'FL', 'BR', 'BL']

const MIDDLE_SLOT_IDS: Set<number> = new Set(MIDDLE_EDGES.map((id) => EDGE_SLOTS.indexOf(id)))

// Parse a space-separated alg notation string into Move[].
function parseAlg(notation: string): Move[] {
  return notation.split(' ').map((tok) => {
    const face = tok[0] as Move['face']
    const amount = tok.length === 1 ? 1 : tok[1] === '2' ? 2 : -1
    return { face, amount: amount as Move['amount'] }
  })
}

// Clean insert algs: for each middle slot, for each (U-slot, flip) the target
// edge can be in, the sequence that inserts it home while preserving the first
// layer AND every other middle edge. Found by DFS from solved over the slot's
// two side faces + U, verified clean (other middle edges stay home). Each alg
// is the inverse of a setup that moves the slot's edge from home to that U-slot
// with that flip, preserving the first layer + all other middle edges.
const INSERT_ALGS: Record<string, Record<string, Move[]>> = {
  FR: {
    'UF,0': parseAlg("F' U2 F U2 R' U R"),
    'UF,1': parseAlg("U R' U' R F R F' R'"),
    'UR,0': parseAlg("U' F' U F U R' U' R"),
    'UR,1': parseAlg("R' U2 R U2 F' U' F"),
    'UB,0': parseAlg("F' U F U R' U' R"),
    'UB,1': parseAlg("U' R' U' R F R F' R'"),
    'UL,0': parseAlg("U F' U F U R' U' R"),
    'UL,1': parseAlg("R' U' R F R F' R'"),
  },
  FL: {
    'UF,0': parseAlg("F U2 F' U2 L U' L'"),
    'UF,1': parseAlg("F' L F U F U' F' L'"),
    'UR,0': parseAlg("U' F U F' U' L U' L'"),
    'UR,1': parseAlg("L U L' F' L' F L"),
    'UB,0': parseAlg("F U F' U' L U' L'"),
    'UB,1': parseAlg("U L U L' F' L' F L"),
    'UL,0': parseAlg("U F U F' U' L U' L'"),
    'UL,1': parseAlg("L U2 L' U2 F U F'"),
  },
  BR: {
    'UB,0': parseAlg("B U2 B' U2 R U' R'"),
    'UB,1': parseAlg("B' R B U B U' B' R'"),
    'UR,0': parseAlg("U B U B' U' R U' R'"),
    'UR,1': parseAlg("R U2 R' U2 B U B'"),
    'UF,0': parseAlg("B U B' U' R U' R'"),
    'UF,1': parseAlg("U R U R' B' R' B R"),
    'UL,0': parseAlg("U' B U B' U' R U' R'"),
    'UL,1': parseAlg("R U R' B' R' B R"),
  },
  BL: {
    'UB,0': parseAlg("B' U2 B U2 L' U L"),
    'UB,1': parseAlg("U L' U' L B L B' L'"),
    'UL,0': parseAlg("U' B' U B U L' U' L"),
    'UL,1': parseAlg("L' U2 L U2 B' U' B"),
    'UF,0': parseAlg("B' U B U L' U' L"),
    'UF,1': parseAlg("U' L' U' L B L B' L'"),
    'UR,0': parseAlg("U B' U B U L' U' L"),
    'UR,1': parseAlg("L' U' L B L B' L'"),
  },
}

// Eject an edge from a middle slot: the inverse of that slot's shortest insert
// alg. Kicks whatever is in the slot to the U layer, preserving the first layer
// and all other middle edges (clean).
function ejectAlg(slot: string): Move[] {
  const algs = INSERT_ALGS[slot]
  let shortest: Move[] | null = null
  for (const key in algs) {
    if (shortest === null || algs[key].length < shortest.length) {
      shortest = algs[key]
    }
  }
  return shortest!.slice().reverse().map(inverseMove)
}

function edgeSolvedFast(f: FastState, idIdx: number): boolean {
  return f.es[idIdx] === idIdx && f.ef[idIdx] === 0
}

export function isMiddleSolved(s: CubeState): boolean {
  if (!isFirstLayerSolved(s)) return false
  for (const id of MIDDLE_EDGES) {
    const e = s.edges.find((x) => x.id === id)!
    if (e.slot !== id || edgeOrientation(e) !== 0) return false
  }
  return true
}

function applyMoves(s: CubeState, moves: Move[]): CubeState {
  let out = s
  for (const m of moves) out = applyMove(out, m)
  return out
}

// FastState-native core: mutates f in place to the middle-solved state. For each
// edge: eject from a wrong middle slot if needed, then insert from the U layer
// using the precomputed clean alg. Both steps preserve the first layer and all
// other middle edges.
export function solveMiddleEdgesFast(f: FastState): { state: FastState; moves: Move[] } {
  const all: Move[] = []

  for (const id of MIDDLE_EDGES) {
    const idIdx = EDGE_SLOTS.indexOf(id)

    if (edgeSolvedFast(f, idIdx)) continue

    // Eject if the edge is in a middle slot.
    if (MIDDLE_SLOT_IDS.has(f.es[idIdx])) {
      const curSlot = EDGE_SLOTS[f.es[idIdx]]
      const eject = ejectAlg(curSlot)
      all.push(...eject)
      for (const m of eject) fastApplyInPlace(f, m)
    }

    // Insert from the U layer.
    const uSlot = EDGE_SLOTS[f.es[idIdx]]
    const flip = f.ef[idIdx]
    const key = `${uSlot},${flip}`
    const insert = INSERT_ALGS[id][key]
    if (!insert) throw new Error(`no insert alg for ${id} from ${uSlot} flip${flip}`)
    all.push(...insert)
    for (const m of insert) fastApplyInPlace(f, m)
  }

  return { state: f, moves: all }
}

// CubeState wrapper.
export function solveMiddleEdges(state: CubeState): { state: CubeState; moves: Move[] } {
  const r = solveMiddleEdgesFast(toFast(state))
  return { state: applyMoves(state, r.moves), moves: r.moves }
}
