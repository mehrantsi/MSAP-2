import { ChipDef, ModuleDef, PassiveDef } from '../core/modules'
import { PARTS } from '../core/parts'

export interface ChipPlacement {
  chip: ChipDef
  x: number
  z: number
  dims: [number, number, number]
}

export interface PassivePlacement {
  passive: PassiveDef
  x: number
  z: number
}

export interface ModuleLayout {
  chips: ChipPlacement[]
  passives: PassivePlacement[]
}

export function chipDimensions(partName: string): [number, number, number] {
  const part = PARTS[partName]
  if (!part) return [0.3, 0.09, 0.16]
  if (part.package === 'TO-92') return [0.12, 0.11, 0.07]
  if (part.package === 'TO-220') return [0.17, 0.15, 0.09]
  const length = (part.pins / 2) * 0.048 + 0.05
  const width = part.package.endsWith('W') ? 0.26 : 0.15
  return [length, 0.08, width]
}

export function passiveFootprint(kind: PassiveDef['kind']): [number, number] {
  switch (kind) {
    case 'res':
      return [0.17, 0.08]
    case 'cap':
      return [0.09, 0.09]
    case 'rnet':
      return [0.42, 0.09]
    case 'pot':
      return [0.17, 0.17]
    case 'led':
      return [0.08, 0.08]
    case 'switch':
      return [0.17, 0.11]
    case 'ledbar':
      return [0.82, 0.14]
  }
}

const layoutCache = new Map<string, ModuleLayout>()

export function layoutModule(mod: ModuleDef): ModuleLayout {
  const cacheKey = `${mod.id}:${mod.chips.length}:${mod.passives.length}`
  const cached = layoutCache.get(cacheKey)
  if (cached) return cached

  const [w, d] = mod.size
  const usableW = w - 0.3
  const reservedBottom = mod.leds.length * 0.18 + (mod.sevenSeg ? 0.62 : 0) + 0.16
  const topZ = -d / 2 + 0.32

  const chips: ChipPlacement[] = []
  const passives: PassivePlacement[] = []

  const visiblePassives = mod.passives.filter((p) => !p.hidden3d)

  let cursorX = -usableW / 2
  let cursorZ = topZ
  let rowDepth = 0

  const place = (itemW: number, itemD: number, gap: number): { x: number; z: number } => {
    if (cursorX + itemW > usableW / 2 + 0.001) {
      cursorX = -usableW / 2
      cursorZ += rowDepth + 0.07
      rowDepth = 0
    }
    const x = cursorX + itemW / 2
    const z = cursorZ + itemD / 2
    cursorX += itemW + gap
    rowDepth = Math.max(rowDepth, itemD)
    return { x, z }
  }

  for (const chip of mod.chips) {
    const dims = chipDimensions(chip.part)
    const { x, z } = place(dims[0] + 0.08, dims[2] + 0.08, 0.07)
    chips.push({ chip, x, z, dims })
  }

  if (visiblePassives.length > 0) {
    cursorX = -usableW / 2
    cursorZ += rowDepth + 0.08
    rowDepth = 0
    for (const passive of visiblePassives) {
      const [fw, fd] = passiveFootprint(passive.kind)
      const { x, z } = place(fw + 0.05, fd, 0.04)
      passives.push({ passive, x, z })
    }
  }

  const contentBottom = cursorZ + rowDepth
  const limit = d / 2 - reservedBottom
  if (contentBottom > limit) {
    const scale = (limit - topZ) / (contentBottom - topZ)
    for (const c of chips) c.z = topZ + (c.z - topZ) * scale
    for (const p of passives) p.z = topZ + (p.z - topZ) * scale
  }

  const layout = { chips, passives }
  layoutCache.set(cacheKey, layout)
  return layout
}

export interface PinPoint {
  pin: string
  x: number
  z: number
  side: number
}

export function pinPoints(placement: ChipPlacement): PinPoint[] {
  const part = PARTS[placement.chip.part]
  const [length, , width] = placement.dims
  const points: PinPoint[] = []
  if (!part) return points
  if (part.package === 'TO-92' || part.package === 'TO-220') {
    for (let i = 0; i < 3; i++) {
      points.push({ pin: String(i + 1), x: placement.x + (i - 1) * 0.05, z: placement.z + width / 2 + 0.035, side: 1 })
    }
    return points
  }
  const perSide = part.pins / 2
  const span = length - 0.1
  for (let i = 0; i < perSide; i++) {
    const x = placement.x - span / 2 + (span * (i + 0.5)) / perSide
    points.push({ pin: String(i + 1), x, z: placement.z + width / 2 + 0.035, side: 1 })
    points.push({ pin: String(part.pins - i), x, z: placement.z - width / 2 - 0.035, side: -1 })
  }
  return points
}

export function nearestPin(placement: ChipPlacement, localX: number, localZ: number): PinPoint | null {
  let best: PinPoint | null = null
  let bestDist = Infinity
  for (const point of pinPoints(placement)) {
    const dx = point.x - localX
    const dz = point.z - localZ
    const dist = dx * dx + dz * dz
    if (dist < bestDist) {
      bestDist = dist
      best = point
    }
  }
  return best
}
