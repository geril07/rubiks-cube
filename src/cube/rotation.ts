import { Quaternion, Vector3 } from 'three'

// Quaternion mapping one orthonormal frame (column vectors) onto another.
// Single source of truth for deriving a rotation from how basis vectors are
// permuted — used by both moves.ts (turn quaternion from the grid rotation)
// and facelet.ts (cubie orientation from its sticker map), so position and
// orientation can never drift apart.
export function quaternionBetweenFrames(home: Vector3[], observed: Vector3[]): Quaternion {
  if (home.length !== 3 || observed.length !== 3) {
    throw new Error('quaternionBetweenFrames: needs two 3-vector frames')
  }
  const m = matrixMappingHomeToObserved(home, observed)
  return quaternionFromRotationMatrix(m)
}

function matrixMappingHomeToObserved(home: Vector3[], observed: Vector3[]): number[] {
  // m = Σ_i observed_i * home_iᵀ (valid because `home` is orthonormal).
  const m = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  for (let i = 0; i < 3; i++) {
    const h = home[i], o = observed[i]
    m[0] += o.x * h.x; m[1] += o.x * h.y; m[2] += o.x * h.z
    m[3] += o.y * h.x; m[4] += o.y * h.y; m[5] += o.y * h.z
    m[6] += o.z * h.x; m[7] += o.z * h.y; m[8] += o.z * h.z
  }
  return m
}

function quaternionFromRotationMatrix(m: number[]): Quaternion {
  const m00 = m[0], m01 = m[1], m02 = m[2]
  const m10 = m[3], m11 = m[4], m12 = m[5]
  const m20 = m[6], m21 = m[7], m22 = m[8]
  const trace = m00 + m11 + m22
  let qw: number, qx: number, qy: number, qz: number
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2
    qw = 0.25 * s
    qx = (m21 - m12) / s
    qy = (m02 - m20) / s
    qz = (m10 - m01) / s
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2
    qw = (m21 - m12) / s
    qx = 0.25 * s
    qy = (m01 + m10) / s
    qz = (m02 + m20) / s
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2
    qw = (m02 - m20) / s
    qx = (m01 + m10) / s
    qy = 0.25 * s
    qz = (m12 + m21) / s
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2
    qw = (m10 - m01) / s
    qx = (m02 + m20) / s
    qy = (m12 + m21) / s
    qz = 0.25 * s
  }
  return new Quaternion(qx, qy, qz, qw).normalize()
}