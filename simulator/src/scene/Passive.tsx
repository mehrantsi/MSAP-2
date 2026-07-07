import { ThreeEvent } from '@react-three/fiber'
import { PassiveDef } from '../core/modules'
import { useSim } from '../state/store'

const DESCRIPTIONS: Record<PassiveDef['kind'], string> = {
  res: 'resistor',
  cap: 'capacitor',
  rnet: 'resistor network',
  pot: 'potentiometer',
  led: 'LED',
  switch: 'switch',
  ledbar: '10-LED bar',
}

function SwitchLever({ moduleId, refName }: { moduleId: string; refName: string }) {
  const running = useSim((s) => s.running)
  const signed = useSim((s) => s.signed)
  const overrides = useSim((s) => s.design.passiveOverrides)

  let on = overrides?.[`${moduleId}:${refName}#state`] === 'on'
  if (moduleId === 'clock' && refName === 'SW2') on = running
  if (moduleId === 'output' && refName === 'SW3') on = signed
  if (moduleId === 'clock' && refName === 'SW1') on = false

  return (
    <mesh position={[on ? -0.03 : 0.03, 0.09, 0]} rotation={[0, 0, on ? 0.35 : -0.35]}>
      <cylinderGeometry args={[0.014, 0.014, 0.07, 8]} />
      <meshStandardMaterial color="#b8bec8" metalness={0.6} roughness={0.3} />
    </mesh>
  )
}

export function Passive({
  passive,
  position,
  moduleId,
}: {
  passive: PassiveDef
  position: [number, number, number]
  moduleId: string
}) {
  const setTooltip = useSim((s) => s.setTooltip)
  const selectPassive = useSim((s) => s.selectPassive)

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
    setTooltip({
      text: `${passive.ref}  ${passive.value}  (${DESCRIPTIONS[passive.kind]})`,
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
    })
  }
  const out = () => {
    document.body.style.cursor = 'auto'
    setTooltip(null)
  }
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    selectPassive({ moduleId, ref: passive.ref })
  }

  switch (passive.kind) {
    case 'res':
      return (
        <group position={position}>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.03, 0]} onPointerOver={over} onPointerOut={out} onClick={click}>
            <cylinderGeometry args={[0.024, 0.024, 0.13, 10]} />
            <meshStandardMaterial color="#c9a86b" roughness={0.6} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.03, 10]} />
            <meshStandardMaterial color="#7a4a2b" roughness={0.6} />
          </mesh>
        </group>
      )
    case 'cap':
      return (
        <mesh position={[position[0], position[1] + 0.045, position[2]]} onPointerOver={over} onPointerOut={out} onClick={click}>
          <cylinderGeometry args={[0.036, 0.036, 0.075, 12]} />
          <meshStandardMaterial color="#d98a3d" roughness={0.55} />
        </mesh>
      )
    case 'rnet':
      return (
        <group position={position}>
          <mesh position={[0, 0.055, 0]} onPointerOver={over} onPointerOut={out} onClick={click}>
            <boxGeometry args={[0.46, 0.1, 0.07]} />
            <meshStandardMaterial color="#1c1c1e" roughness={0.6} />
          </mesh>
          <mesh position={[-0.2, 0.06, 0.036]}>
            <boxGeometry args={[0.02, 0.02, 0.004]} />
            <meshStandardMaterial color="#e8e8e8" />
          </mesh>
        </group>
      )
    case 'pot':
      return (
        <group position={position}>
          <mesh position={[0, 0.045, 0]} onPointerOver={over} onPointerOut={out} onClick={click}>
            <boxGeometry args={[0.17, 0.09, 0.17]} />
            <meshStandardMaterial color="#2f5aa8" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.04, 12]} />
            <meshStandardMaterial color="#e8e4d8" roughness={0.4} />
          </mesh>
        </group>
      )
    case 'led':
      return (
        <mesh position={[position[0], position[1] + 0.04, position[2]]} onPointerOver={over} onPointerOut={out} onClick={click}>
          <cylinderGeometry args={[0.03, 0.03, 0.06, 10]} />
          <meshStandardMaterial
            color={passive.color ?? '#ff453a'}
            emissive={passive.color ?? '#ff453a'}
            emissiveIntensity={0.25}
            roughness={0.35}
          />
        </mesh>
      )
    case 'switch': {
      return (
        <group position={position}>
          <mesh position={[0, 0.04, 0]} onPointerOver={over} onPointerOut={out} onClick={click}>
            <boxGeometry args={[0.18, 0.07, 0.11]} />
            <meshStandardMaterial color="#23262c" roughness={0.55} />
          </mesh>
          <SwitchLever moduleId={moduleId} refName={passive.ref} />
        </group>
      )
    }
    case 'ledbar':
      return (
        <group position={position}>
          <mesh position={[0, 0.045, 0]} onPointerOver={over} onPointerOut={out} onClick={click}>
            <boxGeometry args={[0.78, 0.07, 0.12]} />
            <meshStandardMaterial color="#1a0d0c" roughness={0.5} />
          </mesh>
          {Array.from({ length: 10 }, (_, i) => (
            <mesh key={i} position={[(i - 4.5) * 0.072, 0.085, 0]} raycast={() => null}>
              <boxGeometry args={[0.05, 0.02, 0.09]} />
              <meshStandardMaterial
                color={passive.color ?? '#ff453a'}
                emissive={passive.color ?? '#ff453a'}
                emissiveIntensity={0.15}
                roughness={0.4}
              />
            </mesh>
          ))}
        </group>
      )
  }
}
