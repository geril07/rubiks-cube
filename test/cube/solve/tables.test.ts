import { describe, expect, it } from 'vitest'
import { solvedState } from '../../../src/cube/model.ts'
import type { CubeState } from '../../../src/cube/model.ts'
import { applyMove } from '../../../src/cube/moves.ts'
import { ALL_MOVES } from '../../../src/cube/solve/search.ts'
import {
  cornerTwist, toFast, fastApply, CORNER_SLOTS, EDGE_SLOTS,
} from '../../../src/cube/solve/tables.ts'
import { edgeOrientation } from '../../../src/cube/solve/orientation.ts'
import { applySeq, scrambleMoves, makeRng } from './helpers.ts'

describe('cornerTwist (ADR-0005 standard convention)', () => {
  it('is 0 for every corner in the solved state', () => {
    for (const c of solvedState().corners) {
      expect(cornerTwist(c)).toBe(0)
    }
  })

  it('keeps the twist sum ≡ 0 mod 3 for every single move from solved', () => {
    // The axis-based cornerOrientation violates this (sum 4 ≡ 1 after R). The
    // ADR-0005 convention must hold it for all 18 moves.
    for (const m of ALL_MOVES) {
      const s = applyMove(solvedState(), m)
      const sum = s.corners.reduce((acc, c) => acc + cornerTwist(c), 0)
      expect(sum % 3).toBe(0)
    }
  })

  it('keeps the twist sum ≡ 0 mod 3 for many random scrambles', () => {
    for (let seed = 0; seed < 50; seed++) {
      const s = applySeq(scrambleMoves(seed))
      const sum = s.corners.reduce((acc, c) => acc + cornerTwist(c), 0)
      expect(sum % 3).toBe(0)
    }
  })

  it('keeps the edge-flip sum ≡ 0 mod 2 for many random scrambles', () => {
    for (let seed = 0; seed < 50; seed++) {
      const s = applySeq(scrambleMoves(seed))
      const sum = s.edges.reduce((acc, e) => acc + edgeOrientation(e), 0)
      expect(sum % 2).toBe(0)
    }
  })
})

describe('toFast / fastApply', () => {
  it('toFast reads the same slot indices as the CubeState for a solved state', () => {
    const f = toFast(solvedState())
    f.cs.forEach((slot, i) => expect(slot).toBe(i))
    f.es.forEach((slot, i) => expect(slot).toBe(i))
    f.ct.forEach((t) => expect(t).toBe(0))
    f.ef.forEach((fl) => expect(fl).toBe(0))
  })

  it('fastApply matches applyMove for every single move from solved', () => {
    for (const m of ALL_MOVES) {
      const cubeAfter = applyMove(solvedState(), m)
      const fastAfter = fastApply(toFast(solvedState()), m)
      expect(matches(cubeAfter, fastAfter)).toBe(true)
    }
  })

  it('fastApply matches applyMove over deep random move sequences (validates id-independence)', () => {
    // If the orientation delta depended on the cubie's id (not just its slot),
    // the precomputed table would diverge from the real applyMove once pieces
    // are away from home. 200 scrambled states × all 18 moves is a strong check.
    const rng = makeRng(12345)
    for (let trial = 0; trial < 200; trial++) {
      let s: CubeState = solvedState()
      const len = 5 + Math.floor(rng() * 15)
      for (let i = 0; i < len; i++) {
        s = applyMove(s, ALL_MOVES[Math.floor(rng() * 18)])
      }
      for (const m of ALL_MOVES) {
        const cubeAfter = applyMove(s, m)
        const fastAfter = fastApply(toFast(s), m)
        expect(matches(cubeAfter, fastAfter)).toBe(true)
      }
    }
  })
})

function matches(cube: CubeState, fast: ReturnType<typeof toFast>): boolean {
  const cornerIdx = new Map(CORNER_SLOTS.map((s, i) => [s, i]))
  const edgeIdx = new Map(EDGE_SLOTS.map((s, i) => [s, i]))
  for (const c of cube.corners) {
    const i = cornerIdx.get(c.id)!
    if (fast.cs[i] !== cornerIdx.get(c.slot)!) return false
    if (fast.ct[i] !== cornerTwist(c)) return false
  }
  for (const e of cube.edges) {
    const i = edgeIdx.get(e.id)!
    if (fast.es[i] !== edgeIdx.get(e.slot)!) return false
    if (fast.ef[i] !== edgeOrientation(e)) return false
  }
  return true
}
