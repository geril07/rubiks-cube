import type { Object3D, Scene } from 'three'
import { Clock } from 'three'
import type { CubieState, CubeState, Grid3, Slot } from '../cube/model.ts'
import { isCorner, slotToGrid } from '../cube/model.ts'
import type { Move } from '../cube/moves.ts'
import { applyMove } from '../cube/moves.ts'
import { makeCubieMesh } from './cubie-factory.ts'
import type { AnimatableCubie } from './turn-animator.ts'
import { TurnAnimator } from './turn-animator.ts'

export type OnMoveApplied = (move: Move) => void

interface CubieEntry {
  cubie: CubieState
  mesh: Object3D
  grid: Grid3
}

const ALL_GRID: Grid3[] = []
for (const x of [-1, 0, 1] as const) {
  for (const y of [-1, 0, 1] as const) {
    for (const z of [-1, 0, 1] as const) {
      ALL_GRID.push({ x, y, z })
    }
  }
}

export class CubeView {
  private entries: CubieEntry[] = []
  private bySlot: Map<Slot, CubieEntry> = new Map()
  private state: CubeState
  private animator: TurnAnimator
  private clock = new Clock()
  private readonly scene: Scene
  private readonly onMoveApplied: OnMoveApplied

  constructor(
    scene: Scene,
    initialState: CubeState,
    onMoveApplied: OnMoveApplied,
  ) {
    this.scene = scene
    this.onMoveApplied = onMoveApplied
    this.state = initialState
    this.buildMeshes()
    this.rederiveFromModel()
    this.animator = new TurnAnimator(
      scene,
      () => this.animatableCubies(),
      (move) => this.handleMoveComplete(move),
    )
  }

  getState(): CubeState {
    return this.state
  }

  enqueueMove(move: Move): void {
    this.animator.enqueue(move)
  }

  reset(state: CubeState): void {
    this.animator.clear()
    this.state = state
    this.rederiveFromModel()
  }

  stop(): void {
    this.animator.clear()
  }

  tick(): void {
    const delta = this.clock.getDelta() * 1000
    this.animator.update(delta)
  }

  dispose(): void {
    this.animator.dispose()
    for (const e of this.entries) {
      this.scene.remove(e.mesh)
    }
    this.entries = []
    this.bySlot.clear()
  }

  private buildMeshes(): void {
    const tracked = new Set<string>()
    for (const c of [...this.state.corners, ...this.state.edges]) {
      tracked.add(c.id)
    }
    const movable: CubieEntry[] = []
    for (const g of ALL_GRID) {
      const mesh = makeCubieMesh(g)
      this.scene.add(mesh)
      const slot = gridToSlotSafe(g)
      if (slot && tracked.has(slot)) {
        const cubie = this.findCubieBySlot(slot)
        if (cubie) {
          movable.push({ cubie, mesh, grid: g })
        }
      }
    }
    this.entries = movable
    this.bySlot = new Map(movable.map((e) => [e.cubie.slot, e]))
  }

  private findCubieBySlot(slot: Slot): CubieState | undefined {
    const pool = isCorner(slot) ? this.state.corners : this.state.edges
    return pool.find((c) => c.slot === slot)
  }

  private findCubieById(id: Slot): CubieState | undefined {
    const pool = isCorner(id) ? this.state.corners : this.state.edges
    return pool.find((c) => c.id === id)
  }

  private rederiveFromModel(): void {
    this.bySlot = new Map()
    for (const e of this.entries) {
      const c = this.findCubieById(e.cubie.id) ?? e.cubie
      const newSlot = c.slot
      const g = slotToGrid(newSlot)
      e.cubie = c
      e.grid = g
      e.mesh.position.set(g.x, g.y, g.z)
      e.mesh.quaternion.copy(c.quat)
      this.bySlot.set(newSlot, e)
    }
  }

  private animatableCubies(): AnimatableCubie[] {
    return this.entries.map((e) => ({ mesh: e.mesh, grid: e.grid }))
  }

  private handleMoveComplete(move: Move): void {
    this.state = applyMove(this.state, move)
    this.rederiveFromModel()
    this.onMoveApplied(move)
  }
}

function gridToSlot(g: Grid3): Slot | null {
  const corners: Slot[] = [
    'URF',
    'URB',
    'ULF',
    'ULB',
    'DRF',
    'DRB',
    'DLF',
    'DLB',
  ]
  const edges: Slot[] = [
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
  const match = (s: Slot) => {
    const gg = slotToGrid(s)
    return gg.x === g.x && gg.y === g.y && gg.z === g.z
  }
  return corners.find(match) ?? edges.find(match) ?? null
}

function gridToSlotSafe(g: Grid3): Slot | null {
  return gridToSlot(g)
}