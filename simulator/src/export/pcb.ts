import { activeModules } from '../core/design'
import { PassiveKind } from '../core/modules'
import { PARTS, PackageName } from '../core/parts'
import { buildNetlistModel, FOOTPRINTS, PASSIVE_FOOTPRINTS, PASSIVE_FOOTPRINTS_SMD } from './netlist'

const PITCH = 2.54

export type MountStyle = 'tht' | 'smd'

const SMD_FOOTPRINTS: Record<PackageName, string> = {
  'DIP-8': 'Package_SO:SOIC-8_3.9x4.9mm_P1.27mm',
  'DIP-14': 'Package_SO:SOIC-14_3.9x8.7mm_P1.27mm',
  'DIP-16': 'Package_SO:SOIC-16_3.9x9.9mm_P1.27mm',
  'DIP-20': 'Package_SO:SOIC-20W_7.5x12.8mm_P1.27mm',
  'DIP-24W': 'Package_SO:SOIC-24W_7.5x15.4mm_P1.27mm',
  'DIP-28W': 'Package_SO:SOIC-28W_7.5x18.7mm_P1.27mm',
  'TO-92': 'Package_TO_SOT_SMD:SOT-23',
  'TO-220': 'Package_TO_SOT_SMD:TO-263-2',
}

interface PadSpec {
  name: string
  x: number
  y: number
  smd: boolean
  w: number
  h: number
}

function dipPads(pins: number, rowSpacing: number): PadSpec[] {
  const perSide = pins / 2
  const pads: PadSpec[] = []
  for (let i = 0; i < perSide; i++) {
    pads.push({ name: String(i + 1), x: 0, y: i * PITCH, smd: false, w: 1.6, h: 1.6 })
  }
  for (let i = 0; i < perSide; i++) {
    pads.push({ name: String(pins - i), x: rowSpacing, y: i * PITCH, smd: false, w: 1.6, h: 1.6 })
  }
  return pads
}

function soicPads(pins: number, rowSpan: number): PadSpec[] {
  const perSide = pins / 2
  const pads: PadSpec[] = []
  const pitch = 1.27
  for (let i = 0; i < perSide; i++) {
    pads.push({ name: String(i + 1), x: -rowSpan / 2, y: i * pitch, smd: true, w: 1.6, h: 0.6 })
  }
  for (let i = 0; i < perSide; i++) {
    pads.push({ name: String(pins - i), x: rowSpan / 2, y: i * pitch, smd: true, w: 1.6, h: 0.6 })
  }
  return pads
}

function packagePads(pkg: PackageName, mount: MountStyle): PadSpec[] {
  if (mount === 'smd') {
    switch (pkg) {
      case 'DIP-8':
        return soicPads(8, 5.4)
      case 'DIP-14':
        return soicPads(14, 5.4)
      case 'DIP-16':
        return soicPads(16, 5.4)
      case 'DIP-20':
        return soicPads(20, 9.0)
      case 'DIP-24W':
        return soicPads(24, 9.0)
      case 'DIP-28W':
        return soicPads(28, 9.0)
      case 'TO-92':
        return [
          { name: '1', x: -0.95, y: 1.1, smd: true, w: 0.9, h: 0.8 },
          { name: '2', x: 0.95, y: 1.1, smd: true, w: 0.9, h: 0.8 },
          { name: '3', x: 0, y: -1.1, smd: true, w: 0.9, h: 0.8 },
        ]
      case 'TO-220':
        return [
          { name: '1', x: -2.54, y: 8, smd: true, w: 1.5, h: 2.5 },
          { name: '2', x: 0, y: 0, smd: true, w: 8, h: 10 },
          { name: '3', x: 2.54, y: 8, smd: true, w: 1.5, h: 2.5 },
        ]
    }
  }
  switch (pkg) {
    case 'DIP-8':
      return dipPads(8, 7.62)
    case 'DIP-14':
      return dipPads(14, 7.62)
    case 'DIP-16':
      return dipPads(16, 7.62)
    case 'DIP-20':
      return dipPads(20, 7.62)
    case 'DIP-24W':
      return dipPads(24, 15.24)
    case 'DIP-28W':
      return dipPads(28, 15.24)
    case 'TO-92':
    case 'TO-220':
      return [
        { name: '1', x: 0, y: 0, smd: false, w: 1.6, h: 1.6 },
        { name: '2', x: PITCH, y: 0, smd: false, w: 1.6, h: 1.6 },
        { name: '3', x: PITCH * 2, y: 0, smd: false, w: 1.6, h: 1.6 },
      ]
  }
}

function footprintSize(pkg: PackageName, mount: MountStyle): { w: number; h: number } {
  if (mount === 'smd') {
    switch (pkg) {
      case 'DIP-8':
        return { w: 7, h: 6 }
      case 'DIP-14':
        return { w: 7, h: 10 }
      case 'DIP-16':
        return { w: 7, h: 11 }
      case 'DIP-20':
        return { w: 11, h: 14 }
      case 'DIP-24W':
        return { w: 11, h: 17 }
      case 'DIP-28W':
        return { w: 11, h: 19 }
      case 'TO-92':
        return { w: 4, h: 4 }
      case 'TO-220':
        return { w: 11, h: 12 }
    }
  }
  switch (pkg) {
    case 'DIP-8':
      return { w: 10, h: 11 }
    case 'DIP-14':
      return { w: 10, h: 19 }
    case 'DIP-16':
      return { w: 10, h: 21 }
    case 'DIP-20':
      return { w: 10, h: 26 }
    case 'DIP-24W':
      return { w: 18, h: 31 }
    case 'DIP-28W':
      return { w: 18, h: 36 }
    case 'TO-92':
      return { w: 8, h: 6 }
    case 'TO-220':
      return { w: 10, h: 8 }
  }
}

function passivePads(kind: PassiveKind, mount: MountStyle): PadSpec[] {
  if (mount === 'smd') {
    if (kind === 'pot') {
      return [
        { name: '1', x: -1.35, y: 0, smd: true, w: 1, h: 1.2 },
        { name: '2', x: 0, y: 1.6, smd: true, w: 1, h: 1.2 },
        { name: '3', x: 1.35, y: 0, smd: true, w: 1, h: 1.2 },
      ]
    }
    if (kind === 'rnet') {
      const pads: PadSpec[] = []
      for (let i = 0; i < 8; i++) {
        pads.push({ name: String(i + 1), x: -2.2 + (i % 4) * 1.5, y: i < 4 ? -0.8 : 0.8, smd: true, w: 0.8, h: 0.9 })
      }
      return pads
    }
    return [
      { name: '1', x: -0.95, y: 0, smd: true, w: 1, h: 1.25 },
      { name: '2', x: 0.95, y: 0, smd: true, w: 1, h: 1.25 },
    ]
  }
  if (kind === 'pot') {
    return [
      { name: '1', x: 0, y: 0, smd: false, w: 1.6, h: 1.6 },
      { name: '2', x: PITCH, y: 0, smd: false, w: 1.6, h: 1.6 },
      { name: '3', x: PITCH * 2, y: 0, smd: false, w: 1.6, h: 1.6 },
    ]
  }
  if (kind === 'ledbar') {
    const pads: PadSpec[] = []
    for (let i = 0; i < 10; i++) {
      pads.push({ name: String(i + 1), x: i * PITCH, y: 0, smd: false, w: 1.6, h: 1.6 })
    }
    return pads
  }
  if (kind === 'rnet') {
    const pads: PadSpec[] = []
    for (let i = 0; i < 10; i++) {
      pads.push({ name: String(i + 1), x: i * PITCH, y: 0, smd: false, w: 1.6, h: 1.6 })
    }
    return pads
  }
  const span = kind === 'res' ? 10.16 : 5.08
  return [
    { name: '1', x: 0, y: 0, smd: false, w: 1.6, h: 1.6 },
    { name: '2', x: span, y: 0, smd: false, w: 1.6, h: 1.6 },
  ]
}

function passiveSize(kind: PassiveKind, mount: MountStyle): { w: number; h: number } {
  if (mount === 'smd') {
    if (kind === 'pot') return { w: 6, h: 6 }
    if (kind === 'rnet') return { w: 8, h: 5 }
    if (kind === 'ledbar') return { w: 14, h: 8 }
    return { w: 5, h: 4 }
  }
  switch (kind) {
    case 'res':
      return { w: 14, h: 5 }
    case 'cap':
    case 'led':
      return { w: 9, h: 5 }
    case 'rnet':
      return { w: 27, h: 5 }
    case 'pot':
      return { w: 11, h: 10 }
    case 'switch':
      return { w: 10, h: 7 }
    case 'ledbar':
      return { w: 27, h: 8 }
  }
}

let uuidCounter = 0
function uuid(): string {
  uuidCounter++
  return `a0000000-0000-4000-8000-${String(uuidCounter).padStart(12, '0')}`
}

export function renderKicadPcb(mount: MountStyle = 'tht'): string {
  uuidCounter = 0
  const model = buildNetlistModel()

  const netNumber = new Map<string, number>()
  model.nets.forEach((net, i) => netNumber.set(net.name, i + 1))
  const pinNet = new Map<string, string>()
  for (const net of model.nets) {
    for (const node of net.nodes) pinNet.set(`${node.ref}:${node.pin}`, net.name)
  }

  const margin = 12
  const originX = 30
  const originY = 30
  const rowBudget = mount === 'smd' ? 150 : 210
  const gapX = mount === 'smd' ? 4 : 6
  const gapY = mount === 'smd' ? 6 : 8
  const moduleGap = mount === 'smd' ? 7 : 10

  interface Placement {
    ref: string
    part: string
    pkg: PackageName | null
    kind: PassiveKind | null
    value: string
    x: number
    y: number
  }
  const placements: Placement[] = []
  const regionLabels: { text: string; x: number; y: number }[] = []

  let cursorX = originX
  let cursorY = originY
  let rowHeight = 0
  let maxX = originX

  const flow = (size: { w: number; h: number }): { x: number; y: number } => {
    if (cursorX + size.w > originX + rowBudget) {
      cursorX = originX
      cursorY += rowHeight + gapY
      rowHeight = 0
    }
    const pos = { x: cursorX + size.w / 2, y: cursorY + 4 }
    cursorX += size.w + gapX
    rowHeight = Math.max(rowHeight, size.h)
    maxX = Math.max(maxX, cursorX)
    return pos
  }

  for (const mod of activeModules()) {
    if (mod.chips.length === 0 && mod.passives.length === 0) continue
    if (cursorX > originX) {
      cursorX += moduleGap
    }
    regionLabels.push({ text: mod.name, x: cursorX, y: cursorY - 3 })
    for (const chip of mod.chips) {
      const part = PARTS[chip.part]
      if (!part) continue
      const pos = flow(footprintSize(part.package, mount))
      placements.push({ ref: chip.ref, part: chip.part, pkg: part.package, kind: null, value: part.value, ...pos })
    }
    for (const passive of mod.passives) {
      const pos = flow(passiveSize(passive.kind, mount))
      placements.push({ ref: passive.ref, part: '', pkg: null, kind: passive.kind, value: passive.value, ...pos })
    }
  }
  const boardRight = Math.max(maxX, originX + rowBudget) + margin
  const boardBottom = cursorY + rowHeight + margin

  const lines: string[] = []
  lines.push('(kicad_pcb (version 20221018) (generator msap1_simulator)')
  lines.push('  (general (thickness 1.6))')
  lines.push('  (paper "A3")')
  lines.push('  (layers')
  lines.push('    (0 "F.Cu" signal)')
  lines.push('    (31 "B.Cu" signal)')
  lines.push('    (34 "B.Paste" user)')
  lines.push('    (35 "F.Paste" user)')
  lines.push('    (36 "B.SilkS" user "B.Silkscreen")')
  lines.push('    (37 "F.SilkS" user "F.Silkscreen")')
  lines.push('    (38 "B.Mask" user)')
  lines.push('    (39 "F.Mask" user)')
  lines.push('    (44 "Edge.Cuts" user)')
  lines.push('    (49 "F.Fab" user)')
  lines.push('    (50 "B.Fab" user)')
  lines.push('  )')
  lines.push('  (setup (pad_to_mask_clearance 0.05))')
  lines.push('  (net 0 "")')
  model.nets.forEach((net, i) => lines.push(`  (net ${i + 1} "${net.name}")`))

  for (const placement of placements) {
    const footprint = placement.pkg
      ? mount === 'smd'
        ? SMD_FOOTPRINTS[placement.pkg]
        : FOOTPRINTS[placement.pkg]
      : mount === 'smd'
        ? PASSIVE_FOOTPRINTS_SMD[placement.kind!]
        : PASSIVE_FOOTPRINTS[placement.kind!]
    const valueY = placement.pkg
      ? ((PARTS[placement.part]?.pins ?? 8) / 2) * (mount === 'smd' ? 1.27 : PITCH) + 1.6
      : 3.4
    lines.push(
      `  (footprint "${footprint}" (layer "F.Cu") (tstamp ${uuid()}) (at ${placement.x.toFixed(2)} ${placement.y.toFixed(2)})`,
    )
    lines.push(`    (attr ${mount === 'smd' ? 'smd' : 'through_hole'})`)
    lines.push(
      `    (fp_text reference "${placement.ref}" (at 0 -2.4) (layer "F.SilkS") (tstamp ${uuid()}) (effects (font (size 0.9 0.9) (thickness 0.14))))`,
    )
    lines.push(
      `    (fp_text value "${placement.value}" (at 0 ${valueY.toFixed(2)}) (layer "F.Fab") (tstamp ${uuid()}) (effects (font (size 0.9 0.9) (thickness 0.14))))`,
    )
    const pads = placement.pkg ? packagePads(placement.pkg, mount) : passivePads(placement.kind!, mount)
    for (const pad of pads) {
      const net = pinNet.get(`${placement.ref}:${pad.name}`)
      const netClause = net ? ` (net ${netNumber.get(net)} "${net}")` : ''
      if (pad.smd) {
        lines.push(
          `    (pad "${pad.name}" smd roundrect (at ${pad.x.toFixed(2)} ${pad.y.toFixed(2)}) (size ${pad.w} ${pad.h}) (layers "F.Cu" "F.Paste" "F.Mask") (roundrect_rratio 0.25) (tstamp ${uuid()})${netClause})`,
        )
      } else {
        const shape = pad.name === '1' ? 'rect' : 'oval'
        lines.push(
          `    (pad "${pad.name}" thru_hole ${shape} (at ${pad.x.toFixed(2)} ${pad.y.toFixed(2)}) (size ${pad.w} ${pad.h}) (drill 0.8) (layers "*.Cu" "*.Mask") (tstamp ${uuid()})${netClause})`,
        )
      }
    }
    lines.push('  )')
  }

  for (const label of regionLabels) {
    lines.push(
      `  (gr_text "${label.text}" (at ${label.x.toFixed(2)} ${label.y.toFixed(2)}) (layer "F.SilkS") (tstamp ${uuid()}) (effects (font (size 1.2 1.2) (thickness 0.2)) (justify left)))`,
    )
  }

  lines.push(
    `  (gr_rect (start ${originX - margin} ${originY - margin}) (end ${boardRight.toFixed(2)} ${boardBottom.toFixed(2)}) (stroke (width 0.15) (type solid)) (layer "Edge.Cuts") (tstamp ${uuid()}))`,
  )
  lines.push(')')
  return lines.join('\n')
}
