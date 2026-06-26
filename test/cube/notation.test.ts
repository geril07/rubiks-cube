import { describe, expect, it } from 'vitest'
import type { Move } from '../../src/cube/moves.ts'
import { parseMove, printMove } from '../../src/cube/notation.ts'

describe('parseMove', () => {
  it('parses R as a quarter CW move on the R face', () => {
    expect(parseMove('R')).toEqual({ face: 'R', amount: 1 })
  })

  it('parses R2 as a double move on the R face', () => {
    expect(parseMove('R2')).toEqual({ face: 'R', amount: 2 })
  })

  it("parses R' as a quarter CCW move on the R face", () => {
    expect(parseMove("R'")).toEqual({ face: 'R', amount: -1 })
  })
})

describe('printMove ∘ parseMove', () => {
  for (const s of ['R', 'R2', "R'"]) {
    it(`round-trips the string "${s}"`, () => {
      expect(printMove(parseMove(s)!)).toBe(s)
    })
  }
})

describe('parseMove ∘ printMove', () => {
  const moves: Move[] = [
    { face: 'R', amount: 1 },
    { face: 'R', amount: 2 },
    { face: 'R', amount: -1 },
  ]
  for (const m of moves) {
    it(`round-trips the move {face:${m.face}, amount:${m.amount}}`, () => {
      expect(parseMove(printMove(m))).toEqual(m)
    })
  }
})

describe('parseMove for U', () => {
  it('parses U as a quarter CW move on the U face', () => {
    expect(parseMove('U')).toEqual({ face: 'U', amount: 1 })
  })

  it('parses U2 as a double move on the U face', () => {
    expect(parseMove('U2')).toEqual({ face: 'U', amount: 2 })
  })

  it("parses U' as a quarter CCW move on the U face", () => {
    expect(parseMove("U'")).toEqual({ face: 'U', amount: -1 })
  })
})

describe('printMove ∘ parseMove for U', () => {
  for (const s of ['U', 'U2', "U'"]) {
    it(`round-trips the string "${s}"`, () => {
      expect(printMove(parseMove(s)!)).toBe(s)
    })
  }
})

describe('notation round-trips for D, L, F, B', () => {
  for (const face of ['D', 'L', 'F', 'B'] as const) {
    for (const s of [face, `${face}2`, `${face}'`]) {
      it(`round-trips the string "${s}" via printMove(parseMove("${s}"))`, () => {
        expect(printMove(parseMove(s)!)).toBe(s)
      })
      it(`round-trips the move parsed from "${s}" via parseMove(printMove(...))`, () => {
        const m = parseMove(s)!
        expect(parseMove(printMove(m))).toEqual(m)
      })
    }
  }
})