import type { CubeState } from '../model.ts'
import type { Move } from '../moves.ts'
import { applyMove } from '../moves.ts'
import { toFast } from './tables.ts'
import type { FastState } from './tables.ts'
import { solveCrossFast } from './cross.ts'
import { solveFirstLayerCornersFast } from './f2l-corners.ts'
import { solveMiddleEdgesFast } from './middle.ts'
import { solveLastLayerFast } from './last-layer.ts'

// FastState-native core: chains all phases on a single FastState, mutating it
// in place through to solved. No CubeState/Quaternion math — runs headless in a
// Web Worker. The four phases share one FastState object (each advances it),
// so there is no per-phase allocation.
export function solveLblFast(f: FastState): { state: FastState; moves: Move[] } {
  const cross = solveCrossFast(f)
  const fl = solveFirstLayerCornersFast(cross.state)
  const mid = solveMiddleEdgesFast(fl.state)
  const ll = solveLastLayerFast(mid.state)
  return {
    state: ll.state,
    moves: [...cross.moves, ...fl.moves, ...mid.moves, ...ll.moves],
  }
}

// Layer-by-layer solver: cross → F2L corners → middle edges → last layer.
// Each phase assumes the previous is solved and returns the updated state +
// moves. The concatenated moves solve the cube from any legal scramble.
export function solveLbl(state: CubeState): { state: CubeState; moves: Move[] } {
  const r = solveLblFast(toFast(state))
  let out = state
  for (const m of r.moves) out = applyMove(out, m)
  return { state: out, moves: r.moves }
}
