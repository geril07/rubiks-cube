import { applyMove, type Move } from '../moves.ts'
import type { CubeState } from '../model.ts'
import { cornerOrientation, edgeOrientation } from './orientation.ts'

export const ALL_MOVES: Move[] = [
  { face: 'U', amount: 1 }, { face: 'U', amount: 2 }, { face: 'U', amount: -1 },
  { face: 'D', amount: 1 }, { face: 'D', amount: 2 }, { face: 'D', amount: -1 },
  { face: 'R', amount: 1 }, { face: 'R', amount: 2 }, { face: 'R', amount: -1 },
  { face: 'L', amount: 1 }, { face: 'L', amount: 2 }, { face: 'L', amount: -1 },
  { face: 'F', amount: 1 }, { face: 'F', amount: 2 }, { face: 'F', amount: -1 },
  { face: 'B', amount: 1 }, { face: 'B', amount: 2 }, { face: 'B', amount: -1 },
]

export function allMoves(): Move[] {
  return ALL_MOVES
}

// The full cubie coordinate: for each cubie id (in fixed order) its current slot
// plus discrete orientation. A bijection with the physical state (centers
// fixed), so a perfect de-duplication key.
export function stateKey(s: CubeState): string {
  const c = s.corners.map((x) => `${x.id}${x.slot}${cornerOrientation(x)}`).join(',')
  const e = s.edges.map((x) => `${x.id}${x.slot}${edgeOrientation(x)}`).join(',')
  return `${c}|${e}`
}

export interface SearchSpace<S> {
  apply: (s: S, m: Move) => S
  keyOf: (s: S) => string
}

export interface BfsResult<S> {
  moves: Move[]
  state: S
}

// Breadth-first search over an abstract state space. Returns the shortest move
// sequence reaching a goal within maxDepth, or null. Two consecutive moves on
// the same face are never emitted: any such pair combines into one move
// (R R = R2, R R' = identity, R2 R = R'), so a shortest solution never needs
// them and skipping them is pruning, not a constraint.
export function bfs<S>(
  initial: S,
  isGoal: (s: S) => boolean,
  moves: Move[],
  maxDepth: number,
  space: SearchSpace<S>,
): BfsResult<S> | null {
  if (isGoal(initial)) return { moves: [], state: initial }
  if (maxDepth <= 0) return null

  const visited = new Set<string>([space.keyOf(initial)])
  let frontier: { state: S; path: Move[]; lastFace: string | null }[] = [
    { state: initial, path: [], lastFace: null },
  ]

  for (let depth = 1; depth <= maxDepth; depth++) {
    const next: { state: S; path: Move[]; lastFace: string | null }[] = []
    for (const node of frontier) {
      for (const move of moves) {
        if (move.face === node.lastFace) continue
        const ns = space.apply(node.state, move)
        const k = space.keyOf(ns)
        if (visited.has(k)) continue
        if (isGoal(ns)) {
          return { moves: [...node.path, move], state: ns }
        }
        visited.add(k)
        next.push({ state: ns, path: [...node.path, move], lastFace: move.face })
      }
    }
    frontier = next
    if (frontier.length === 0) break
  }
  return null
}

// Convenience: BFS over the full CubeState (quaternion-based applyMove). Used
// only where the compact-coordinate search is not worth it (tiny searches).
export const cubeSpace: SearchSpace<CubeState> = { apply: applyMove, keyOf: stateKey }

// Inverse of a move: same face, opposite amount (2 is self-inverse).
export function inverseMove(m: Move): Move {
  return { face: m.face, amount: m.amount === 2 ? 2 : -m.amount as 1 | -1 }
}

// Iterative-deepening A* over a mutable state space. Finds an optimal (shortest)
// solution within maxDepth using an admissible heuristic, or null. The state is
// mutated in place along the recursion and restored via applyInPlace(s,
// inverseMove(m)) on backtrack, so the hot loop allocates nothing beyond the
// path buffer. `clone` is called once on entry (to avoid mutating the caller's
// state) and once on success. Same-face consecutive moves are pruned (see bfs).
export function idaStar<S>(
  initial: S,
  isGoal: (s: S) => boolean,
  moves: Move[],
  heuristic: (s: S) => number,
  maxDepth: number,
  applyInPlace: (s: S, m: Move) => void,
  clone: (s: S) => S,
): BfsResult<S> | null {
  const s = clone(initial)
  if (isGoal(s)) return { moves: [], state: clone(s) }
  let threshold = heuristic(s)
  if (threshold > maxDepth) return null
  const path: Move[] = []
  const min = { v: Infinity }
  for (;;) {
    min.v = Infinity
    const found = dfs(s, 0, threshold, null, isGoal, moves, heuristic, applyInPlace, path, min)
    if (found) return { moves: path.slice(0, found), state: clone(s) }
    if (min.v === Infinity || min.v > maxDepth) return null
    threshold = min.v
  }
}

// Returns the goal depth (truthy via depth+1) when found, leaving `s` at the
// goal state; returns 0 (falsy) otherwise with `s` restored to the entry state.
function dfs<S>(
  s: S, g: number, threshold: number, last: string | null,
  isGoal: (s: S) => boolean, moves: Move[], heuristic: (s: S) => number,
  applyInPlace: (s: S, m: Move) => void, path: Move[], min: { v: number },
): number {
  const f = g + heuristic(s)
  if (f > threshold) {
    if (f < min.v) min.v = f
    return 0
  }
  if (isGoal(s)) return g + 1
  for (const move of moves) {
    if (move.face === last) continue
    applyInPlace(s, move)
    path[g] = move
    const res = dfs(s, g + 1, threshold, move.face, isGoal, moves, heuristic, applyInPlace, path, min)
    if (res) return res
    applyInPlace(s, inverseMove(move))
  }
  return 0
}
