import { Quaternion, Vector3 } from 'three'
import type { CubeState, CubieState, Grid3, Slot } from './model.ts'
import { gridToSlot, slotToGrid } from './model.ts'
import { quaternionBetweenFrames } from './rotation.ts'

export type Amount = 1 | 2 | -1

export interface Move {
  face: 'R' | 'U' | 'D' | 'L' | 'F' | 'B'
  amount: Amount
}

export const R_MOVE: Move = { face: 'R', amount: 1 }

export function rotationForMove(move: Move): Quaternion {
  // The orientation quaternion must rotate a cubie's home sticker directions
  // exactly the way `rotateGrid` rotates its slot coordinate. Deriving the
  // quaternion from `rotateGrid` (rather than an independent axis-angle) keeps
  // position and orientation consistent by construction — a single source of
  // truth, so the facelet bijection and the discrete-orientation derivation
  // both hold for every face.
  const rx = rotateGrid({ x: 1, y: 0, z: 0 }, move)
  const ry = rotateGrid({ x: 0, y: 1, z: 0 }, move)
  const rz = rotateGrid({ x: 0, y: 0, z: 1 }, move)
  return quaternionBetweenFrames(
    [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)],
    [new Vector3(rx.x, rx.y, rx.z), new Vector3(ry.x, ry.y, ry.z), new Vector3(rz.x, rz.y, rz.z)],
  )
}

export function rotateGrid(g: Grid3, move: Move): Grid3 {
  const { x, y, z } = g
  const a = move.amount
  switch (move.face) {
    case 'R': {
      if (a === 1) return { x, y: -z as Grid3['y'], z: y as Grid3['z'] }
      if (a === -1) return { x, y: z as Grid3['y'], z: -y as Grid3['z'] }
      return { x, y: -y as Grid3['y'], z: -z as Grid3['z'] }
    }
    case 'L': {
      if (a === 1) return { x, y: z as Grid3['y'], z: -y as Grid3['z'] }
      if (a === -1) return { x, y: -z as Grid3['y'], z: y as Grid3['z'] }
      return { x, y: -y as Grid3['y'], z: -z as Grid3['z'] }
    }
    case 'U': {
      if (a === 1) return { x: -z as Grid3['x'], y, z: x as Grid3['z'] }
      if (a === -1) return { x: z as Grid3['x'], y, z: -x as Grid3['z'] }
      return { x: -x as Grid3['x'], y, z: -z as Grid3['z'] }
    }
    case 'D': {
      if (a === 1) return { x: z as Grid3['x'], y, z: -x as Grid3['z'] }
      if (a === -1) return { x: -z as Grid3['x'], y, z: x as Grid3['z'] }
      return { x: -x as Grid3['x'], y, z: -z as Grid3['z'] }
    }
    case 'F': {
      if (a === 1) return { x: y as Grid3['x'], y: -x as Grid3['y'], z }
      if (a === -1) return { x: -y as Grid3['x'], y: x as Grid3['y'], z }
      return { x: -x as Grid3['x'], y: -y as Grid3['y'], z }
    }
    case 'B': {
      if (a === 1) return { x: -y as Grid3['x'], y: x as Grid3['y'], z }
      if (a === -1) return { x: y as Grid3['x'], y: -x as Grid3['y'], z }
      return { x: -x as Grid3['x'], y: -y as Grid3['y'], z }
    }
  }
}

export function sliceForMove(move: Move): (g: Grid3) => boolean {
  switch (move.face) {
    case 'R':
      return (g) => g.x === 1
    case 'L':
      return (g) => g.x === -1
    case 'U':
      return (g) => g.y === 1
    case 'D':
      return (g) => g.y === -1
    case 'F':
      return (g) => g.z === 1
    case 'B':
      return (g) => g.z === -1
  }
}

// Quaternion orientation is an exact representation of the physical orientation
// per ADR-0004's animate-then-apply seam. The discrete 0/1/2 corner-twist and
// 0/1 edge-flip orientation-value per ADR-0003 is deferred to slice 02 (added
// alongside the full 18-move algebra); the quaternion here is the same physical
// orientation in exact form, robust against derivation drift.
export function applyMove(state: CubeState, move: Move): CubeState {
  const rot = rotationForMove(move)
  const inSlice = sliceForMove(move)

  const map = new Map<Slot, CubieState>()
  for (const c of [...state.corners, ...state.edges]) {
    map.set(c.slot, c)
  }

  const corners: CubieState[] = state.corners.map((c) => {
    const g = slotToGrid(c.slot)
    if (!inSlice(g)) return c
    const ng = rotateGrid(g, move)
    const newSlot = gridToSlot(ng)
    if (!newSlot) throw new Error(`R move produced null slot from ${c.slot}`)
    return { id: c.id, slot: newSlot, quat: rot.clone().multiply(c.quat) }
  })

  const edges: CubieState[] = state.edges.map((c) => {
    const g = slotToGrid(c.slot)
    if (!inSlice(g)) return c
    const ng = rotateGrid(g, move)
    const newSlot = gridToSlot(ng)
    if (!newSlot) throw new Error(`R move produced null slot from ${c.slot}`)
    return { id: c.id, slot: newSlot, quat: rot.clone().multiply(c.quat) }
  })

  return { corners, edges }
}