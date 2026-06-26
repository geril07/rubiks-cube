import { Group, Quaternion, Vector3 } from 'three'
import type { Object3D } from 'three'
import type { Scene } from 'three'
import type { Move } from '../cube/moves.ts'
import { rotationForMove, sliceForMove } from '../cube/moves.ts'
import type { Grid3 } from '../cube/model.ts'

const tmpV = new Vector3()

export interface AnimatableCubie {
  mesh: Object3D
  grid: Grid3
}

export type OnMoveComplete = (move: Move) => void

export class TurnAnimator {
  private queue: Move[] = []
  private active: Move | null = null
  private pivot: Group | null = null
  private members: AnimatableCubie[] = []
  private elapsed = 0
  private duration = 250
  private startQuat = new Quaternion()
  private endQuat = new Quaternion()
  private disposed = false
  private readonly scene: Scene
  private readonly cubies: () => AnimatableCubie[]
  private readonly onComplete: OnMoveComplete

  constructor(
    scene: Scene,
    cubies: () => AnimatableCubie[],
    onComplete: OnMoveComplete,
  ) {
    this.scene = scene
    this.cubies = cubies
    this.onComplete = onComplete
  }

  enqueue(move: Move): void {
    this.queue.push(move)
  }

  clear(): void {
    this.queue.length = 0
  }

  get queueLength(): number {
    return this.queue.length
  }

  get isAnimating(): boolean {
    return this.active !== null
  }

  update(deltaMs: number): void {
    if (this.disposed) return
    if (this.active === null) {
      const next = this.queue.shift()
      if (!next) return
      this.beginMove(next)
    }
    if (this.active !== null) {
      this.stepMove(deltaMs)
    }
  }

  private beginMove(move: Move): void {
    this.active = move
    this.elapsed = 0
    this.endQuat = rotationForMove(move)
    this.startQuat = new Quaternion()
    const inSlice = sliceForMove(move)
    this.members = this.cubies().filter((c) => inSlice(c.grid))
    const pivot = new Group()
    this.scene.add(pivot)
    for (const m of this.members) {
      pivot.attach(m.mesh)
    }
    this.pivot = pivot
  }

  private stepMove(deltaMs: number): void {
    if (!this.active || !this.pivot) return
    this.elapsed += deltaMs
    const t = Math.min(this.elapsed / this.duration, 1)
    const eased = easeInOutCubic(t)
    this.pivot.quaternion.slerpQuaternions(this.startQuat, this.endQuat, eased)
    if (t >= 1) this.completeMove()
  }

  private completeMove(): void {
    const move = this.active
    const pivot = this.pivot
    if (!move || !pivot) return
    for (const m of this.members) {
      this.scene.attach(m.mesh)
    }
    this.scene.remove(pivot)
    this.pivot = null
    this.members = []
    this.active = null
    this.startQuat.identity()
    this.endQuat.identity()
    this.onComplete(move)
  }

  dispose(): void {
    this.disposed = true
    if (this.pivot) {
      for (const m of this.members) {
        this.scene.attach(m.mesh)
      }
      this.scene.remove(this.pivot)
      this.pivot = null
      this.members = []
      this.active = null
    }
    this.queue.length = 0
    tmpV.set(0, 0, 0)
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}