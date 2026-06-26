import { describe, expect, it } from 'vitest'
import { Quaternion } from 'three'
import { ALL_SLOTS, gridToSlot, slotToGrid, solvedState } from '../../src/cube/model.ts'

describe('solvedState', () => {
  it('returns a Cube State with 8 corners and 12 edges, each at its Home slot with identity orientation', () => {
    const state = solvedState()

    expect(state.corners).toHaveLength(8)
    expect(state.edges).toHaveLength(12)

    const identity = new Quaternion()
    for (const c of state.corners) {
      expect(c.id).toBe(c.slot)
      expect(c.quat.equals(identity)).toBe(true)
    }
    for (const e of state.edges) {
      expect(e.id).toBe(e.slot)
      expect(e.quat.equals(identity)).toBe(true)
    }
  })
})

describe('slotToGrid / gridToSlot', () => {
  it('round-trips every slot to its grid coordinate and back', () => {
    for (const slot of ALL_SLOTS) {
      expect(gridToSlot(slotToGrid(slot))).toBe(slot)
    }
  })
})