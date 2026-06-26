import { OrthographicCamera } from 'three'
import {
  AmbientLight,
  Color,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export interface SceneContext {
  scene: Scene
  camera: PerspectiveCamera | OrthographicCamera
  renderer: WebGLRenderer
  controls: OrbitControls
  onResize: () => void
  dispose: () => void
}

export function createScene(canvasHost: HTMLElement): SceneContext {
  const scene = new Scene()
  scene.background = new Color(0x1a1a22)

  const camera = new PerspectiveCamera(
    45,
    canvasHost.clientWidth / canvasHost.clientHeight,
    0.1,
    100,
  )
  camera.position.set(5, 5, 7)
  camera.lookAt(0, 0, 0)

  const renderer = new WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(canvasHost.clientWidth, canvasHost.clientHeight)
  canvasHost.appendChild(renderer.domElement)
  renderer.domElement.style.display = 'block'

  const ambient = new AmbientLight(0xffffff, 0.85)
  scene.add(ambient)
  const dir = new DirectionalLight(0xffffff, 1.0)
  dir.position.set(6, 10, 8)
  scene.add(dir)
  const dir2 = new DirectionalLight(0xffffff, 0.35)
  dir2.position.set(-8, -4, -6)
  scene.add(dir2)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 4
  controls.maxDistance = 30

  const onResize = () => {
    const w = canvasHost.clientWidth
    const h = canvasHost.clientHeight
    camera.aspect = w / h
    ;(camera as PerspectiveCamera).updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener('resize', onResize)

  renderer.setAnimationLoop(() => {
    controls.update()
    renderer.render(scene, camera)
  })

  const dispose = () => {
    window.removeEventListener('resize', onResize)
    controls.dispose()
    renderer.dispose()
    if (renderer.domElement.parentElement === canvasHost) {
      canvasHost.removeChild(renderer.domElement)
    }
  }

  return { scene, camera, renderer, controls, onResize, dispose }
}