import { describe, expect, it } from 'vitest'
import { Quaternion } from 'three'
import type { CubeState } from '../../src/cube/model.ts'
import { solvedState } from '../../src/cube/model.ts'
import { applyMove } from '../../src/cube/moves.ts'
import type { Move } from '../../src/cube/moves.ts'
import { generateScramble } from '../../src/cube/scramble.ts'

const VALID_FACES = new Set(['U', 'D', 'L', 'R', 'F', 'B'])
const VALID_AMOUNTS = new Set([1, 2, -1])

function isValidMove(m: Move): boolean {
  return VALID_FACES.has(m.face) && VALID_AMOUNTS.has(m.amount)
}

function statesEqual(a: CubeState, b: CubeState): boolean {
  if (a.corners.length !== b.corners.length) return false
  if (a.edges.length !== b.edges.length) return false
  for (let i = 0; i < a.corners.length; i++) {
    if (a.corners[i].id !== b.corners[i].id) return false
    if (a.corners[i].slot !== b.corners[i].slot) return false
    if (!a.corners[i].quat.equals(b.corners[i].quat)) return false
  }
  for (let i = 0; i < a.edges.length; i++) {
    if (a.edges[i].id !== b.edges[i].id) return false
    if (a.edges[i].slot !== b.edges[i].slot) return false
    if (!a.edges[i].quat.equals(b.edges[i].quat)) return false
  }
  return true
}

describe('generateScramble', () => {
  it('returns exactly 20 moves', () => {
    const moves = generateScramble()
    expect(moves).toHaveLength(20)
  })

  it('never schedules two consecutive moves on the same face', () => {
    const moves = generateScramble()
    for (let i = 1; i < moves.length; i++) {
      expect(moves[i].face).not.toBe(moves[i - 1].face)
    }
  })

  it('only emits the 18 canonical moves (face in UDRLFB, amount in 1/2/-1)', () => {
    const moves = generateScramble()
    for (const m of moves) {
      expect(isValidMove(m)).toBe(true)
    }
  })

  it('is deterministic for a given seed and varies across seeds', () => {
    const a1 = generateScramble(42)
    const a2 = generateScramble(42)
    expect(a2).toEqual(a1)

    const b = generateScramble(7)
    const sameShape =
      b.length === a1.length &&
      b.every((m, i) => m.face === a1[i].face && m.amount === a1[i].amount)
    expect(sameShape).toBe(false)
  })

  it('scrambles a solved cube to a non-solved state', () => {
    for (const seed of [1, 42, 100, 777]) {
      const moves = generateScramble(seed)
      let state = solvedState()
      for (const m of moves) state = applyMove(state, m)
      expect(statesEqual(state, solvedState())).toBe(false)
    }
  })
})