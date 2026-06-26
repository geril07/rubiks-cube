import { describe, expect, it } from 'vitest'
import { solvedState } from '../../../src/cube/model.ts'
import type { CubeState, EdgeSlot } from '../../../src/cube/model.ts'
import { applyMove, type Move } from '../../../src/cube/moves.ts'
import { solveCross, isCrossSolved, CROSS_EDGES } from '../../../src/cube/solve/cross.ts'
import { edgeOrientation } from '../../../src/cube/solve/orientation.ts'
import { applySeq, scrambleMoves, isSolved } from './helpers.ts'

function crossAtHome(s: CubeState): boolean {
  for (const id of CROSS_EDGES) {
    const e = s.edges.find((x) => x.id === id)!
    if (e.slot !== id) return false
    if (edgeOrientation(e) !== 0) return false
  }
  return true
}

describe('solveCross', () => {
  it('returns no moves and keeps the cross solved for the solved state', () => {
    const r = solveCross(solvedState())
    expect(r.moves).toEqual([])
    expect(isCrossSolved(r.state)).toBe(true)
  })

  it('solves the cross after a single R move (which displaces the DR edge)', () => {
    const s = applyMove(solvedState(), { face: 'R', amount: 1 })
    const r = solveCross(s)
    expect(isCrossSolved(r.state)).toBe(true)
    // applying the returned moves to the scrambled state also solves the cross
    const replayed = applySeq(r.moves)
    // replayed starts from solved; reproduce the scramble first then the solution
    let combined = applyMove(solvedState(), { face: 'R', amount: 1 })
    for (const m of r.moves) combined = applyMove(combined, m)
    expect(crossAtHome(combined)).toBe(true)
  })

  it('solves the cross for a seeded 20-move scramble (seed 1)', () => {
    const s = applySeq(scrambleMoves(1))
    const r = solveCross(s)
    expect(isCrossSolved(r.state)).toBe(true)
  })

  it('solves the cross for a seeded 20-move scramble (seed 7)', () => {
    const s = applySeq(scrambleMoves(7))
    const r = solveCross(s)
    expect(isCrossSolved(r.state)).toBe(true)
  })

  it('solves the cross for a seeded 20-move scramble (seed 42)', () => {
    const s = applySeq(scrambleMoves(42))
    const r = solveCross(s)
    expect(isCrossSolved(r.state)).toBe(true)
  })

  it('produces a cross solution of at most 8 moves (optimal cross depth)', () => {
    for (const seed of [1, 7, 42, 99, 123, 2024]) {
      const s = applySeq(scrambleMoves(seed))
      const r = solveCross(s)
      expect(r.moves.length).toBeLessThanOrEqual(8)
    }
  })

  it('solves the cross for 25 seeded scrambles (regression guard)', () => {
    for (let seed = 0; seed < 25; seed++) {
      const s = applySeq(scrambleMoves(seed))
      const r = solveCross(s)
      expect(isCrossSolved(r.state)).toBe(true)
    }
  })
})
