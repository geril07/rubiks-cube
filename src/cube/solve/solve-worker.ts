/// <reference lib="webworker" />
import type { FastState } from './tables.ts'
import type { Move } from '../moves.ts'
import { solveFast, prepareSolver } from './index.ts'

// Eagerly build both solution tables (cross BFS + last-layer macro/BFS, ~3s
// total) on worker load, in parallel with the main thread rendering the cube.
// By the time the user clicks Solve, the tables are warm and solveFast is
// instant. The main thread never blocks on table construction.
prepareSolver()

interface SolveRequest {
  id: number
  fastState: FastState
}

interface SolveResponse {
  id: number
  moves: Move[]
}

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = (e: MessageEvent<SolveRequest>) => {
  const { id, fastState } = e.data
  const moves = solveFast(fastState)
  const res: SolveResponse = { id, moves }
  ctx.postMessage(res)
}
