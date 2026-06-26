import { describe, expect, it } from 'vitest'
import { solvedState } from '../../../src/cube/model.ts'
import { solve, solveFast, prepareSolver } from '../../../src/cube/solve/index.ts'
import { toFast } from '../../../src/cube/solve/tables.ts'
import { applySeq, scrambleMoves, isSolved, applySolution } from './helpers.ts'

describe('solveFast (FastState-native)', () => {
  it('returns no moves for the solved state', () => {
    expect(solveFast(toFast(solvedState()))).toEqual([])
  })

  it('matches solve(CubeState) move-for-move on seeded scrambles', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s0 = applySeq(scrambleMoves(seed))
      const syncMoves = solve(s0)
      const fastMoves = solveFast(toFast(s0))
      expect(fastMoves).toEqual(syncMoves)
    }
  }, 30000)

  it('solves scrambled cubes (correctness, not just equivalence)', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s0 = applySeq(scrambleMoves(seed))
      const moves = solveFast(toFast(s0))
      expect(isSolved(applySolution(s0, moves))).toBe(true)
    }
  }, 30000)

  it('prepareSolver makes the first solveFast instant (tables pre-built)', () => {
    const t0 = performance.now()
    prepareSolver()
    const buildMs = performance.now() - t0
    console.log(`prepareSolver build: ${buildMs.toFixed(0)}ms`)

    // After prepareSolver, a solve must not trigger any table build.
    const s0 = applySeq(scrambleMoves(42))
    const t1 = performance.now()
    const moves = solveFast(toFast(s0))
    const solveMs = performance.now() - t1
    expect(isSolved(applySolution(s0, moves))).toBe(true)
    console.log(`post-prepare solveFast: ${solveMs.toFixed(1)}ms`)
    expect(solveMs).toBeLessThan(150)
  })
})
