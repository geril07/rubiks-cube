import { describe, expect, it } from 'vitest'
import { Quaternion, Vector3 } from 'three'
import { solvedState } from '../../../src/cube/model.ts'
import type { CubieState } from '../../../src/cube/model.ts'
import { applyMove } from '../../../src/cube/moves.ts'
import type { Move } from '../../../src/cube/moves.ts'
import {
  cornerOrientation,
  cornerOriented,
  cornerHomeAxis,
  edgeHomeAxis,
  edgeOrientation,
  stickerFace,
  edgeSolved,
  cornerSolved,
} from '../../../src/cube/solve/orientation.ts'

describe('cornerOrientation', () => {
  it('is 0 for every corner in the solved state', () => {
    for (const c of solvedState().corners) {
      expect(cornerOrientation(c)).toBe(0)
    }
  })

  it('is 0 for a corner at home with identity orientation, after any U or D move (no twist)', () => {
    for (const face of ['U', 'D'] as const) {
      const s = applyMove(solvedState(), { face, amount: 1 })
      for (const c of s.corners) {
        expect(cornerOrientation(c)).toBe(0)
      }
    }
  })

  it('reports a non-zero orientation for the URF corner after an R move', () => {
    const s = applyMove(solvedState(), { face: 'R', amount: 1 })
    const urf = s.corners.find((c) => c.id === 'URF')!
    expect(cornerOrientation(urf)).not.toBe(0)
  })

  it('cycles through distinct values and returns to 0 under the R U R\' U\' trigger', () => {
    const trigger: Move[] = [
      { face: 'R', amount: 1 },
      { face: 'U', amount: 1 },
      { face: 'R', amount: -1 },
      { face: 'U', amount: -1 },
    ]
    const seen = new Set<number>()
    let s = solvedState()
    for (let i = 0; i < 6; i++) {
      for (const m of trigger) s = applyMove(s, m)
      const urf = s.corners.find((c) => c.slot === 'URF')!
      seen.add(cornerOrientation(urf))
    }
    expect(seen.has(0)).toBe(true)
    expect(seen.size).toBeGreaterThanOrEqual(2)
  })

  it('returns to 0 for every corner after R applied four times', () => {
    let s = solvedState()
    for (let i = 0; i < 4; i++) s = applyMove(s, { face: 'R', amount: 1 })
    for (const c of s.corners) {
      expect(cornerOrientation(c)).toBe(0)
    }
  })
})

describe('cornerHomeAxis', () => {
  it('returns +Y for U-layer corners and -Y for D-layer corners', () => {
    expect(cornerHomeAxis('URF').distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-9)
    expect(cornerHomeAxis('DRF').distanceTo(new Vector3(0, -1, 0))).toBeLessThan(1e-9)
  })
})

describe('cornerOriented', () => {
  it('is true for every corner in the solved state', () => {
    for (const c of solvedState().corners) {
      expect(cornerOriented(c)).toBe(true)
    }
  })

  it('is false for the URF corner after an R move (it is twisted)', () => {
    const s = applyMove(solvedState(), { face: 'R', amount: 1 })
    const urf = s.corners.find((c) => c.id === 'URF')!
    expect(cornerOriented(urf)).toBe(false)
  })
})

describe('edgeHomeAxis', () => {
  it('returns the primary (U/D or F/B) sticker axis for each edge', () => {
    expect(edgeHomeAxis('UR').distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-9)
    expect(edgeHomeAxis('FR').distanceTo(new Vector3(0, 0, 1))).toBeLessThan(1e-9)
  })
})

describe('edgeOrientation', () => {
  it('is 0 (oriented) for every edge in the solved state', () => {
    for (const e of solvedState().edges) {
      expect(edgeOrientation(e)).toBe(0)
    }
  })

  it('is 0 for every edge after a U move (U does not flip edges)', () => {
    const s = applyMove(solvedState(), { face: 'U', amount: 1 })
    for (const e of s.edges) {
      expect(edgeOrientation(e)).toBe(0)
    }
  })

  it('is 0 for every edge after an R move (R does not flip edges)', () => {
    const s = applyMove(solvedState(), { face: 'R', amount: 1 })
    for (const e of s.edges) {
      expect(edgeOrientation(e)).toBe(0)
    }
  })

  it('flips exactly the four F-face edges after an F move', () => {
    const s = applyMove(solvedState(), { face: 'F', amount: 1 })
    const fFaceIds = new Set(['UF', 'FR', 'DF', 'FL'])
    for (const e of s.edges) {
      const want = fFaceIds.has(e.id as string) ? 1 : 0
      expect(edgeOrientation(e)).toBe(want)
    }
  })

  it('flips exactly the four B-face edges after a B move', () => {
    const s = applyMove(solvedState(), { face: 'B', amount: 1 })
    const bFaceIds = new Set(['UB', 'BR', 'DB', 'BL'])
    for (const e of s.edges) {
      const want = bFaceIds.has(e.id as string) ? 1 : 0
      expect(edgeOrientation(e)).toBe(want)
    }
  })

  it('keeps the edge-flip sum even for a sequence of moves', () => {
    const seq: Move[] = [
      { face: 'R', amount: 1 },
      { face: 'U', amount: 1 },
      { face: 'F', amount: -1 },
      { face: 'R', amount: 2 },
      { face: 'B', amount: 1 },
    ]
    let s = solvedState()
    for (const m of seq) s = applyMove(s, m)
    const sum = s.edges.reduce((acc, e) => acc + edgeOrientation(e), 0)
    expect(sum % 2).toBe(0)
  })
})

describe('stickerFace', () => {
  it('returns the home face itself for a cubie at home with identity orientation', () => {
    const s = solvedState()
    const urf = s.corners.find((c) => c.id === 'URF')!
    expect(stickerFace(urf, 'U')).toBe('U')
    expect(stickerFace(urf, 'R')).toBe('R')
    expect(stickerFace(urf, 'F')).toBe('F')
  })

  it('tracks the U sticker of URF after an R move', () => {
    const s = applyMove(solvedState(), { face: 'R', amount: 1 })
    const urf = s.corners.find((c) => c.id === 'URF')!
    expect(stickerFace(urf, 'U')).toBe('F')
  })
})

describe('cornerSolved', () => {
  it('is true for every corner in the solved state', () => {
    for (const c of solvedState().corners) {
      expect(cornerSolved(c)).toBe(true)
    }
  })

  it('is false for the URF corner after an R move (wrong slot)', () => {
    const s = applyMove(solvedState(), { face: 'R', amount: 1 })
    const urf = s.corners.find((c) => c.id === 'URF')!
    expect(cornerSolved(urf)).toBe(false)
  })
})

describe('edgeSolved', () => {
  it('is true for every edge in the solved state', () => {
    for (const e of solvedState().edges) {
      expect(edgeSolved(e)).toBe(true)
    }
  })

  it('is false for the UF edge after an F move (wrong slot)', () => {
    const s = applyMove(solvedState(), { face: 'F', amount: 1 })
    const uf = s.edges.find((e) => e.id === 'UF')!
    expect(edgeSolved(uf)).toBe(false)
  })

  it('is true for an unaffected edge after a move on another face', () => {
    const s = applyMove(solvedState(), { face: 'R', amount: 1 })
    const uf = s.edges.find((e) => e.id === 'UF')!
    expect(edgeSolved(uf)).toBe(true)
  })
})