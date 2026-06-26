import type { Amount, Move } from './moves.ts'

export function printMove(move: Move): string {
  const suffix: Record<Amount, string> = { 1: '', 2: '2', '-1': "'" }
  return `${move.face}${suffix[move.amount]}`
}

const FACE_RE = '[UDLRFB]'
const MOVE_RE = new RegExp(`^(${FACE_RE})(2|')?$`)

export function parseMove(s: string): Move | null {
  const m = MOVE_RE.exec(s.trim())
  if (!m) return null
  const face = m[1] as Move['face']
  const suffix = m[2]
  let amount: Amount = 1
  if (suffix === '2') amount = 2
  else if (suffix === "'") amount = -1
  return { face, amount }
}