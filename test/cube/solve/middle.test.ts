import { describe, expect, it } from 'vitest'
import { solvedState } from '../../../src/cube/model.ts'
import type { Move } from '../../../src/cube/moves.ts'
import { solveCross } from '../../../src/cube/solve/cross.ts'
import { solveFirstLayerCorners, isFirstLayerSolved } from '../../../src/cube/solve/f2l-corners.ts'
import { solveMiddleEdges, isMiddleSolved } from '../../../src/cube/solve/middle.ts'
import { applySeq, scrambleMoves, applySolution } from './helpers.ts'

// Inverse of the FR insert "F' U2 F U2 R' U R" — ejects FR from home to UF flip0.
const EJECT_FR: Move[] = [
  { face: 'R', amount: -1 }, { face: 'U', amount: -1 }, { face: 'R', amount: 1 },
  { face: 'U', amount: 2 }, { face: 'F', amount: -1 }, { face: 'U', amount: 2 },
  { face: 'F', amount: 1 },
]

// FL insert from UF flip0: "F U2 F' U2 L U' L'" — moves whatever is at UF to FL.
const INSERT_FL_FROM_UF: Move[] = [
  { face: 'F', amount: 1 }, { face: 'U', amount: 2 }, { face: 'F', amount: -1 },
  { face: 'U', amount: 2 }, { face: 'L', amount: 1 }, { face: 'U', amount: -1 },
  { face: 'L', amount: -1 },
]

describe('solveMiddleEdges', () => {
  it('returns no moves for the solved state', () => {
    const r = solveMiddleEdges(solvedState())
    expect(r.moves).toEqual([])
    expect(isMiddleSolved(r.state)).toBe(true)
  })

  it('solves the middle edges for a single scramble', () => {
    const s0 = applySeq(scrambleMoves(1))
    const cross = solveCross(s0)
    const fl = solveFirstLayerCorners(cross.state)
    const r = solveMiddleEdges(fl.state)
    expect(isMiddleSolved(r.state)).toBe(true)
    expect(isFirstLayerSolved(r.state)).toBe(true)
  }, 15000)

  it('solves the middle edges for 30 seeded scrambles (regression guard)', () => {
    for (let seed = 2; seed <= 31; seed++) {
      const s0 = applySeq(scrambleMoves(seed))
      const cross = solveCross(s0)
      const fl = solveFirstLayerCorners(cross.state)
      const r = solveMiddleEdges(fl.state)
      expect(isMiddleSolved(r.state)).toBe(true)
      expect(isFirstLayerSolved(r.state)).toBe(true)
    }
  }, 30000)

  it('inserts an edge ejected to the U layer', () => {
    const mid = solveMiddleEdges(
      solveFirstLayerCorners(solveCross(applySeq(scrambleMoves(7))).state).state,
    )
    expect(isMiddleSolved(mid.state)).toBe(true)

    const disturbed = applySolution(mid.state, EJECT_FR)
    const fr = disturbed.edges.find((e) => e.id === 'FR')!
    expect(fr.slot).not.toBe('FR')

    const r = solveMiddleEdges(disturbed)
    expect(isMiddleSolved(r.state)).toBe(true)
    expect(isFirstLayerSolved(r.state)).toBe(true)
  })

  it('ejects an edge from a wrong middle slot then inserts it home', () => {
    // Start from solved middle, eject FR to UF, then insert it into FL (wrong
    // slot). Now FR is at FL (a middle slot), exercising the eject path.
    const mid = solveMiddleEdges(
      solveFirstLayerCorners(solveCross(applySeq(scrambleMoves(7))).state).state,
    )
    expect(isMiddleSolved(mid.state)).toBe(true)

    const ejected = applySolution(mid.state, EJECT_FR)
    // FR is now at UF. Insert it into FL (wrong slot) using the FL insert alg.
    const frInWrongSlot = applySolution(ejected, INSERT_FL_FROM_UF)
    const fr = frInWrongSlot.edges.find((e) => e.id === 'FR')!
    expect(fr.slot).toBe('FL') // FR is in the wrong middle slot

    const r = solveMiddleEdges(frInWrongSlot)
    expect(isMiddleSolved(r.state)).toBe(true)
    expect(isFirstLayerSolved(r.state)).toBe(true)
  })
})
