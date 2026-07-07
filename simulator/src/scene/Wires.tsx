import { useMemo } from 'react'
import * as THREE from 'three'
import { activeConnections, activeModules } from '../core/design'
import { ConnectionDef } from '../core/modules'
import { useSim } from '../state/store'

const KIND_COLORS: Record<ConnectionDef['kind'], string> = {
  bus: '#ffb000',
  ctl: '#4c8dff',
  clk: '#2fd4e0',
}

const WIRE_Y = 0.035
const BUS_EDGE = 0.5
const TRUNK_BAND: Record<'ctl' | 'clk', number> = { ctl: 1.42, clk: 1.02 }

function sideOf(x: number): number {
  return x < 0 ? -1 : 1
}

function moduleById(id: string) {
  return activeModules().find((m) => m.id === id)
}

function innerEdgeX(moduleId: string): number {
  const mod = moduleById(moduleId)!
  return mod.position[0] - sideOf(mod.position[0]) * (mod.size[0] / 2)
}

function wirePoints(conn: ConnectionDef, laneIndex: number): THREE.Vector3[] | null {
  const from = moduleById(conn.from)
  if (!from) return null
  const lane = laneIndex * 0.05
  const fromZ = from.position[1]

  if (conn.to === 'bus') {
    const bus = moduleById('bus')!
    const s = sideOf(from.position[0])
    const busEndZ = bus.position[1] + bus.size[1] / 2 - 0.25
    const busStartZ = bus.position[1] - bus.size[1] / 2 + 0.25
    const clampedZ = Math.min(busEndZ, Math.max(busStartZ, fromZ))
    if (Math.abs(clampedZ - fromZ) < 0.01) {
      return [
        new THREE.Vector3(innerEdgeX(conn.from), WIRE_Y, fromZ),
        new THREE.Vector3(s * BUS_EDGE, WIRE_Y, fromZ),
      ]
    }
    const approachX = s * (BUS_EDGE + 0.22 + lane)
    return [
      new THREE.Vector3(innerEdgeX(conn.from), WIRE_Y, fromZ),
      new THREE.Vector3(approachX, WIRE_Y, fromZ),
      new THREE.Vector3(approachX, WIRE_Y, clampedZ),
      new THREE.Vector3(s * BUS_EDGE, WIRE_Y, clampedZ),
    ]
  }

  const to = moduleById(conn.to)
  if (!to) return null
  const kind = conn.kind as 'ctl' | 'clk'
  const sFrom = sideOf(from.position[0])
  const sTo = sideOf(to.position[0])
  const startX = innerEdgeX(conn.from)
  const endX = innerEdgeX(conn.to)
  const toZ = to.position[1]

  if (sFrom === sTo) {
    const trunkX = sFrom * (TRUNK_BAND[kind] + lane)
    return [
      new THREE.Vector3(startX, WIRE_Y, fromZ),
      new THREE.Vector3(trunkX, WIRE_Y, fromZ),
      new THREE.Vector3(trunkX, WIRE_Y, toZ),
      new THREE.Vector3(endX, WIRE_Y, toZ),
    ]
  }

  const corridorZ = kind === 'clk' ? -(6.25 + lane) : 4.15 + lane
  const trunkFrom = sFrom * (TRUNK_BAND[kind] + lane)
  const trunkTo = sTo * (TRUNK_BAND[kind] + lane)
  return [
    new THREE.Vector3(startX, WIRE_Y, fromZ),
    new THREE.Vector3(trunkFrom, WIRE_Y, fromZ),
    new THREE.Vector3(trunkFrom, WIRE_Y, corridorZ),
    new THREE.Vector3(trunkTo, WIRE_Y, corridorZ),
    new THREE.Vector3(trunkTo, WIRE_Y, toZ),
    new THREE.Vector3(endX, WIRE_Y, toZ),
  ]
}

function roundedPolyline(points: THREE.Vector3[], radius = 0.14): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>()
  let prev = points[0].clone()
  for (let i = 1; i < points.length - 1; i++) {
    const corner = points[i]
    const next = points[i + 1]
    const inLen = corner.distanceTo(prev)
    const outLen = corner.distanceTo(next)
    const r = Math.min(radius, inLen * 0.45, outLen * 0.45)
    const dirIn = corner.clone().sub(prev).normalize()
    const dirOut = next.clone().sub(corner).normalize()
    const a = corner.clone().sub(dirIn.multiplyScalar(r))
    const b = corner.clone().add(dirOut.multiplyScalar(r))
    if (a.distanceTo(prev) > 1e-5) path.add(new THREE.LineCurve3(prev, a))
    path.add(new THREE.QuadraticBezierCurve3(a, corner.clone(), b))
    prev = b
  }
  const last = points[points.length - 1].clone()
  if (prev.distanceTo(last) > 1e-5) path.add(new THREE.LineCurve3(prev, last))
  return path
}

function Wire({ conn, laneIndex }: { conn: ConnectionDef; laneIndex: number }) {
  const controlWord = useSim((s) => s.snap.controlWord)
  const cycle = useSim((s) => s.snap.cycle)

  const geometry = useMemo(() => {
    const points = wirePoints(conn, laneIndex)
    if (!points) return null
    const path = roundedPolyline(points)
    const segments = Math.max(24, Math.round(path.getLength() * 10))
    return new THREE.TubeGeometry(path as unknown as THREE.Curve<THREE.Vector3>, segments, 0.014, 6, false)
  }, [conn, laneIndex])

  if (!geometry) return null

  const active =
    conn.kind === 'clk' ? (cycle & 1) === 1 : conn.activeMask !== undefined && (controlWord & conn.activeMask) !== 0
  const color = KIND_COLORS[conn.kind]

  return (
    <mesh geometry={geometry} raycast={() => null}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={active ? 0.95 : 0.34}
        emissive={color}
        emissiveIntensity={active ? 1.5 : 0.05}
        roughness={0.5}
      />
    </mesh>
  )
}

export function Wires() {
  const wires = useSim((s) => s.wires)
  const designVersion = useSim((s) => s.designVersion)
  const connections = useMemo(() => activeConnections(), [designVersion])
  const laneOf = useMemo(() => {
    const counters: Record<string, number> = { bus: 0, ctl: 0, clk: 0 }
    return connections.map((conn) => counters[conn.kind]++)
  }, [connections])

  return (
    <group>
      {connections.map((conn, i) =>
        wires[conn.kind] ? <Wire key={`${conn.from}-${conn.to}-${conn.kind}-${i}`} conn={conn} laneIndex={laneOf[i]} /> : null,
      )}
    </group>
  )
}
