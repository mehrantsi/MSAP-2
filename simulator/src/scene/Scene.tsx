import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { activeModules } from '../core/design'
import { storageKey } from '../machines'
import { useSim, ViewMode } from '../state/store'
import { Board } from './Board'
import { viewApi } from './viewApi'
import { Wires } from './Wires'

const CAMERA_TARGETS: Record<ViewMode, THREE.Vector3> = {
  '3d': new THREE.Vector3(0, 12.6, 13.4),
  '2d': new THREE.Vector3(0, 18.5, 0.001),
}

interface SavedCamera {
  position: [number, number, number]
  target: [number, number, number]
}

const CAMERA_STORE = storageKey('msap1-camera')

function loadCameras(): Partial<Record<ViewMode, SavedCamera>> {
  try {
    const raw = localStorage.getItem(CAMERA_STORE)
    if (raw) return JSON.parse(raw)
  } catch {
    /* fresh view */
  }
  return {}
}

function storeCameras(cams: Partial<Record<ViewMode, SavedCamera>>): void {
  try {
    localStorage.setItem(CAMERA_STORE, JSON.stringify(cams))
  } catch {
    /* full or private */
  }
}

type Orbit = { target: THREE.Vector3; update: () => void; addEventListener: (e: string, fn: () => void) => void; removeEventListener: (e: string, fn: () => void) => void }

function CameraRig({ view }: { view: ViewMode }) {
  const { camera, controls } = useThree()
  const animating = useRef(true)
  const lastView = useRef(view)
  const restored = useRef(false)
  const dragMode = useSim((s) => s.dragMode)

  const applySaved = (saved: SavedCamera) => {
    const orbit = controls as unknown as Orbit | null
    camera.position.set(...saved.position)
    camera.up.set(0, view === '2d' ? 0 : 1, view === '2d' ? -1 : 0)
    if (orbit) {
      orbit.target.set(...saved.target)
      orbit.update()
    } else {
      camera.lookAt(...saved.target)
    }
    animating.current = false
  }

  useEffect(() => {
    if (restored.current) return
    const orbit = controls as unknown as Orbit | null
    if (!orbit) return
    restored.current = true
    const saved = loadCameras()[view]
    if (saved) applySaved(saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls])

  useEffect(() => {
    if (lastView.current !== view) {
      lastView.current = view
      const saved = loadCameras()[view]
      if (saved) {
        applySaved(saved)
      } else {
        animating.current = true
      }
    }
    camera.up.set(0, view === '2d' ? 0 : 1, view === '2d' ? -1 : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, camera])

  const saveRef = useRef<() => void>(() => {})

  useEffect(() => {
    const orbit = controls as unknown as Orbit | null
    if (!orbit) return
    const save = () => {
      if (animating.current) return
      const cams = loadCameras()
      cams[view] = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [orbit.target.x, orbit.target.y, orbit.target.z],
      }
      storeCameras(cams)
    }
    saveRef.current = save
    orbit.addEventListener('end', save)
    return () => orbit.removeEventListener('end', save)
  }, [controls, camera, view])

  useEffect(() => {
    const orbit = controls as unknown as { mouseButtons?: { LEFT: number }; touches?: { ONE: number } } | null
    if (!orbit?.mouseButtons) return
    const rotate = dragMode === 'orbit' && view === '3d'
    orbit.mouseButtons.LEFT = rotate ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN
    if (orbit.touches) orbit.touches.ONE = rotate ? THREE.TOUCH.ROTATE : THREE.TOUCH.PAN
  }, [dragMode, view, controls])

  const zoomGoal = useRef<number | null>(null)

  useEffect(() => {
    viewApi.zoom = (factor) => {
      const orbit = controls as unknown as { target: THREE.Vector3 } | null
      const target = orbit?.target ?? new THREE.Vector3()
      const current = zoomGoal.current ?? camera.position.distanceTo(target)
      zoomGoal.current = Math.min(38, Math.max(2.5, current * factor))
    }
    viewApi.reset = () => {
      const orbit = controls as unknown as { target: THREE.Vector3; update: () => void } | null
      orbit?.target.set(0, 0, 0)
      camera.up.set(0, view === '2d' ? 0 : 1, view === '2d' ? -1 : 0)
      zoomGoal.current = null
      animating.current = true
      orbit?.update()
      const cams = loadCameras()
      delete cams[view]
      storeCameras(cams)
    }
  }, [camera, controls, view])

  useFrame((_, dt) => {
    if (animating.current) {
      const target = CAMERA_TARGETS[view]
      camera.position.lerp(target, 1 - Math.pow(0.0005, dt))
      camera.lookAt(0, 0, 0)
      if (camera.position.distanceTo(target) < 0.02) animating.current = false
      return
    }
    if (zoomGoal.current !== null) {
      const orbit = controls as unknown as { target: THREE.Vector3; update: () => void } | null
      const target = orbit?.target ?? new THREE.Vector3()
      const direction = camera.position.clone().sub(target)
      const distance = direction.length()
      const next = THREE.MathUtils.damp(distance, zoomGoal.current, 7, dt)
      camera.position.copy(target.clone().add(direction.multiplyScalar(next / distance)))
      orbit?.update()
      if (Math.abs(next - zoomGoal.current) < 0.02) {
        zoomGoal.current = null
        saveRef.current()
      }
    }
  })
  return null
}

export function Scene() {
  const view = useSim((s) => s.view)
  const designVersion = useSim((s) => s.designVersion)
  const modules = useMemo(() => activeModules(), [designVersion])
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 7.4, 8.6], fov: 40, near: 0.1, far: 60 }}
      gl={{ antialias: true }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <color attach="background" args={['#0b0d10']} />
      <fog attach="fog" args={['#0b0d10', 20, 44]} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#8fa3c4', '#12100c', 0.5]} />
      <directionalLight position={[5, 9, 4]} intensity={1.4} color="#dfe8ff" />
      <directionalLight position={[-6, 5, -4]} intensity={0.45} color="#7f9dff" />

      <mesh position={[0, -0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0d0f12" roughness={1} />
      </mesh>

      {modules.map((mod) => (
        <Board key={mod.id} module={mod} />
      ))}
      <Wires />

      <CameraRig view={view} />
      <OrbitControls
        makeDefault
        enableRotate={view === '3d'}
        enablePan
        minDistance={2.5}
        maxDistance={38}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0, 0]}
      />
      <EffectComposer>
        <Bloom mipmapBlur intensity={1.05} luminanceThreshold={1} luminanceSmoothing={0.2} />
      </EffectComposer>
    </Canvas>
  )
}
