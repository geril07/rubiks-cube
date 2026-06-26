import './style.css'
import { solvedState } from './cube/model.ts'
import type { CubeState } from './cube/model.ts'
import { generateScramble } from './cube/scramble.ts'
import { toFast } from './cube/solve/tables.ts'
import type { Move } from './cube/moves.ts'
import { createScene } from './render/scene.ts'
import { CubeView } from './render/cube-view.ts'
import { setupControls } from './ui/controls.ts'

const canvasHost = document.getElementById('canvas-host')!
const uiHost = document.getElementById('ui-host')!

const ctx = createScene(canvasHost)

let onMoveApplied: (move: Move) => void = () => {}

const view = new CubeView(ctx.scene, solvedState(), (move) => {
  onMoveApplied(move)
})

// Solver runs in a Web Worker so the ~3s one-time table build happens in
// parallel with page load (never blocking the main thread) and each Solve click
// is instant. The worker receives a 40-byte FastState (transferable) and
// returns the move list.
const solveWorker = new Worker(
  new URL('./cube/solve/solve-worker.ts', import.meta.url),
  { type: 'module' },
)

let solveReqId = 0
const solvePending = new Map<number, (moves: Move[]) => void>()
solveWorker.onmessage = (e: MessageEvent) => {
  const { id, moves } = e.data as { id: number; moves: Move[] }
  const resolve = solvePending.get(id)
  if (resolve) {
    resolve(moves)
    solvePending.delete(id)
  }
}

function solveAsync(state: CubeState): Promise<Move[]> {
  const id = ++solveReqId
  const f = toFast(state)
  return new Promise((resolve) => {
    solvePending.set(id, resolve)
    solveWorker.postMessage(
      { id, fastState: f },
      [f.cs.buffer, f.ct.buffer, f.es.buffer, f.ef.buffer],
    )
  })
}

const controls = setupControls(uiHost, {
  onMove: (m) => view.enqueueMove(m),
  getLastMove: () => null,
  onScramble: () => {
    for (const m of generateScramble()) {
      view.enqueueMove(m)
      controls.appendMove(m)
    }
  },
  onSolve: () => {
    controls.setSolving(true)
    solveAsync(view.getState()).then((moves) => {
      controls.setSolving(false)
      controls.setSolution(moves)
      for (const m of moves) view.enqueueMove(m)
    })
  },
  onReset: () => {
    view.reset(solvedState())
    controls.clearHistory()
  },
  onStop: () => {
    view.stop()
  },
})

onMoveApplied = () => {
  controls.tickProgress()
}

ctx.renderer.setAnimationLoop(() => {
  view.tick()
  ctx.controls.update()
  ctx.renderer.render(ctx.scene, ctx.camera)
})

window.addEventListener('beforeunload', () => {
  controls.dispose()
  view.dispose()
  ctx.dispose()
  solveWorker.terminate()
})