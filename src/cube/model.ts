import { Quaternion } from 'three'

export type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B'

export const FACES = ['U', 'D', 'L', 'R', 'F', 'B'] as const

export type CornerSlot =
  | 'URF'
  | 'URB'
  | 'ULF'
  | 'ULB'
  | 'DRF'
  | 'DRB'
  | 'DLF'
  | 'DLB'

export type EdgeSlot =
  | 'UR'
  | 'UF'
  | 'UB'
  | 'UL'
  | 'DR'
  | 'DF'
  | 'DB'
  | 'DL'
  | 'FR'
  | 'FL'
  | 'BR'
  | 'BL'

export type Slot = CornerSlot | EdgeSlot

export interface Grid3 {
  x: -1 | 0 | 1
  y: -1 | 0 | 1
  z: -1 | 0 | 1
}

const CORNER_SLOTS: readonly CornerSlot[] = [
  'URF',
  'URB',
  'ULF',
  'ULB',
  'DRF',
  'DRB',
  'DLF',
  'DLB',
]

const EDGE_SLOTS: readonly EdgeSlot[] = [
  'UR',
  'UF',
  'UB',
  'UL',
  'DR',
  'DF',
  'DB',
  'DL',
  'FR',
  'FL',
  'BR',
  'BL',
]

export const ALL_SLOTS: readonly Slot[] = [
  ...CORNER_SLOTS,
  ...EDGE_SLOTS,
] as readonly Slot[]

export function isCorner(slot: Slot): slot is CornerSlot {
  return (CORNER_SLOTS as readonly string[]).includes(slot)
}

const FACE_TO_COORD: Record<Face, Grid3> = {
  U: { x: 0, y: 1, z: 0 },
  D: { x: 0, y: -1, z: 0 },
  L: { x: -1, y: 0, z: 0 },
  R: { x: 1, y: 0, z: 0 },
  F: { x: 0, y: 0, z: 1 },
  B: { x: 0, y: 0, z: -1 },
}

export function slotToGrid(slot: Slot): Grid3 {
  const faces = slot.split('') as Face[]
  const grid: Grid3 = { x: 0, y: 0, z: 0 }
  for (const f of faces) {
    const c = FACE_TO_COORD[f]
    grid.x = (grid.x + c.x) as Grid3['x']
    grid.y = (grid.y + c.y) as Grid3['y']
    grid.z = (grid.z + c.z) as Grid3['z']
  }
  return grid
}

export function gridToSlot(g: Grid3): Slot | null {
  const corner = CORNER_SLOTS.find((s) => {
    const gg = slotToGrid(s)
    return gg.x === g.x && gg.y === g.y && gg.z === g.z
  })
  if (corner) return corner
  const edge = EDGE_SLOTS.find((s) => {
    const gg = slotToGrid(s)
    return gg.x === g.x && gg.y === g.y && gg.z === g.z
  })
  return edge ?? null
}

export interface CubieState {
  id: Slot
  slot: Slot
  quat: Quaternion
}

export interface CubeState {
  corners: CubieState[]
  edges: CubieState[]
}

export function solvedState(): CubeState {
  const corners: CubieState[] = CORNER_SLOTS.map((slot) => ({
    id: slot,
    slot,
    quat: new Quaternion(),
  }))
  const edges: CubieState[] = EDGE_SLOTS.map((slot) => ({
    id: slot,
    slot,
    quat: new Quaternion(),
  }))
  return { corners, edges }
}

export function allCubies(state: CubeState): CubieState[] {
  return [...state.corners, ...state.edges]
}