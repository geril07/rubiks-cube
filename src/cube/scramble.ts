import type { Move } from './moves.ts'

const FACES: Move['face'][] = ['U', 'D', 'L', 'R', 'F', 'B']
const AMOUNTS: Move['amount'][] = [1, 2, -1]
const SCRAMBLE_LENGTH = 20

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function defaultSeed(): number {
  return (Math.random() * 4294967296) >>> 0
}

export function generateScramble(seed?: number): Move[] {
  const rand = mulberry32(seed ?? defaultSeed())
  const moves: Move[] = []
  let lastFace: Move['face'] | null = null
  for (let i = 0; i < SCRAMBLE_LENGTH; i++) {
    let face: Move['face']
    do {
      face = FACES[Math.floor(rand() * FACES.length)]
    } while (face === lastFace)
    const amount = AMOUNTS[Math.floor(rand() * AMOUNTS.length)]
    moves.push({ face, amount })
    lastFace = face
  }
  return moves
}