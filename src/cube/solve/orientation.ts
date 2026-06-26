import { Vector3 } from 'three'
import type { CornerSlot, CubieState, EdgeSlot, Slot } from '../model.ts'

// ── Discrete orientation derived from the quaternion (Approach A) ──────────
// Per ADR-0003, corner twist ∈ {0,1,2}, edge flip ∈ {0,1}. The quaternion is the
// single source of truth (ADR-0001/0004); these pure functions read the discrete
// value off it so the solver can reason about piece placement.

const FACE_DIR: Record<string, Vector3> = {
  U: new Vector3(0, 1, 0),
  D: new Vector3(0, -1, 0),
  R: new Vector3(1, 0, 0),
  L: new Vector3(-1, 0, 0),
  F: new Vector3(0, 0, 1),
  B: new Vector3(0, 0, -1),
}

function faceDir(f: string): Vector3 {
  return FACE_DIR[f]
}

// Home axis of each corner cubie's U/D sticker: +Y for U-corners, -Y for D-corners.
export function cornerHomeAxis(id: CornerSlot): Vector3 {
  return faceDir(id[0]).clone()
}

// Primary sticker axis for an edge: the U/D axis if it has one, else the F/B axis.
export function edgeHomeAxis(id: EdgeSlot): Vector3 {
  return faceDir(id[0]).clone()
}

// Corner orientation: 0 = U/D sticker points along ±Y (a U/D face); 1 = ±Z; 2 = ±X.
// Operationally adequate for the solver: identifies "oriented" (0) unambiguously
// and distinguishes the two twisted states, cycling correctly under twist triggers.
export function cornerOrientation(c: CubieState): 0 | 1 | 2 {
  const axis = cornerHomeAxis(c.id as CornerSlot)
  const dir = axis.applyQuaternion(c.quat)
  if (Math.abs(dir.y) > 0.5) return 0
  if (Math.abs(dir.z) > 0.5) return 1
  return 2
}

// A corner is oriented when its U/D sticker lies on a U/D face.
export function cornerOriented(c: CubieState): boolean {
  return cornerOrientation(c) === 0
}

// Edge flip per ADR-0005 (Bug B position-dependent Kociemba rule): the edge's
// primary color (its U/D color if it has one, else its F/B color — i.e. the
// sticker whose home face is the id's first char) is oriented when it sits on a
// U/D face of a U/D slot, or an F/B face of a middle slot. F/B moves flip all
// four of their edges; U/D/L/R preserve all. The flip sum is even for every
// Legal state. Reads off the quaternion, agreeing with the facelet-based rule
// in facelet.ts:parityOf so validation and solving share one convention.
export function edgeOrientation(e: CubieState): 0 | 1 {
  const primaryHomeFace = e.id[0]
  const primaryCurrentFace = stickerFace(e, primaryHomeFace)
  if (!primaryCurrentFace) return 0
  const isUDSlot = e.slot.includes('U') || e.slot.includes('D')
  const oriented = isUDSlot
    ? primaryCurrentFace === 'U' || primaryCurrentFace === 'D'
    : primaryCurrentFace === 'F' || primaryCurrentFace === 'B'
  return oriented ? 0 : 1
}

// Which world face does a given home-face sticker currently point at? Returns the
// Face ('U'|'D'|'R'|'L'|'F'|'B') or null if none align closely.
export function stickerFace(cubie: CubieState, homeFace: string): string | null {
  const local = faceDir(homeFace).clone().applyQuaternion(cubie.quat)
  let best: string | null = null
  let bestDot = 0.5
  for (const f of ['U', 'D', 'R', 'L', 'F', 'B']) {
    const d = local.dot(faceDir(f))
    if (d > bestDot) {
      bestDot = d
      best = f
    }
  }
  return best
}

// A corner is solved when at its home slot and every sticker aligns with its face.
export function cornerSolved(c: CubieState): boolean {
  if (c.slot !== c.id) return false
  for (const hf of slotFaces(c.id)) {
    if (stickerFace(c, hf) !== hf) return false
  }
  return true
}

// An edge is solved when at its home slot and both stickers align with their faces.
export function edgeSolved(e: CubieState): boolean {
  if (e.slot !== e.id) return false
  for (const hf of slotFaces(e.id)) {
    if (stickerFace(e, hf) !== hf) return false
  }
  return true
}

function slotFaces(slot: Slot): string[] {
  return slot.split('')
}