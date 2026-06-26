import { describe, expect, it } from 'vitest'
import { solvedState } from '../../src/cube/model.ts'
import type { CubeState } from '../../src/cube/model.ts'
import { applyMove } from '../../src/cube/moves.ts'
import type { Move } from '../../src/cube/moves.ts'
import { generateScramble } from '../../src/cube/scramble.ts'
import { toFacelets, fromFacelets } from '../../src/cube/facelet.ts'
import type { Color, Facelets } from '../../src/cube/facelet.ts'
import { validateFacelets } from '../../src/cube/facelet.ts'

// ----- helpers ---------------------------------------------------------------

const SOLVED_NET: Color[] = [
  // U (9 × White)
  'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W',
  // R (9 × Red)
  'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R',
  // F (9 × Green)
  'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G',
  // D (9 × Yellow)
  'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y',
  // L (9 × Orange)
  'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O',
  // B (9 × Blue)
  'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B',
]

function statesEqual(a: CubeState, b: CubeState): boolean {
  if (a.corners.length !== b.corners.length) return false
  if (a.edges.length !== b.edges.length) return false
  const ca = new Map(a.corners.map((c) => [c.id, c]))
  const cb = new Map(b.corners.map((c) => [c.id, c]))
  const ea = new Map(a.edges.map((e) => [e.id, e]))
  const eb = new Map(b.edges.map((e) => [e.id, e]))
  for (const id of ca.keys()) {
    const x = ca.get(id)!, y = cb.get(id)
    if (!y) return false
    if (x.slot !== y.slot) return false
    if (!quatsEqual(x.quat, y.quat)) return false
  }
  for (const id of ea.keys()) {
    const x = ea.get(id)!, y = eb.get(id)
    if (!y) return false
    if (x.slot !== y.slot) return false
    if (!quatsEqual(x.quat, y.quat)) return false
  }
  return true
}

function quatsEqual(p: { x: number; y: number; z: number; w: number }, q: { x: number; y: number; z: number; w: number }): boolean {
  // Quaternions double-cover SO(3): q and -q are the same physical rotation.
  // Cube-state equality is defined by identical sticker positions, so the
  // comparison must be sign-agnostic.
  const eps = 1e-9
  const same =
    Math.abs(p.x - q.x) < eps &&
    Math.abs(p.y - q.y) < eps &&
    Math.abs(p.z - q.z) < eps &&
    Math.abs(p.w - q.w) < eps
  const flipped =
    Math.abs(p.x + q.x) < eps &&
    Math.abs(p.y + q.y) < eps &&
    Math.abs(p.z + q.z) < eps &&
    Math.abs(p.w + q.w) < eps
  return same || flipped
}

function swap<T>(arr: T[], i: number, j: number): void {
  const t = arr[i]; arr[i] = arr[j]; arr[j] = t
}

// ----- tests -----------------------------------------------------------------

describe('toFacelets — solved state', () => {
  it('serializes the solved cube to the trivial BOY net in URFDLB order', () => {
    const f = toFacelets(solvedState())
    expect(f).toHaveLength(54)
    expect(f).toEqual(SOLVED_NET)
  })
})

describe('fromFacelets — solved net', () => {
  it('parses the trivial BOY net back to the solved Cube State', () => {
    const state = fromFacelets(SOLVED_NET)
    expect(statesEqual(state, solvedState())).toBe(true)
  })
})

describe('bijection on solved state', () => {
  it('fromFacelets(toFacelets(solved)) equals solved', () => {
    const s = solvedState()
    expect(statesEqual(fromFacelets(toFacelets(s)), s)).toBe(true)
  })

  it('toFacelets(fromFacelets(solvedNet)) equals solvedNet', () => {
    const f = SOLVED_NET as Facelets
    expect(toFacelets(fromFacelets(f))).toEqual(f)
  })
})

describe('bijection after a single R move', () => {
  it('fromFacelets(toFacelets(applyMove(solved, R))) equals the moved state', () => {
    const moved = applyMove(solvedState(), { face: 'R', amount: 1 })
    const roundTrip = fromFacelets(toFacelets(moved))
    expect(statesEqual(roundTrip, moved)).toBe(true)
  })

  it('toFacelets(fromFacelets(toFacelets(moved))) equals toFacelets(moved)', () => {
    const moved = applyMove(solvedState(), { face: 'R', amount: 1 })
    const f = toFacelets(moved)
    expect(toFacelets(fromFacelets(f))).toEqual(f)
  })
})

describe('bijection after each of the other 5 face quarter-turns', () => {
  for (const face of ['U', 'D', 'L', 'F', 'B'] as const) {
    it(`fromFacelets(toFacelets(applyMove(solved, ${face}))) equals the moved state`, () => {
      const moved = applyMove(solvedState(), { face, amount: 1 })
      expect(statesEqual(fromFacelets(toFacelets(moved)), moved)).toBe(true)
    })
    it(`toFacelets(fromFacelets(toFacelets(${face}-moved))) is stable`, () => {
      const f = toFacelets(applyMove(solvedState(), { face, amount: 1 }))
      expect(toFacelets(fromFacelets(f))).toEqual(f)
    })
  }
})

describe('bijection after a 2-move sequence', () => {
  it('R then U: fromFacelets(toFacelets(state)) equals state', () => {
    const s = applyMove(applyMove(solvedState(), { face: 'R', amount: 1 }), { face: 'U', amount: 1 })
    expect(statesEqual(fromFacelets(toFacelets(s)), s)).toBe(true)
  })
})

describe('bijection over a full scramble', () => {
  it('fromFacelets(toFacelets(scrambled)) equals scrambled for a 20-move scramble', () => {
    let s = solvedState()
    for (const m of generateScramble()) s = applyMove(s, m)
    expect(statesEqual(fromFacelets(toFacelets(s)), s)).toBe(true)
  })

  it('toFacelets(fromFacelets(toFacelets(scrambled))) is stable', () => {
    let s = solvedState()
    for (const m of generateScramble()) s = applyMove(s, m)
    const f = toFacelets(s)
    expect(toFacelets(fromFacelets(f))).toEqual(f)
  })
})

describe('validateFacelets — solved net', () => {
  it('accepts the solved BOY net', () => {
    expect(validateFacelets(SOLVED_NET as Facelets)).toEqual({ ok: true })
  })
})

describe('validateFacelets — check 1: color counts', () => {
  it('rejects a net with 10 White and 8 Red, reporting the count kind', () => {
    const f = [...SOLVED_NET] as Facelets
    // Turn one Red sticker (index 9, first of R face) into White → 10 W, 8 R.
    f[9] = 'W'
    const r = validateFacelets(f)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.kind === 'count')).toBe(true)
      const countErr = r.errors.find((e) => e.kind === 'count')!
      expect(countErr.positions).toBeDefined()
      expect(countErr.positions!.length).toBeGreaterThan(0)
    }
  })
})

describe('validateFacelets — check 2: piece feasibility', () => {
  it('rejects a corner with two White stickers, reporting the feasibility kind', () => {
    // URF corner stickers are at U-facelet 2 (W), R-facelet 11 (R), F-facelet 20 (G).
    // Set the F-sticker (20) to White → URF shows {W, R, W}: two Whites, no real
    // corner has that. Rebalance counts by turning a non-URF White sticker (the
    // UR edge's U-sticker at index 5) into Green: W stays 9, G stays 9. The UR
    // edge then reads {G, R} = the FR edge signature, which is still feasible, so
    // the only feasibility failure is the impossible URF corner.
    const g = [...SOLVED_NET] as Facelets
    g[20] = 'W'
    g[5] = 'G'
    const r = validateFacelets(g)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.kind === 'feasibility')).toBe(true)
      const fe = r.errors.find((e) => e.kind === 'feasibility')!
      expect(fe.positions).toBeDefined()
      expect(fe.positions!.length).toBeGreaterThan(0)
      expect(fe.positions).toEqual(expect.arrayContaining([2, 11, 20]))
    }
  })
})

describe('validateFacelets — check 3: parity', () => {
  it('rejects a single corner swap (legal pieces, wrong permutation parity), reporting the parity kind', () => {
    // Swap two whole corners' stickers (URF <-> URB) so every piece is still
    // real and counts are unchanged, but the corner permutation is a single
    // transposition (odd) while edges are untouched (even) → parity mismatch.
    // URF stickers: U=2 (W), R=11 (R), F=20 (G).
    // URB stickers: U=8 (W), R=9 (R), B=51 (B).
    const f = [...SOLVED_NET] as Facelets
    swap(f, 2, 8)    // U-face stickers
    swap(f, 11, 9)   // R-face stickers
    swap(f, 20, 51)  // F(URF) <-> B(URB) stickers
    // URF slot now reads {W, R, B} = URB cubie; URB reads {W, R, G} = URF cubie.
    // Corner permutation = transposition of URF & URB = odd; edges = even.
    const r = validateFacelets(f)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.kind === 'parity')).toBe(true)
      const pe = r.errors.find((e) => e.kind === 'parity')!
      expect(pe.positions).toBeDefined()
      expect(pe.positions!.length).toBeGreaterThan(0)
    }
  })
})

describe('validateFacelets — scrambled net is accepted', () => {
  it('validateFacelets(toFacelets(scramble(solved))) returns ok:true', () => {
    let s = solvedState()
    for (const m of generateScramble()) s = applyMove(s, m)
    expect(validateFacelets(toFacelets(s))).toEqual({ ok: true })
  })

  for (const seq of [
    [{ face: 'F', amount: 1 }, { face: 'R', amount: -1 }, { face: 'U', amount: 2 }] as Move[],
    [{ face: 'B', amount: -1 }, { face: 'L', amount: 2 }, { face: 'D', amount: 1 }, { face: 'F', amount: 1 }] as Move[],
  ]) {
    const label = seq.map((m) => `${m.face}${m.amount === 2 ? '2' : m.amount === -1 ? "'" : ''}`).join(' ')
    it(`validateFacelets(toFacelets(${label})) returns ok:true`, () => {
      let s = solvedState()
      for (const m of seq) s = applyMove(s, m)
      expect(validateFacelets(toFacelets(s))).toEqual({ ok: true })
    })
  }
})

describe('validateFacelets — every single move yields a legal net', () => {
  // Locks in the corner-twist (mod 3) and edge-flip (mod 2) conventions: each
  // of the 18 face turns, applied to solved, must still validate. If either
  // discrete-orientation rule is wrong, one of these will fail with a parity
  // error even when the bijection round-trips.
  const faces = ['U', 'D', 'L', 'R', 'F', 'B'] as const
  const amounts = [1, 2, -1] as const
  for (const face of faces) {
    for (const amount of amounts) {
      const label = `${face}${amount === 2 ? '2' : amount === -1 ? "'" : ''}`
      it(`validateFacelets(toFacelets(${label})) returns ok:true`, () => {
        const s = applyMove(solvedState(), { face, amount })
        expect(validateFacelets(toFacelets(s))).toEqual({ ok: true })
      })
    }
  }
})

describe('bijection over varied multi-move sequences', () => {
  const sequences: Move[][] = [
    [{ face: 'F', amount: 1 }, { face: 'R', amount: -1 }, { face: 'U', amount: 2 }],
    [{ face: 'B', amount: -1 }, { face: 'L', amount: 2 }, { face: 'D', amount: 1 }, { face: 'F', amount: 1 }],
    [{ face: 'U', amount: 1 }, { face: 'R', amount: 1 }, { face: 'U', amount: -1 }, { face: 'R', amount: -1 }],
  ]
  for (const seq of sequences) {
    const label = seq.map((m) => `${m.face}${m.amount === 2 ? '2' : m.amount === -1 ? "'" : ''}`).join(' ')
    it(`round-trips state and facelets for ${label}`, () => {
      let s = solvedState()
      for (const m of seq) s = applyMove(s, m)
      expect(statesEqual(fromFacelets(toFacelets(s)), s)).toBe(true)
      const f = toFacelets(s)
      expect(toFacelets(fromFacelets(f))).toEqual(f)
    })
  }
})