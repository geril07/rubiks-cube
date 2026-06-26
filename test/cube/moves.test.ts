import { describe, expect, it } from 'vitest'
import { Quaternion, Vector3 } from 'three'
import { allCubies, slotToGrid, solvedState } from '../../src/cube/model.ts'
import type { CornerSlot, EdgeSlot, Grid3 } from '../../src/cube/model.ts'
import { applyMove, rotateGrid, R_MOVE } from '../../src/cube/moves.ts'
import type { Amount, Move } from '../../src/cube/moves.ts'

function printLabel(move: Move): string {
  const suffix: Record<Amount, string> = { 1: '', 2: '2', '-1': "'" }
  return `${move.face}${suffix[move.amount]}`
}

describe('applyMove with R on a solved cube', () => {
  const state = applyMove(solvedState(), R_MOVE)

  it('permutes corner slots per the R rotation formula (x,y,z) -> (x,-z,y)', () => {
    const byId = new Map(state.corners.map((c) => [c.id, c.slot]))
    const expected: Record<CornerSlot, CornerSlot> = {
      URF: 'DRF',
      URB: 'URF',
      DRF: 'DRB',
      DRB: 'URB',
      ULF: 'ULF',
      ULB: 'ULB',
      DLF: 'DLF',
      DLB: 'DLB',
    }
    for (const [id, dest] of Object.entries(expected)) {
      expect(byId.get(id as CornerSlot)).toBe(dest)
    }
  })

  it('permutes edge slots per the R rotation formula (x,y,z) -> (x,-z,y)', () => {
    const byId = new Map(state.edges.map((e) => [e.id, e.slot]))
    const expected: Record<EdgeSlot, EdgeSlot> = {
      UR: 'FR',
      FR: 'DR',
      DR: 'BR',
      BR: 'UR',
      UF: 'UF',
      UB: 'UB',
      UL: 'UL',
      DF: 'DF',
      DB: 'DB',
      DL: 'DL',
      FL: 'FL',
      BL: 'BL',
    }
    for (const [id, dest] of Object.entries(expected)) {
      expect(byId.get(id as EdgeSlot)).toBe(dest)
    }
  })
})

describe('R applied four times', () => {
  it('returns the cube to solved: every cubie at its Home slot with identity orientation', () => {
    let state = solvedState()
    for (let i = 0; i < 4; i++) state = applyMove(state, R_MOVE)

    const identity = new Quaternion()
    for (const c of allCubies(state)) {
      expect(c.slot).toBe(c.id)
      expect(c.quat.angleTo(identity)).toBeLessThan(1e-9)
    }
  })
})

describe('R followed by R prime', () => {
  it('returns the cube to solved: apply ∘ inverse = identity', () => {
    const state = applyMove(applyMove(solvedState(), R_MOVE), {
      face: 'R',
      amount: -1,
    })

    const identity = new Quaternion()
    for (const c of allCubies(state)) {
      expect(c.slot).toBe(c.id)
      expect(c.quat.angleTo(identity)).toBeLessThan(1e-9)
    }
  })
})

describe('R move bijection on slots', () => {
  it('leaves all 20 slots uniquely filled after one R move', () => {
    const state = applyMove(solvedState(), R_MOVE)
    const occupiedSlots = allCubies(state).map((c) => c.slot)

    expect(occupiedSlots).toHaveLength(20)
    expect(new Set(occupiedSlots).size).toBe(20)
  })
})

describe('R move orientation quaternion', () => {
  const X = new Vector3(1, 0, 0)
  const identity = new Quaternion()

  function axisAngle(q: Quaternion): { axis: Vector3; angle: number } {
    const angle = q.angleTo(identity)
    if (angle < 1e-9) return { axis: new Vector3(0, 0, 0), angle: 0 }
    const raw = new Vector3(q.x, q.y, q.z).normalize()
    const dot = raw.dot(X)
    return { axis: dot >= 0 ? raw : raw.multiplyScalar(-1), angle: dot >= 0 ? angle : -angle }
  }

  it('orients each affected cubie as a +pi/2 rotation about +X and leaves the rest at identity', () => {
    const state = applyMove(solvedState(), R_MOVE)
    const halfPi = Math.PI / 2

    for (const c of allCubies(state)) {
      const wasInSlice = slotToGrid(c.id).x === 1
      const { axis, angle } = axisAngle(c.quat)
      if (wasInSlice) {
        expect(angle).toBeCloseTo(halfPi, 9)
        expect(axis.dot(X)).toBeCloseTo(1, 9)
      } else {
        expect(angle).toBeLessThan(1e-9)
      }
    }
  })
})

describe('rotateGrid for R', () => {
  const R: Move = { face: 'R', amount: 1 }

  it('is the identity after four quarter turns on every R-slice grid coordinate', () => {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const g = { x: 1 as const, y: y as const, z: z as const }
        let cur = g
        for (let i = 0; i < 4; i++) cur = rotateGrid(cur, R)
        expect(cur).toEqual(g)
      }
    }
  })
})

describe('U-CW direction (URF -> ULF)', () => {
  it('sends the URF corner to ULF after one U quarter turn (CW about +Y)', () => {
    const state = applyMove(solvedState(), { face: 'U', amount: 1 })
    const urf = state.corners.find((c) => c.id === 'URF')!
    expect(urf.slot).toBe('ULF')
  })
})

describe('D-CW direction (DRF -> DRB)', () => {
  it('sends the DRF corner to DRB after one D quarter turn (CW about -Y)', () => {
    const state = applyMove(solvedState(), { face: 'D', amount: 1 })
    const drf = state.corners.find((c) => c.id === 'DRF')!
    expect(drf.slot).toBe('DRB')
  })
})

describe('L-CW direction (ULF -> ULB)', () => {
  it('sends the ULF corner to ULB after one L quarter turn (CW about -X)', () => {
    const state = applyMove(solvedState(), { face: 'L', amount: 1 })
    const ulf = state.corners.find((c) => c.id === 'ULF')!
    expect(ulf.slot).toBe('ULB')
  })
})

describe('F-CW direction (URF -> DRF)', () => {
  it('sends the URF corner to DRF after one F quarter turn (CW about +Z)', () => {
    const state = applyMove(solvedState(), { face: 'F', amount: 1 })
    const urf = state.corners.find((c) => c.id === 'URF')!
    expect(urf.slot).toBe('DRF')
  })
})

describe('B-CW direction (URB -> ULB)', () => {
  it('sends the URB corner to ULB after one B quarter turn (CW about -Z)', () => {
    const state = applyMove(solvedState(), { face: 'B', amount: 1 })
    const urb = state.corners.find((c) => c.id === 'URB')!
    expect(urb.slot).toBe('ULB')
  })
})

const ALL_FACES: Move['face'][] = ['U', 'D', 'L', 'R', 'F', 'B']
const ALL_AMOUNTS: Amount[] = [1, 2, -1]
const ALL_MOVES: Move[] = ALL_FACES.flatMap((face) =>
  ALL_AMOUNTS.map((amount) => ({ face, amount })),
)

describe('Tier 1: every move is a bijection on slots', () => {
  for (const move of ALL_MOVES) {
    it(`fills all 20 slots uniquely after ${printLabel(move)}`, () => {
      const state = applyMove(solvedState(), move)
      const occupied = allCubies(state).map((c) => c.slot)
      expect(occupied).toHaveLength(20)
      expect(new Set(occupied).size).toBe(20)
    })
  }
})

describe('Tier 1: apply composed with inverse is identity', () => {
  for (const move of ALL_MOVES) {
    it(`returns every cubie home after ${printLabel(move)} then its inverse`, () => {
      const inverse: Move = { face: move.face, amount: move.amount === 2 ? 2 : (-move.amount) as Amount }
      const state = applyMove(applyMove(solvedState(), move), inverse)
      const identity = new Quaternion()
      for (const c of allCubies(state)) {
        expect(c.slot).toBe(c.id)
        expect(c.quat.angleTo(identity)).toBeLessThan(1e-9)
      }
    })
  }
})

describe('Tier 1: four quarter turns is identity', () => {
  const QUARTER_MOVES = ALL_FACES.map((face) => ({ face, amount: 1 as Amount }))
  for (const move of QUARTER_MOVES) {
    it(`returns every cubie home after 4x ${printLabel(move)}`, () => {
      let state = solvedState()
      for (let i = 0; i < 4; i++) state = applyMove(state, move)
      const identity = new Quaternion()
      for (const c of allCubies(state)) {
        expect(c.slot).toBe(c.id)
        expect(c.quat.angleTo(identity)).toBeLessThan(1e-9)
      }
    })
  }
})

describe('Tier 1: per-face orientation quaternion axis and angle', () => {
  const FACE_AXIS: Record<Move['face'], Vector3> = {
    U: new Vector3(0, 1, 0),
    D: new Vector3(0, -1, 0),
    L: new Vector3(-1, 0, 0),
    R: new Vector3(1, 0, 0),
    F: new Vector3(0, 0, 1),
    B: new Vector3(0, 0, -1),
  }
  const identity = new Quaternion()
  const halfPi = Math.PI / 2

  function signedAxisAngle(q: Quaternion, expectedAxis: Vector3): { axis: Vector3; angle: number } {
    const angle = q.angleTo(identity)
    if (angle < 1e-9) return { axis: new Vector3(0, 0, 0), angle: 0 }
    const raw = new Vector3(q.x, q.y, q.z).normalize()
    const dot = raw.dot(expectedAxis)
    return { axis: dot >= 0 ? raw : raw.multiplyScalar(-1), angle: dot >= 0 ? angle : -angle }
  }

  for (const face of ALL_FACES) {
    const move: Move = { face, amount: 1 }
    it(`orients each ${face}-slice cubie about the ${face} axis by pi/2, matching rotateGrid, and leaves the rest at identity`, () => {
      const state = applyMove(solvedState(), move)
      const axis = FACE_AXIS[face]
      const inSliceAxis = ['U', 'D'].includes(face) ? 'y' : ['L', 'R'].includes(face) ? 'x' : 'z'

      for (const c of allCubies(state)) {
        const homeGrid = slotToGrid(c.id)
        const wasInSlice = homeGrid[inSliceAxis] === (face === 'U' || face === 'R' || face === 'F' ? 1 : -1)
        const { axis: a, angle } = signedAxisAngle(c.quat, axis)
        if (wasInSlice) {
          expect(Math.abs(angle)).toBeCloseTo(halfPi, 9)
          expect(a.dot(axis)).toBeCloseTo(1, 9)
          // The orientation must rotate home basis directions exactly the way
          // rotateGrid rotates the slot coordinate — the single source of truth
          // for the physical turn. Pins position↔orientation consistency, which
          // the facelet bijection (slice 05) and orientation derivation rely on.
          for (const v of [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]) {
            const rg = rotateGrid({ x: v.x as Grid3['x'], y: v.y as Grid3['y'], z: v.z as Grid3['z'] }, move)
            const qv = v.clone().applyQuaternion(c.quat)
            expect(qv.x).toBeCloseTo(rg.x, 9)
            expect(qv.y).toBeCloseTo(rg.y, 9)
            expect(qv.z).toBeCloseTo(rg.z, 9)
          }
        } else {
          expect(angle).toBeLessThan(1e-9)
        }
      }
    })
  }
})

function axisName(v: Vector3): string {
  const parts: string[] = []
  if (v.x !== 0) parts.push((v.x > 0 ? '+' : '-') + 'X')
  if (v.y !== 0) parts.push((v.y > 0 ? '+' : '-') + 'Y')
  if (v.z !== 0) parts.push((v.z > 0 ? '+' : '-') + 'Z')
  return parts.join(' ')
}