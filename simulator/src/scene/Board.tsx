import { ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { pinNetOf } from '../core/design'
import { ModuleDef } from '../core/modules'
import { PARTS } from '../core/parts'
import { powered, useSim } from '../state/store'
import { labelTexture } from './labels'
import { ChipPlacement, layoutModule, nearestPin, pinPoints } from './layout'
import { LedBar } from './LedBar'
import { Passive } from './Passive'
import { SevenSeg } from './SevenSeg'

const PROBE_COLORS = ['#ffd21f', '#2fd4e0', '#ff4fd8', '#59f07d']

function ChipLegs({ placements }: { placements: ChipPlacement[] }) {
  const geometry = useMemo(() => {
    const positions: THREE.Matrix4[] = []
    for (const placement of placements) {
      for (const point of pinPoints(placement)) {
        const m = new THREE.Matrix4()
        m.setPosition(point.x, 0.028, point.z)
        positions.push(m)
      }
    }
    return positions
  }, [placements])

  return (
    <instancedMesh
      args={[undefined, undefined, geometry.length]}
      ref={(mesh) => {
        if (!mesh) return
        geometry.forEach((m, i) => mesh.setMatrixAt(i, m))
        mesh.instanceMatrix.needsUpdate = true
      }}
    >
      <boxGeometry args={[0.02, 0.055, 0.03]} />
      <meshStandardMaterial color="#9aa2ad" metalness={0.75} roughness={0.35} />
    </instancedMesh>
  )
}

function Chip({ placement }: { placement: ChipPlacement }) {
  const selectChip = useSim((s) => s.selectChip)
  const selected = useSim((s) => s.selectedChip === placement.chip.ref)
  const armedChannel = useSim((s) => s.armedChannel)
  const setProbe = useSim((s) => s.setProbe)
  const setTooltip = useSim((s) => s.setTooltip)
  const setSchematicSel = useSim((s) => s.setSchematicSel)
  const setSelectedNet = useSim((s) => s.setSelectedNet)
  const [length, height, width] = placement.dims
  const part = PARTS[placement.chip.part]
  const chip = placement.chip

  const pinAt = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const local = e.point.clone()
    e.object.parent?.parent?.worldToLocal(local)
    return nearestPin(placement, local.x, local.z)
  }

  const describePin = (pin: string): string => {
    const signal = chip.signals?.[pin]
    if (signal) return signal.label
    if (part?.vccPin === Number(pin)) return 'VCC'
    if (part?.gndPin === Number(pin)) return 'GND'
    const net = chip.pins?.[pin]
    return net ?? 'no signal model'
  }

  return (
    <group position={[placement.x, 0.045, placement.z]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          if (armedChannel !== null) {
            const pin = pinAt(e)
            if (pin) setProbe(armedChannel, { chipRef: chip.ref, pin: pin.pin })
            return
          }
          selectChip(chip.ref)
          const pin = pinAt(e)
          if (pin) {
            setSchematicSel({ ref: chip.ref, pin: pin.pin })
            const net = pinNetOf(chip, pin.pin)?.net
            setSelectedNet(net && net !== 'NC' ? net : null)
          }
        }}
        onPointerMove={(e) => {
          e.stopPropagation()
          const pin = pinAt(e)
          const pinText = pin ? `  pin ${pin.pin}: ${describePin(pin.pin)}` : ''
          setTooltip({
            text: `${chip.ref} ${part?.value ?? chip.part}${pinText}`,
            x: e.nativeEvent.clientX,
            y: e.nativeEvent.clientY,
          })
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setTooltip(null)
          document.body.style.cursor = 'auto'
        }}
      >
        <boxGeometry args={[length + 0.06, height, width + 0.1]} />
        <meshStandardMaterial visible={false} />
      </mesh>
      <mesh raycast={() => null}>
        <boxGeometry args={[length, height, width]} />
        <meshStandardMaterial
          color={selected ? '#2a3140' : '#16181c'}
          emissive={selected ? '#4c8dff' : '#000000'}
          emissiveIntensity={selected ? 0.35 : 0}
          roughness={0.6}
        />
      </mesh>
      <mesh position={[0, height / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[Math.max(length * 0.95, 0.26), 0.08]} />
        <meshBasicMaterial map={labelTexture(placement.chip.ref, part?.value ?? placement.chip.part, '#98a3b1')} transparent opacity={0.95} />
      </mesh>
    </group>
  )
}

function ProbeMarkers({ module }: { module: ModuleDef }) {
  const probes = useSim((s) => s.probes)
  const layout = layoutModule(module)
  const markers: { x: number; z: number; color: string }[] = []
  probes.forEach((probe, channel) => {
    if (!probe) return
    const placement = layout.chips.find((c) => c.chip.ref === probe.chipRef)
    if (!placement) return
    const point = pinPoints(placement).find((p) => p.pin === probe.pin)
    if (!point) return
    markers.push({ x: point.x, z: point.z, color: PROBE_COLORS[channel] })
  })
  return (
    <>
      {markers.map((marker, i) => (
        <group key={i} position={[marker.x, 0.14, marker.z]}>
          <mesh>
            <coneGeometry args={[0.035, 0.12, 8]} />
            <meshStandardMaterial color={marker.color} emissive={marker.color} emissiveIntensity={1.4} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function ChipRow({ module }: { module: ModuleDef }) {
  const layout = layoutModule(module)
  return (
    <>
      <ChipLegs placements={layout.chips} />
      {layout.chips.map((placement) => (
        <Chip key={placement.chip.ref} placement={placement} />
      ))}
      {layout.passives.map((p) => (
        <Passive key={p.passive.ref} passive={p.passive} position={[p.x, 0, p.z]} moduleId={module.id} />
      ))}
      <ProbeMarkers module={module} />
    </>
  )
}

export function Board({ module }: { module: ModuleDef }) {
  const snap = useSim((s) => s.snap)
  const signed = useSim((s) => s.signed)
  const psu = useSim((s) => s.psu)
  const [w, d] = module.size
  const isBus = module.id === 'bus'
  const isOn = powered(psu)
  const brightness = isOn ? Math.min(1.2, Math.max(0.25, (psu.vcc - 2) / 2.6)) : 0

  return (
    <group position={[module.position[0], 0, module.position[1]]}>
      <mesh position={[0, -0.045, 0]}>
        <boxGeometry args={[w, 0.09, d]} />
        <meshStandardMaterial color={isBus ? '#11141a' : '#15201a'} roughness={0.85} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.002, -d / 2 + 0.13]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[Math.min(w * 0.9, 2.3), 0.16]} />
        <meshBasicMaterial map={labelTexture(module.name, '', '#c3cdd8')} transparent opacity={0.95} />
      </mesh>

      <ChipRow module={module} />

      {module.leds.map((bar, i) => (
        <group key={bar.label} position={[0, 0, isBus ? 0 : d / 2 - 0.2 - i * 0.18]} rotation={isBus ? [0, Math.PI / 2, 0] : undefined}>
          <LedBar
            count={bar.count}
            value={isOn ? bar.value(snap) & ((1 << bar.count) - 1) : 0}
            color={bar.color}
            brightness={brightness}
            spacing={isBus ? 0.12 : bar.count > 10 ? 0.075 : 0.085}
          />
        </group>
      ))}

      {module.sevenSeg && (
        <group position={[0, 0.05, d / 2 - 0.5]}>
          <SevenSeg value={isOn ? snap.out : 0} blank={!isOn} signed={signed} brightness={brightness} />
        </group>
      )}
    </group>
  )
}
