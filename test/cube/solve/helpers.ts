// Shared helpers for solve tests.
import { Quaternion } from 'three'
import { solvedState } from '../../../src/cube/model.ts'
import type { CubeState } from '../../../src/cube/model.ts'
import { applyMove } from '../../../src/cube/moves.ts'
import type { Move } from '../../../src/cube/moves.ts'

// Apply a sequence of moves to the solved state.
export function applySeq(moves: Move[]): CubeState {
  let s = solvedState()
  for (const m of moves) s = applyMove(s, m)
  return s
}

// A seeded PRNG (linear congruential) for deterministic scrambles.
export function makeRng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

// Generate a deterministic scramble of the given length with the WCA rules:
// no immediate undo, no same face back-to-back.
export function scrambleMoves(seed: number, length = 20): Move[] {
  const rand = makeRng(seed)
  const faces: Move['face'][] = ['U', 'D', 'L', 'R', 'F', 'B']
  const amts: Move['amount'][] = [1, 2, -1]
  const moves: Move[] = []
  let lastFace: Move['face'] | null = null
  let lastOpposite: Move['face'] | null = null
  const opposite: Record<Move['face'], Move['face']> = {
    U: 'D', D: 'U', L: 'R', R: 'L', F: 'B', B: 'F',
  }
  for (let i = 0; i < length; i++) {
    let face: Move['face']
    do {
      face = faces[Math.floor(rand() * 6)]
    } while (face === lastFace || (moves.length > 0 && face === lastOpposite && sameAxis(face, lastFace!)))
    const amount = amts[Math.floor(rand() * 3)]
    moves.push({ face, amount })
    lastOpposite = opposite[face]
    lastFace = face
  }
  return moves
}

function sameAxis(a: Move['face'], b: Move['face']): boolean {
  const axis: Record<Move['face'], 'x' | 'y' | 'z'> = {
    U: 'y', D: 'y', L: 'x', R: 'x', F: 'z', B: 'z',
  }
  return axis[a] === axis[b]
}

// Check whether a cube state is solved: every cubie at home with identity orientation.
export function isSolved(state: CubeState): boolean {
  const identity = new Quaternion()
  for (const c of state.corners) {
    if (c.slot !== c.id) return false
    if (c.quat.angleTo(identity) > 1e-6) return false
  }
  for (const e of state.edges) {
    if (e.slot !== e.id) return false
    if (e.quat.angleTo(identity) > 1e-6) return false
  }
  return true
}

// Apply a solution to a state and return the result.
export function applySolution(state: CubeState, solution: Move[]): CubeState {
  let s = state
  for (const m of solution) s = applyMove(s, m)
  return s
}