import type { CubeState } from '../model.ts'
import type { Move } from '../moves.ts'
import { solveLbl, solveLblFast } from './lbl.ts'
import { prepareCrossTable } from './cross.ts'
import { prepareLastLayerTable } from './last-layer.ts'
import type { FastState } from './tables.ts'

// Public solver API: solve any legal cube state, returning the move sequence.
export function solve(state: CubeState): Move[] {
  return solveLbl(state).moves
}

// FastState-native solver: takes a compact cubie coordinate (no Quaternion/
// Three.js dependency), returns the move sequence. The entry point used by the
// Web Worker — the 40-byte FastState is trivially transferable across the worker
// boundary.
export function solveFast(f: FastState): Move[] {
  return solveLblFast(f).moves
}

// Eagerly build both lazy solution tables (cross BFS + last-layer macro/BFS).
// Call once at startup so the first solve is instant. ~3s one-time cost.
export function prepareSolver(): void {
  prepareCrossTable()
  prepareLastLayerTable()
}

export { solveLbl, solveLblFast } from './lbl.ts'
export { solveCross, solveCrossFast, prepareCrossTable } from './cross.ts'
export { solveFirstLayerCorners, solveFirstLayerCornersFast } from './f2l-corners.ts'
export { solveMiddleEdges, solveMiddleEdgesFast, isMiddleSolved } from './middle.ts'
export { solveLastLayer, solveLastLayerFast, prepareLastLayerTable, isLastLayerSolved } from './last-layer.ts'
export { isCrossSolved } from './cross.ts'
export { isFirstLayerSolved } from './f2l-corners.ts'
