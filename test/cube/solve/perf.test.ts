import { describe, expect, it } from 'vitest'
import { solve } from '../../../src/cube/solve/index.ts'
import { applySeq, scrambleMoves, isSolved, applySolution } from './helpers.ts'

// Performance regression guard. The last-layer BFS solution table is built
// lazily on the first solveLastLayer call (macro DFS + BFS over ~62K states,
// ~2-3s) and then cached in a module-level singleton; subsequent solves reuse
// it and run in tens of ms. These tests lock in both budgets so a regression
// (e.g. accidental per-call table rebuild, a broken memoization, or a slower
// search) is caught. Vitest isolates each file's module registry, so the first
// solve() in this file is a true cold start.

describe('solve performance', () => {
  it('cold-start: builds the table and solves one scramble within budget', () => {
    const s0 = applySeq(scrambleMoves(1))
    const t0 = performance.now()
    const moves = solve(s0)
    const coldMs = performance.now() - t0
    expect(isSolved(applySolution(s0, moves))).toBe(true)
    console.log(`cold solve (table build + 1 solve): ${coldMs.toFixed(0)}ms`)
    // Cold start pays the one-time macro DFS + BFS table build.
    expect(coldMs).toBeLessThan(6000)
  }, 15000)

  it('warm: per-solve stays within budget (table already built)', () => {
    const samples: number[] = []
    for (let seed = 2; seed <= 31; seed++) {
      const s0 = applySeq(scrambleMoves(seed))
      const t0 = performance.now()
      const moves = solve(s0)
      samples.push(performance.now() - t0)
      expect(isSolved(applySolution(s0, moves))).toBe(true)
    }
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length
    const max = Math.max(...samples)
    console.log(`warm solve over 30 scrambles: avg=${avg.toFixed(1)}ms max=${max.toFixed(0)}ms`)
    // A warm solve must not rebuild the table. 300ms leaves headroom for the
    // cross IDA* while catching a per-call table rebuild (~2500ms) decisively.
    expect(max).toBeLessThan(300)
  })

  it('table is built once: 50 warm solves stay flat (no per-call rebuild)', () => {
    const samples: number[] = []
    for (let seed = 100; seed < 150; seed++) {
      const s0 = applySeq(scrambleMoves(seed))
      const t0 = performance.now()
      solve(s0)
      samples.push(performance.now() - t0)
    }
    const max = Math.max(...samples)
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length
    console.log(`50 warm solves: avg=${avg.toFixed(1)}ms max=${max.toFixed(0)}ms`)
    expect(max).toBeLessThan(300)
    // If the table were rebuilt every call, the first sample would be ~2500ms
    // and the rest ~50ms. A flat budget on the max catches that regression.
    expect(samples[0]).toBeLessThan(300)
  })
})
