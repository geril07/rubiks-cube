import { describe, expect, it } from 'vitest'
import { solvedState } from '../../../src/cube/model.ts'
import { solve } from '../../../src/cube/solve/index.ts'
import { applySeq, scrambleMoves, isSolved, applySolution } from './helpers.ts'

describe('solve (full LBL pipeline)', () => {
  it('returns no moves for the solved state', () => {
    expect(solve(solvedState())).toEqual([])
  })

  it('solves a single scramble', () => {
    const s0 = applySeq(scrambleMoves(1))
    const moves = solve(s0)
    const result = applySolution(s0, moves)
    expect(isSolved(result)).toBe(true)
  }, 15000)

  it('solves 100 seeded scrambles with <=200 moves each', () => {
    let maxMoves = 0
    let totalMoves = 0
    for (let seed = 1; seed <= 100; seed++) {
      const s0 = applySeq(scrambleMoves(seed))
      const moves = solve(s0)
      const result = applySolution(s0, moves)
      expect(isSolved(result)).toBe(true)
      expect(moves.length).toBeLessThanOrEqual(200)
      maxMoves = Math.max(maxMoves, moves.length)
      totalMoves += moves.length
    }
    console.log(`100 scrambles: max=${maxMoves} moves, avg=${(totalMoves / 100).toFixed(1)} moves`)
  }, 300000)
})
