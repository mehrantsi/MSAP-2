import { currentMachine, storageKey } from '../machines'
import { ChipDef, ConnectionDef, ModuleDef, PassiveDef, PassiveKind } from './modules'
import { PARTS } from './parts'

function applySwap(replacements: Record<string, string>, chip: ChipDef): ChipDef {
  const to = replacements[chip.ref]
  if (!to || to === chip.part || !PARTS[to]) return chip
  const compatible = PARTS[chip.part]?.pins === PARTS[to].pins
  return {
    ref: chip.ref,
    part: to,
    pins: compatible ? chip.pins : undefined,
    signals: compatible ? chip.signals : undefined,
  }
}

function applyPinNets(pinNets: Record<string, Record<string, string>>, chip: ChipDef): ChipDef {
  const nets = pinNets[chip.ref]
  if (!nets || Object.keys(nets).length === 0) return chip
  return { ...chip, pins: { ...chip.pins, ...nets } }
}

function applyValueOverride(overrides: Record<string, string>, moduleId: string, passive: PassiveDef): PassiveDef {
  const value = overrides[`${moduleId}:${passive.ref}`]
  return value === undefined ? passive : { ...passive, value }
}

export interface CustomBoard {
  id: string
  name: string
  column: 'left' | 'right'
}

export interface CustomDesign {
  boards: CustomBoard[]
  chips: Record<string, { ref: string; part: string }[]>
  passives: Record<string, { ref: string; kind: PassiveKind; value: string }[]>
  connections: ConnectionDef[]
  replacements: Record<string, string>
  passiveOverrides: Record<string, string>
  pinNets: Record<string, Record<string, string>>
  removedWires: string[]
  schematicPos: Record<string, { x: number; y: number }>
}

export const EMPTY_DESIGN: CustomDesign = {
  boards: [],
  chips: {},
  passives: {},
  connections: [],
  replacements: {},
  passiveOverrides: {},
  pinNets: {},
  removedWires: [],
  schematicPos: {},
}

export function wireKey(conn: ConnectionDef): string {
  return `${conn.from}|${conn.to}|${conn.kind}`
}

export function freshDesign(): CustomDesign {
  return structuredClone(EMPTY_DESIGN)
}

export function loadDesign(): CustomDesign {
  try {
    const raw = localStorage.getItem(storageKey('msap1-design'))
    if (raw) return { ...EMPTY_DESIGN, ...JSON.parse(raw) }
  } catch {
    /* fresh */
  }
  return freshDesign()
}

export function activeSchematicPos(): Record<string, { x: number; y: number }> {
  return active.schematicPos ?? {}
}

export function persistDesign(design: CustomDesign): void {
  try {
    localStorage.setItem(storageKey('msap1-design'), JSON.stringify(design))
  } catch {
    /* private mode */
  }
}

let active: CustomDesign = EMPTY_DESIGN
let mergedCache: ModuleDef[] | null = null
let connectionsCache: ConnectionDef[] | null = null

export function setActiveDesign(design: CustomDesign): void {
  active = design
  mergedCache = null
  connectionsCache = null
}

function boardSize(chips: ChipDef[], passives: PassiveDef[]): [number, number] {
  const chipRows = Math.ceil(chips.length / 4)
  const passiveRows = Math.ceil(passives.length / 8)
  const depth = Math.max(1.2, 0.75 + chipRows * 0.42 + passiveRows * 0.24)
  return [2.7, depth]
}

export function activeModules(): ModuleDef[] {
  if (mergedCache) return mergedCache

  const replacements = active.replacements ?? {}
  const overrides = active.passiveOverrides ?? {}
  const pinNets = active.pinNets ?? {}
  const modules: ModuleDef[] = currentMachine().modules.map((mod) => ({
    ...mod,
    chips: [...mod.chips, ...(active.chips[mod.id] ?? [])].map((chip) =>
      applyPinNets(pinNets, applySwap(replacements, chip)),
    ),
    passives: [...mod.passives, ...(active.passives[mod.id] ?? [])].map((passive) =>
      applyValueOverride(overrides, mod.id, passive),
    ),
  }))

  const columnEdge = { left: 0, right: 0 }
  for (const mod of modules) {
    if (mod.id === 'bus') continue
    const edge = mod.position[1] + mod.size[1] / 2
    if (mod.position[0] < 0) columnEdge.left = Math.max(columnEdge.left, edge)
    else columnEdge.right = Math.max(columnEdge.right, edge)
  }

  for (const board of active.boards) {
    const chips = (active.chips[board.id] ?? []).map((chip) => applyPinNets(pinNets, applySwap(replacements, chip)))
    const passives = (active.passives[board.id] ?? []).map((passive) =>
      applyValueOverride(overrides, board.id, passive),
    )
    const size = boardSize(chips, passives)
    const x = board.column === 'left' ? -3.2 : 3.2
    const z = columnEdge[board.column] + 0.35 + size[1] / 2
    columnEdge[board.column] = z + size[1] / 2
    modules.push({
      id: board.id,
      name: board.name.toUpperCase(),
      position: [x, z],
      size,
      chips,
      passives,
      leds: [],
      description: 'Custom board (added in the designer)',
    })
  }

  mergedCache = modules
  return modules
}

export function activeConnections(): ConnectionDef[] {
  if (connectionsCache) return connectionsCache
  const removed = new Set(active.removedWires ?? [])
  connectionsCache = [
    ...currentMachine().connections.filter((conn) => !removed.has(wireKey(conn))),
    ...active.connections,
  ]
  return connectionsCache
}

export function activeFindChip(ref: string): { module: ModuleDef; chip: ChipDef } | undefined {
  for (const module of activeModules()) {
    const chip = module.chips.find((c) => c.ref === ref)
    if (chip) return { module, chip }
  }
  return undefined
}

export function nextChipRef(): string {
  let max = 99
  for (const list of Object.values(active.chips)) {
    for (const chip of list) {
      const n = Number(chip.ref.replace(/^[A-Za-z]+/, ''))
      if (!Number.isNaN(n)) max = Math.max(max, n)
    }
  }
  return `U${max + 1}`
}

export function nextPassiveRef(kind: PassiveKind): string {
  const prefix = { res: 'R', cap: 'C', rnet: 'RN', pot: 'RV', led: 'D', switch: 'SW', ledbar: 'LB' }[kind]
  let max = 99
  for (const list of Object.values(active.passives)) {
    for (const passive of list) {
      if (!passive.ref.startsWith(prefix)) continue
      const n = Number(passive.ref.slice(prefix.length))
      if (!Number.isNaN(n)) max = Math.max(max, n)
    }
  }
  return `${prefix}${max + 1}`
}

export function nextBoardId(): string {
  let n = 1
  while (activeModules().some((m) => m.id === `custom${n}`)) n++
  return `custom${n}`
}

export function partCatalog(): string[] {
  return Object.keys(PARTS)
}

export function activePinNets(): Record<string, Record<string, string>> {
  return active.pinNets ?? {}
}

export type PinNetSource = 'custom' | 'declared' | 'power' | 'signal'

function normalizeNet(label: string): string {
  return label
    .toUpperCase()
    .replace(/[^A-Z0-9~]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function pinNetOf(chip: ChipDef, pin: string): { net: string; source: PinNetSource } | null {
  const overridden = (active.pinNets ?? {})[chip.ref]?.[pin] !== undefined
  const declared = chip.pins?.[pin]
  if (declared) return { net: declared, source: overridden ? 'custom' : 'declared' }
  const part = PARTS[chip.part]
  if (part?.vccPin === Number(pin)) return { net: 'VCC', source: 'power' }
  if (part?.gndPin === Number(pin)) return { net: 'GND', source: 'power' }
  const signal = chip.signals?.[pin]
  if (signal) return { net: normalizeNet(signal.label), source: 'signal' }
  return null
}

export function passiveNetMap(passive: PassiveDef): Record<string, { net: string; source: PinNetSource }> {
  const map: Record<string, { net: string; source: PinNetSource }> = {}
  for (const [pin, net] of Object.entries(passive.pins ?? {})) map[pin] = { net, source: 'declared' }
  for (const [pin, net] of Object.entries((active.pinNets ?? {})[passive.ref] ?? {})) map[pin] = { net, source: 'custom' }
  return map
}

export function chipNetMap(chip: ChipDef): Record<string, { net: string; source: PinNetSource }> {
  const part = PARTS[chip.part]
  const map: Record<string, { net: string; source: PinNetSource }> = {}
  const pins = part?.pins ?? 16
  for (let i = 1; i <= pins; i++) {
    const entry = pinNetOf(chip, String(i))
    if (entry) map[String(i)] = entry
  }
  return map
}

export function passivePinCount(kind: PassiveKind, value: string): number {
  if (kind === 'pot') return 3
  if (kind === 'ledbar') return 10
  if (kind === 'rnet') {
    const match = value.match(/x(\d+)/)
    return match ? Number(match[1]) + 1 : 10
  }
  return 2
}

export function knownNets(): string[] {
  const nets = new Set<string>(['VCC', 'GND', 'CLK', 'CLK_INV', 'RST', 'RST_L'])
  for (let i = 0; i < 8; i++) nets.add(`BUS${i}`)
  for (const module of activeModules()) {
    for (const chip of module.chips) {
      for (const entry of Object.values(chipNetMap(chip))) nets.add(entry.net)
    }
    for (const passive of module.passives) {
      for (const entry of Object.values(passiveNetMap(passive))) nets.add(entry.net)
    }
  }
  for (const pins of Object.values(active.pinNets ?? {})) {
    for (const net of Object.values(pins)) nets.add(net)
  }
  nets.delete('NC')
  return [...nets].sort()
}
