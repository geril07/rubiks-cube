import {
  BoxGeometry,
  Color,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three'
import type { Grid3 } from '../cube/model.ts'

export const BOY_COLORS: Record<string, Color> = {
  '+X': new Color(0xb71c1c),
  '-X': new Color(0xff8800),
  '+Y': new Color(0xffffff),
  '-Y': new Color(0xffd400),
  '+Z': new Color(0x1b8a3a),
  '-Z': new Color(0x1155cc),
}

const CUBIE_SIZE = 0.95
const STICKER_SIZE = 0.84
const STICKER_OFFSET = CUBIE_SIZE / 2 + 0.005

const bodyGeo = new BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE)
const bodyMat = new MeshStandardMaterial({
  color: 0x111111,
  roughness: 0.6,
  metalness: 0.0,
})

const stickerGeo = new PlaneGeometry(STICKER_SIZE, STICKER_SIZE)

function makeSticker(axis: 'x' | 'y' | 'z', sign: 1 | -1): Mesh {
  const key = (sign > 0 ? '+' : '-') + axis.toUpperCase()
  const mat = new MeshStandardMaterial({
    color: BOY_COLORS[key].clone(),
    roughness: 0.4,
    metalness: 0.0,
  })
  const mesh = new Mesh(stickerGeo, mat)
  switch (axis) {
    case 'x':
      mesh.position.x = sign * STICKER_OFFSET
      mesh.rotation.y = sign > 0 ? Math.PI / 2 : -Math.PI / 2
      break
    case 'y':
      mesh.position.y = sign * STICKER_OFFSET
      mesh.rotation.x = sign > 0 ? -Math.PI / 2 : Math.PI / 2
      break
    case 'z':
      mesh.position.z = sign * STICKER_OFFSET
      mesh.rotation.y = sign > 0 ? 0 : Math.PI
      break
  }
  return mesh
}

export function makeCubieMesh(g: Grid3): Mesh {
  const cubie = new Mesh(bodyGeo, bodyMat)
  cubie.position.set(g.x, g.y, g.z)

  if (g.x === 1) cubie.add(makeSticker('x', 1))
  if (g.x === -1) cubie.add(makeSticker('x', -1))
  if (g.y === 1) cubie.add(makeSticker('y', 1))
  if (g.y === -1) cubie.add(makeSticker('y', -1))
  if (g.z === 1) cubie.add(makeSticker('z', 1))
  if (g.z === -1) cubie.add(makeSticker('z', -1))

  return cubie
}

export interface GridKey {
  x: -1 | 0 | 1
  y: -1 | 0 | 1
  z: -1 | 0 | 1
}

export function gridKey(x: number, y: number, z: number): GridKey {
  return {
    x: x as GridKey['x'],
    y: y as GridKey['y'],
    z: z as GridKey['z'],
  }
}