import { describe, expect, it } from 'vitest'
import { solvedState } from '../../../src/cube/model.ts'
import type { CubeState } from '../../../src/cube/model.ts'
import { solveCross, isCrossSolved } from '../../../src/cube/solve/cross.ts'
import {
  solveFirstLayerCorners,
  isFirstLayerSolved,
  FIRST_LAYER_CORNERS,
} from '../../../src/cube/solve/f2l-corners.ts'
import { cornerTwist } from '../../../src/cube/solve/tables.ts'
import { applySeq, scrambleMoves } from './helpers.ts'

function dCornersSolved(s: CubeState): boolean {
  for (const id of FIRST_LAYER_CORNERS) {
    const c = s.corners.find((x) => x.id === id)!
    if (c.slot !== id) return false
    if (cornerTwist(c) !== 0) return false
  }
  return true
}

describe('solveFirstLayerCorners', () => {
  it('returns no moves for the solved state and keeps the first layer solved', () => {
    const r = solveFirstLayerCorners(solvedState())
    expect(r.moves).toEqual([])
    expect(isFirstLayerSolved(r.state)).toBe(true)
  })

  it('solves all four D-corners and preserves the cross for a seeded scramble', () => {
    const s0 = applySeq(scrambleMoves(3))
    const cross = solveCross(s0)
    const r = solveFirstLayerCorners(cross.state)
    expect(isCrossSolved(r.state)).toBe(true)
    expect(dCornersSolved(r.state)).toBe(true)
    expect(isFirstLayerSolved(r.state)).toBe(true)
  })

  it('solves the first layer for many seeded scrambles (cross first)', () => {
    for (let seed = 0; seed < 30; seed++) {
      const s0 = applySeq(scrambleMoves(seed))
      const cross = solveCross(s0)
      const r = solveFirstLayerCorners(cross.state)
      expect(isCrossSolved(r.state)).toBe(true)
      expect(dCornersSolved(r.state)).toBe(true)
    }
  }, 30000)
})
