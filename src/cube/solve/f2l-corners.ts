import type { CubeState, CornerSlot } from '../model.ts'
import type { Move } from '../moves.ts'
import { applyMove } from '../moves.ts'
import { bfs } from './search.ts'
import { toFast, fastApplyInPlace, fastSpace, CORNER_SLOTS, cornerTwist } from './tables.ts'
import type { FastState } from './tables.ts'
import { isCrossSolvedFast, isCrossSolved } from './cross.ts'

// Solve order for the four D-layer (first-layer) corners.
export const FIRST_LAYER_CORNERS: CornerSlot[] = ['DRF', 'DRB', 'DLF', 'DLB']

// The two side faces of each D-corner slot. The 3-move insertion trigger using
// either face (e.g. R' U R for DRF) preserves the cross AND every other
// D-corner, so corners can be solved one at a time.
const CORNER_FACES: Record<string, [string, string]> = {
  DRF: ['R', 'F'],
  DRB: ['R', 'B'],
  DLF: ['F', 'L'],
  DLB: ['B', 'L'],
}

const FACES: Move['face'][] = ['U', 'D', 'R', 'L', 'F', 'B']

function movesForFaces(faces: string[]): Move[] {
  const set = new Set(faces)
  const out: Move[] = []
  for (const f of FACES) {
    if (!set.has(f)) continue
    out.push({ face: f, amount: 1 }, { face: f, amount: 2 }, { face: f, amount: -1 })
  }
  return out
}

function cornerSolvedFast(f: FastState, idIdx: number): boolean {
  return f.cs[idIdx] === idIdx && f.ct[idIdx] === 0
}

export function isFirstLayerSolved(s: CubeState): boolean {
  if (!isCrossSolved(s)) return false
  for (const id of FIRST_LAYER_CORNERS) {
    const c = s.corners.find((x) => x.id === id)!
    if (c.slot !== id) return false
    if (cornerTwist(c) !== 0) return false
  }
  return true
}

function applyMoves(s: CubeState, moves: Move[]): CubeState {
  let out = s
  for (const m of moves) out = applyMove(out, m)
  return out
}

// FastState-native core: mutates f in place to the first-layer-solved state.
// The BFS runs on the compact coordinate (fastSpace); moves are applied in place
// between phases. Preserves the cross and all already-solved corners.
export function solveFirstLayerCornersFast(f: FastState): { state: FastState; moves: Move[] } {
  const all: Move[] = []
  const prior: number[] = []

  for (const id of FIRST_LAYER_CORNERS) {
    const idIdx = CORNER_SLOTS.indexOf(id)
    const priorOK = (ff: FastState) => prior.every((p) => cornerSolvedFast(ff, p))
    const insertGoal = (ff: FastState) =>
      cornerSolvedFast(ff, idIdx) && isCrossSolvedFast(ff) && priorOK(ff)

    if (insertGoal(f)) {
      prior.push(idIdx)
      continue
    }

    // Eject if the corner is in the D layer (slot index >= 4).
    if (f.cs[idIdx] >= 4) {
      const curSlot = CORNER_SLOTS[f.cs[idIdx]]
      const ejectMoves = movesForFaces(['U', ...CORNER_FACES[curSlot]])
      const ejectGoal = (ff: FastState) => ff.cs[idIdx] < 4 && isCrossSolvedFast(ff) && priorOK(ff)
      const er = bfs(f, ejectGoal, ejectMoves, 5, fastSpace)
      if (!er) throw new Error(`F2L corner eject failed for ${id}`)
      all.push(...er.moves)
      for (const m of er.moves) fastApplyInPlace(f, m)
    }

    // Insert from the U layer.
    const insertMoves = movesForFaces(['U', ...CORNER_FACES[id]])
    const ir = bfs(f, insertGoal, insertMoves, 8, fastSpace)
    if (!ir) throw new Error(`F2L corner insert failed for ${id}`)
    all.push(...ir.moves)
    for (const m of ir.moves) fastApplyInPlace(f, m)
    prior.push(idIdx)
  }

  return { state: f, moves: all }
}

// CubeState wrapper.
export function solveFirstLayerCorners(state: CubeState): { state: CubeState; moves: Move[] } {
  const r = solveFirstLayerCornersFast(toFast(state))
  return { state: applyMoves(state, r.moves), moves: r.moves }
}
