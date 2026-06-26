import { describe, expect, it } from 'vitest'
import { solvedState } from '../../../src/cube/model.ts'
import { applyMove, type Move } from '../../../src/cube/moves.ts'
import { bfs, allMoves, cubeSpace } from '../../../src/cube/solve/search.ts'
import { applySeq, isSolved } from './helpers.ts'

const U: Move[] = [
  { face: 'U', amount: 1 }, { face: 'U', amount: 2 }, { face: 'U', amount: -1 },
]

describe('bfs', () => {
  it('returns an empty solution when the initial state already satisfies the goal', () => {
    const r = bfs(solvedState(), isSolved, allMoves(), 3, cubeSpace)
    expect(r).not.toBeNull()
    expect(r!.moves).toEqual([])
    expect(isSolved(r!.state)).toBe(true)
  })

  it('finds the single inverse move for a one-move scramble', () => {
    const s = applyMove(solvedState(), { face: 'R', amount: 1 })
    const r = bfs(s, isSolved, allMoves(), 1, cubeSpace)
    expect(r).not.toBeNull()
    expect(r!.moves).toEqual([{ face: 'R', amount: -1 }])
    expect(isSolved(r!.state)).toBe(true)
  })

  it('finds a two-move solution for a two-move scramble', () => {
    const s = applySeq([{ face: 'R', amount: 1 }, { face: 'U', amount: 1 }])
    const r = bfs(s, isSolved, allMoves(), 2, cubeSpace)
    expect(r).not.toBeNull()
    expect(isSolved(r!.state)).toBe(true)
    expect(r!.moves.length).toBe(2)
  })

  it('returns null when no solution exists within the depth limit', () => {
    const s = applySeq([{ face: 'R', amount: 1 }, { face: 'U', amount: 1 }])
    const r = bfs(s, isSolved, allMoves(), 1, cubeSpace)
    expect(r).toBeNull()
  })

  it('respects the allowed-moves restriction', () => {
    const s = applyMove(solvedState(), { face: 'R', amount: 1 })
    const r = bfs(s, isSolved, U, 3, cubeSpace)
    expect(r).toBeNull()
  })

  it('never emits two consecutive moves on the same face', () => {
    const s = applySeq([
      { face: 'R', amount: 1 }, { face: 'U', amount: 1 }, { face: 'F', amount: 1 },
    ])
    const r = bfs(s, isSolved, allMoves(), 4, cubeSpace)
    expect(r).not.toBeNull()
    for (let i = 1; i < r!.moves.length; i++) {
      expect(r!.moves[i].face).not.toBe(r!.moves[i - 1].face)
    }
  })
})
