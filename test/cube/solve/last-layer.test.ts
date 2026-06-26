import { describe, expect, it } from 'vitest'
import { solvedState } from '../../../src/cube/model.ts'
import { solveCross } from '../../../src/cube/solve/cross.ts'
import { solveFirstLayerCorners, isFirstLayerSolved } from '../../../src/cube/solve/f2l-corners.ts'
import { solveMiddleEdges, isMiddleSolved } from '../../../src/cube/solve/middle.ts'
import { solveLastLayer, isLastLayerSolved } from '../../../src/cube/solve/last-layer.ts'
import { applySeq, scrambleMoves, isSolved } from './helpers.ts'

function solveToF2L(seed: number) {
  const s0 = applySeq(scrambleMoves(seed))
  const cross = solveCross(s0)
  const fl = solveFirstLayerCorners(cross.state)
  const mid = solveMiddleEdges(fl.state)
  return mid.state
}

describe('solveLastLayer', () => {
  it('returns no moves for the solved state', () => {
    const r = solveLastLayer(solvedState())
    expect(r.moves).toEqual([])
    expect(isLastLayerSolved(r.state)).toBe(true)
  })

  it('solves the last layer for a single scramble', () => {
    const f2l = solveToF2L(1)
    expect(isMiddleSolved(f2l)).toBe(true)
    const r = solveLastLayer(f2l)
    expect(isSolved(r.state)).toBe(true)
  }, 15000)

  it('solves the last layer for 30 seeded scrambles (regression guard)', () => {
    for (let seed = 2; seed <= 31; seed++) {
      const f2l = solveToF2L(seed)
      expect(isMiddleSolved(f2l)).toBe(true)
      const r = solveLastLayer(f2l)
      expect(isSolved(r.state)).toBe(true)
    }
  }, 30000)
})
