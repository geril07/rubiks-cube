import { Quaternion, Vector3 } from 'three'
import type { CubeState, CubieState, Face, Slot, CornerSlot, EdgeSlot } from './model.ts'
import { quaternionBetweenFrames } from './rotation.ts'

// ── Facelet format ──────────────────────────────────────────────────────────
// Facelets is a 54-element Color[] in URFDLB order (Kociemba convention):
//   index 0..8   → U face, 9..17 → R face, 18..26 → F face,
//   27..35 → D face, 36..44 → L face, 45..53 → B face.
// Within each face the 9 stickers read top-left → top-right → bottom-right
// as the face is viewed from outside the cube.
export type Color = 'W' | 'Y' | 'R' | 'O' | 'G' | 'B'
export type Facelets = Color[]

export interface ValidationError {
  kind: 'count' | 'feasibility' | 'parity'
  positions?: number[]
  message: string
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] }

// ── BOY color scheme (Western) ─────────────────────────────────────────────
export const FACE_COLOR: Record<Face, Color> = {
  U: 'W',
  D: 'Y',
  R: 'R',
  L: 'O',
  F: 'G',
  B: 'B',
}

// Each cubie id maps to its sticker colors keyed by the face direction the
// sticker points at in the solved (home, orientation 0) position.
function slotFaces(slot: Slot): Face[] {
  return slot.split('') as Face[]
}

function cubieColors(id: Slot): Record<Face, Color> {
  const out = {} as Record<Face, Color>
  for (const f of slotFaces(id)) out[f] = FACE_COLOR[f]
  return out
}

// Face centre coords (+Y, −Y, +X, −X, +Z, −Z).
const FACE_DIR: Record<Face, Vector3> = {
  U: new Vector3(0, 1, 0),
  D: new Vector3(0, -1, 0),
  R: new Vector3(1, 0, 0),
  L: new Vector3(-1, 0, 0),
  F: new Vector3(0, 0, 1),
  B: new Vector3(0, 0, -1),
}

// For a cubie currently occupying `slot` with orientation `quat`, return the
// color visible on the face-direction `worldFace`. Rotates each of the
// cubie's home sticker directions by the quat; the one that aligns with
// worldFace contributes its color.
function stickerColorOn(
  cubie: CubieState,
  worldFace: Face,
): Color {
  const homeFaces = slotFaces(cubie.id)
  const target = FACE_DIR[worldFace]
  for (const hf of homeFaces) {
    const local = FACE_DIR[hf].clone().applyQuaternion(cubie.quat)
    if (local.distanceTo(target) < 0.5) return cubieColors(cubie.id)[hf]
  }
  throw new Error(`no sticker of ${cubie.id} faces ${worldFace}`)
}

// Inverse of stickerColorOn: given the colors observed on each face of a slot,
// return the mapping {homeFace -> observedFace} (which home sticker is now on
// which observed face), matched by color.
function stickerMapFromColors(
  id: Slot,
  slot: Slot,
  observed: Record<Face, Color>,
): Record<Face, Face> {
  const home = cubieColors(id)
  const slotFs = slotFaces(slot)
  const map = {} as Record<Face, Face>
  for (const hf of slotFaces(id)) {
    const color = home[hf]
    const oface = slotFs.find((of) => observed[of] === color)
    if (!oface) throw new Error(`color ${color} not found on slot ${slot} for cubie ${id}`)
    map[hf] = oface
  }
  return map
}

// Quaternion that rotates each homeFace direction onto its mapped observedFace
// direction. Builds an orthonormal frame from the (3 or 2) basis vectors.
function quatFromStickerMap(
  id: Slot,
  map: Record<Face, Face>,
): Quaternion {
  const faces = slotFaces(id)
  const homeBasis = faces.map((f) => FACE_DIR[f])
  const obsBasis = faces.map((f) => FACE_DIR[map[f]])
  // Solve for the rotation R such that R * homeBasis[i] = obsBasis[i].
  // For 2 vectors (edges) the third is implied by the cross product.
  let h: Vector3[]
  let o: Vector3[]
  if (faces.length === 3) {
    h = homeBasis
    o = obsBasis
  } else {
    const h0 = homeBasis[0], h1 = homeBasis[1]
    const o0 = obsBasis[0], o1 = obsBasis[1]
    h = [h0, h1, new Vector3().crossVectors(h0, h1)]
    o = [o0, o1, new Vector3().crossVectors(o0, o1)]
  }
  return quaternionBetweenFrames(h, o)
}

// ── Slot → facelet indices ──────────────────────────────────────────────────
// Face layout (viewed from outside): rows top→bottom, cols left→right.
// We build the index of the facelet belonging to a given (slot, face) pair.

const FACE_ROW_AXIS: Record<Face, 'x' | 'y' | 'z'> = {
  U: 'z', D: 'z', R: 'y', L: 'y', F: 'y', B: 'y',
}
const FACE_COL_AXIS: Record<Face, 'x' | 'y' | 'z'> = {
  U: 'x', D: 'x', R: 'z', L: 'z', F: 'x', B: 'x',
}
// Whether the row/col axis increases downward/rightward. For U (looking down
// from +Y), +Z is the *top* row, so row increases as z decreases → rowDown.
const ROW_DOWN_POSITIVE: Record<Face, boolean> = {
  U: false, D: true, R: false, L: true, F: false, B: true,
}
const COL_RIGHT_POSITIVE: Record<Face, boolean> = {
  U: true, D: true, R: true, L: false, F: true, B: false,
}

function faceletIndex(face: Face, otherFaces: Face[]): number {
  const base = faceOrder.indexOf(face) * 9
  const ra = FACE_ROW_AXIS[face]
  const ca = FACE_COL_AXIS[face]
  const rd = ROW_DOWN_POSITIVE[face]
  const cr = COL_RIGHT_POSITIVE[face]
  const comps: Partial<Record<'x' | 'y' | 'z', number>> = {}
  for (const f of otherFaces) {
    const dd = FACE_DIR[f]
    comps.x = dd.x !== 0 ? dd.x : comps.x
    comps.y = dd.y !== 0 ? dd.y : comps.y
    comps.z = dd.z !== 0 ? dd.z : comps.z
  }
  const r = comps[ra] ?? 0
  const c = comps[ca] ?? 0
  const row = rd ? (r === 1 ? 2 : r === -1 ? 0 : 1) : (r === 1 ? 0 : r === -1 ? 2 : 1)
  const col = cr ? (c === 1 ? 2 : c === -1 ? 0 : 1) : (c === 1 ? 0 : c === -1 ? 2 : 1)
  return base + row * 3 + col
}

const faceOrder: Face[] = ['U', 'R', 'F', 'D', 'L', 'B']

const CORNER_SLOTS: readonly CornerSlot[] = [
  'URF', 'URB', 'ULF', 'ULB', 'DRF', 'DRB', 'DLF', 'DLB',
]
const EDGE_SLOTS: readonly EdgeSlot[] = [
  'UR', 'UF', 'UB', 'UL', 'DR', 'DF', 'DB', 'DL', 'FR', 'FL', 'BR', 'BL',
]

export function toFacelets(state: CubeState): Facelets {
  const out: Color[] = new Array(54)
  // centres
  for (const f of faceOrder) {
    out[faceOrder.indexOf(f) * 9 + 4] = FACE_COLOR[f]
  }
  // build slot→cubie maps
  const cornerAt = new Map<CornerSlot, CubieState>()
  for (const c of state.corners) cornerAt.set(c.slot as CornerSlot, c)
  const edgeAt = new Map<EdgeSlot, CubieState>()
  for (const e of state.edges) edgeAt.set(e.slot as EdgeSlot, e)
  // corners
  for (const c of state.corners) {
    const fs = slotFaces(c.slot) as Face[]
    for (const worldFace of fs) {
      const idx = faceletIndex(worldFace, fs.filter((f) => f !== worldFace))
      out[idx] = stickerColorOn(c, worldFace)
    }
  }
  // edges
  for (const e of state.edges) {
    const fs = slotFaces(e.slot) as Face[]
    for (const worldFace of fs) {
      const idx = faceletIndex(worldFace, fs.filter((f) => f !== worldFace))
      out[idx] = stickerColorOn(e, worldFace)
    }
  }
  return out as Facelets
}

export function fromFacelets(facelets: Facelets): CubeState {
  if (facelets.length !== 54) {
    throw new Error(`fromFacelets: expected 54 facelets, got ${facelets.length}`)
  }

  // Read the color on each face of a slot.
  const colorOn = (slot: Slot, face: Face): Color => {
    const fs = slotFaces(slot)
    const idx = faceletIndex(face, fs.filter((f) => f !== face))
    return facelets[idx]
  }

  const corners: CubieState[] = []
  for (const slot of CORNER_SLOTS) {
    const observed = {} as Record<Face, Color>
    for (const f of slotFaces(slot)) observed[f] = colorOn(slot, f)
    const id = findCubieByColors(observed)
    if (!id) throw new Error(`fromFacelets: no corner matches colors ${JSON.stringify(observed)}`)
    const map = stickerMapFromColors(id, slot, observed)
    const quat = quatFromStickerMap(id, map)
    corners.push({ id, slot, quat })
  }

  const edges: CubieState[] = []
  for (const slot of EDGE_SLOTS) {
    const observed = {} as Record<Face, Color>
    for (const f of slotFaces(slot)) observed[f] = colorOn(slot, f)
    const id = findCubieByColors(observed)
    if (!id) throw new Error(`fromFacelets: no edge matches colors ${JSON.stringify(observed)}`)
    const map = stickerMapFromColors(id, slot, observed)
    const quat = quatFromStickerMap(id, map)
    edges.push({ id, slot, quat })
  }

  return { corners, edges }
}

// Build color-set → cubie id lookup tables.
const COLOR_TO_CORNER: Map<string, CornerSlot> = new Map(
  CORNER_SLOTS.map((s) => [colorKey(s), s] as const),
)
const COLOR_TO_EDGE: Map<string, EdgeSlot> = new Map(
  EDGE_SLOTS.map((s) => [colorKey(s), s] as const),
)

function colorKey(id: Slot): string {
  return slotFaces(id)
    .map((f) => FACE_COLOR[f])
    .sort()
    .join('')
}

function findCubieByColors(observed: Record<Face, Color>): Slot | null {
  const key = Object.values(observed).sort().join('')
  return COLOR_TO_CORNER.get(key) ?? COLOR_TO_EDGE.get(key) ?? null
}

export function validateFacelets(facelets: Facelets): ValidationResult {
  if (facelets.length !== 54) {
    return {
      ok: false,
      errors: [{ kind: 'count', message: `expected 54 facelets, got ${facelets.length}` }],
    }
  }

  const errors: ValidationError[] = []

  // ── Check 1: color counts ───────────────────────────────────────────────
  const counts: Record<Color, number> = { W: 0, Y: 0, R: 0, O: 0, G: 0, B: 0 }
  const badColorPositions: number[] = []
  for (let i = 0; i < 54; i++) {
    const c = facelets[i]
    if (!counts.hasOwnProperty(c)) {
      badColorPositions.push(i)
      continue
    }
    counts[c]++
  }
  const countErrors: number[] = []
  ;(Object.keys(counts) as Color[]).forEach((c) => {
    if (counts[c] !== 9) countErrors.push(...positionsOfColor(facelets, c))
  })
  if (badColorPositions.length > 0 || countErrors.length > 0) {
    errors.push({
      kind: 'count',
      positions: [...badColorPositions, ...countErrors],
      message: countMessage(counts, badColorPositions.length),
    })
  }

  // Feasibility & parity need the slot→color reading; if counts are wrong the
  // slot reads may be invalid, but we still report the count error first and
  // attempt the rest to gather a full picture (the UI highlights all issues).
  const read = readSlots(facelets)

  // ── Check 2: piece feasibility ──────────────────────────────────────────
  const feasibilityPositions: number[] = []
  const feasibilityMsgs: string[] = []
  for (const [slot, colors] of read.corners) {
    const key = [...colors].sort().join('')
    if (!COLOR_TO_CORNER.has(key)) {
      feasibilityPositions.push(...slotFaceletIndices(slot))
      feasibilityMsgs.push(`corner ${slot} has impossible colors [${colors.join(',')}]`)
    }
  }
  for (const [slot, colors] of read.edges) {
    const key = [...colors].sort().join('')
    if (!COLOR_TO_EDGE.has(key)) {
      feasibilityPositions.push(...slotFaceletIndices(slot))
      feasibilityMsgs.push(`edge ${slot} has impossible colors [${colors.join(',')}]`)
    }
  }
  if (feasibilityPositions.length > 0) {
    errors.push({
      kind: 'feasibility',
      positions: feasibilityPositions,
      message: feasibilityMsgs.join('; '),
    })
  }

  // ── Check 3: parity (only meaningful if pieces are feasible) ────────────
  if (errors.every((e) => e.kind !== 'feasibility')) {
    const parity = parityOf(read)
    if (!parity.ok) {
      errors.push({
        kind: 'parity',
        positions: parity.positions,
        message: parity.message,
      })
    }
  }

  if (errors.length === 0) return { ok: true }
  return { ok: false, errors }
}

function countMessage(counts: Record<Color, number>, badCount: number): string {
  if (badCount > 0) return `found ${badCount} facelet(s) with an unknown color`
  const parts: string[] = []
  ;(Object.keys(counts) as Color[]).forEach((c) => {
    if (counts[c] !== 9) parts.push(`${c}=${counts[c]}`)
  })
  return `color counts not 9 each: ${parts.join(', ')}`
}

function positionsOfColor(facelets: Facelets, color: Color): number[] {
  const out: number[] = []
  for (let i = 0; i < facelets.length; i++) if (facelets[i] === color) out.push(i)
  return out
}

interface SlotRead {
  corners: Map<CornerSlot, Color[]>
  edges: Map<EdgeSlot, Color[]>
}

function readSlots(facelets: Facelets): SlotRead {
  const colorOn = (slot: Slot, face: Face): Color => {
    const fs = slotFaces(slot)
    return facelets[faceletIndex(face, fs.filter((f) => f !== face))]
  }
  const corners = new Map<CornerSlot, Color[]>()
  for (const slot of CORNER_SLOTS) {
    corners.set(slot, slotFaces(slot).map((f) => colorOn(slot, f)))
  }
  const edges = new Map<EdgeSlot, Color[]>()
  for (const slot of EDGE_SLOTS) {
    edges.set(slot, slotFaces(slot).map((f) => colorOn(slot, f)))
  }
  return { corners, edges }
}

function slotFaceletIndices(slot: Slot): number[] {
  const fs = slotFaces(slot)
  return fs.map((f) => faceletIndex(f, fs.filter((g) => g !== f)))
}

// ── Parity (check 3) ───────────────────────────────────────────────────────
// Corner-twist sum ≡ 0 mod 3; edge-flip sum ≡ 0 mod 2; corner and edge
// permutation parities equal. Discrete orientation per ADR-0003:
//   corner twist 0/1/2 — how far the U/D sticker has rotated from the U/D face;
//   edge flip 0/1 — F/B moves flip edges, U/D/L/R do not.

interface ParityResult {
  ok: boolean
  positions: number[]
  message: string
}

function parityOf(read: SlotRead): ParityResult {
  const positions: number[] = []
  const msgs: string[] = []

  // Corner twists. Per ADR-0003: twist 0/1/2 = how far the U/D sticker has
  // rotated from the U/D face. We use the Kociemba slot-ordered convention,
  // where the twist is the position of the U/D-coloured sticker within the
  // slot's cyclic [U/D, R/L, F/B] facelet ordering. Which of R/L or F/B is
  // twist 1 vs 2 is decided per-corner by the body-diagonal parity (sign of
  // the outward diagonal's x·y·z): it flips between corners so that a physical
  // +120° twist about the outward body diagonal cycles 0→1→2→0 uniformly. This
  // makes the per-slot twist delta under any face turn state-independent, so the
  // coordinate is a homomorphism and the sum ≡ 0 mod 3 invariant holds for every
  // Legal state.
  let cornerTwistSum = 0
  for (const slot of CORNER_SLOTS) {
    const colors = read.corners.get(slot)!
    const faces = slotFaces(slot)
    const udIdx = colors.findIndex((c) => c === 'W' || c === 'Y')
    if (udIdx < 0) continue // handled by feasibility
    const udFace = faces[udIdx]
    let twist: 0 | 1 | 2
    if (udFace === 'U' || udFace === 'D') {
      twist = 0
    } else {
      let dx = 0, dy = 0, dz = 0
      for (const f of faces) { const d = FACE_DIR[f]; dx += d.x; dy += d.y; dz += d.z }
      const rlIsOne = dx * dy * dz > 0 // body-diagonal parity +1 → R/L is twist 1
      const onRL = udFace === 'R' || udFace === 'L'
      twist = rlIsOne === onRL ? 1 : 2
    }
    cornerTwistSum += twist
    if (twist !== 0) positions.push(...slotFaceletIndices(slot))
  }
  if (cornerTwistSum % 3 !== 0) {
    msgs.push(`corner-twist sum ${cornerTwistSum} ≢ 0 mod 3`)
  }

  // Edge flips. Per ADR-0003 (F/B moves flip edges; U/D/L/R do not) we use the
  // position-DEPENDENT Kociemba rule: the edge's primary color (its U/D color
  // if it has one, else its F/B color) is oriented when it sits on the U/D face
  // of a U/D slot, or on the F/B face of a middle slot. This makes F/B flip all
  // four of their edges while U/D/L/R preserve all of them, so the flip sum is
  // even for every Legal state.
  let edgeFlipSum = 0
  for (const slot of EDGE_SLOTS) {
    const colors = read.edges.get(slot)!
    const faces = slotFaces(slot)
    const hasUD = colors.some((c) => c === 'W' || c === 'Y')
    const pIdx = hasUD
      ? colors.findIndex((c) => c === 'W' || c === 'Y')
      : colors.findIndex((c) => c === 'G' || c === 'B')
    if (pIdx < 0) continue // handled by feasibility
    const primaryFace = faces[pIdx]
    const isUDSlot = slot.includes('U') || slot.includes('D')
    const oriented = isUDSlot
      ? primaryFace === 'U' || primaryFace === 'D'
      : primaryFace === 'F' || primaryFace === 'B'
    const flip: 0 | 1 = oriented ? 0 : 1
    edgeFlipSum += flip
    if (flip !== 0) positions.push(...slotFaceletIndices(slot))
  }
  if (edgeFlipSum % 2 !== 0) {
    msgs.push(`edge-flip sum ${edgeFlipSum} ≢ 0 mod 2`)
  }

  // Permutation parity: sign of the permutation mapping each cubie id to the
  // slot it occupies. Read from facelets: for each slot, the observed colors
  // identify the cubie id; parity = inversion count of [idIndex → slotIndex].
  const cornerPerm = CORNER_SLOTS.map((slot) => {
    const colors = read.corners.get(slot)!
    const id = COLOR_TO_CORNER.get([...colors].sort().join(''))!
    return CORNER_SLOTS.indexOf(id)
  })
  const edgePerm = EDGE_SLOTS.map((slot) => {
    const colors = read.edges.get(slot)!
    const id = COLOR_TO_EDGE.get([...colors].sort().join(''))!
    return EDGE_SLOTS.indexOf(id)
  })
  const cornerParity = inversionParity(cornerPerm)
  const edgeParity = inversionParity(edgePerm)
  if (cornerParity !== edgeParity) {
    msgs.push(`corner permutation parity ${cornerParity} ≠ edge permutation parity ${edgeParity}`)
    positions.push(...CORNER_SLOTS.flatMap((s) => slotFaceletIndices(s)))
  }

  if (msgs.length === 0) return { ok: true, positions: [], message: '' }
  return { ok: false, positions, message: msgs.join('; ') }
}

function inversionParity(perm: number[]): 0 | 1 {
  let inv = 0
  for (let i = 0; i < perm.length; i++) {
    for (let j = i + 1; j < perm.length; j++) {
      if (perm[i] > perm[j]) inv++
    }
  }
  return (inv % 2) as 0 | 1
}

export function faceletsToString(_f: Facelets): string {
  throw new Error('not implemented')
}

export function parseFaceletsString(_s: string): Facelets {
  throw new Error('not implemented')
}