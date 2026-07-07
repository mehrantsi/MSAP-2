import { activeModules, chipNetMap, passiveNetMap } from '../core/design'
import { PassiveKind } from '../core/modules'
import { PARTS, PackageName } from '../core/parts'

export const PASSIVE_FOOTPRINTS: Record<PassiveKind, string> = {
  res: 'Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal',
  cap: 'Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P5.00mm',
  rnet: 'Resistor_THT:R_Array_SIP9',
  pot: 'Potentiometer_THT:Potentiometer_Bourns_3296W_Vertical',
  led: 'LED_THT:LED_D3.0mm',
  switch: 'Button_Switch_THT:SW_PUSH_6mm_H5mm',
  ledbar: 'Package_DIP:DIP-20_W7.62mm',
}

export const PASSIVE_FOOTPRINTS_SMD: Record<PassiveKind, string> = {
  res: 'Resistor_SMD:R_0805_2012Metric',
  cap: 'Capacitor_SMD:C_0805_2012Metric',
  rnet: 'Resistor_SMD:R_Array_Convex_4x0603',
  pot: 'Potentiometer_SMD:Potentiometer_Bourns_TC33X',
  led: 'LED_SMD:LED_0805_2012Metric',
  switch: 'Button_Switch_SMD:SW_SPST_TL3342',
  ledbar: 'Package_SO:SOIC-20W_7.5x12.8mm_P1.27mm',
}

export const FOOTPRINTS: Record<PackageName, string> = {
  'DIP-8': 'Package_DIP:DIP-8_W7.62mm',
  'DIP-14': 'Package_DIP:DIP-14_W7.62mm',
  'DIP-16': 'Package_DIP:DIP-16_W7.62mm',
  'DIP-20': 'Package_DIP:DIP-20_W7.62mm',
  'DIP-24W': 'Package_DIP:DIP-24_W15.24mm',
  'DIP-28W': 'Package_DIP:DIP-28_W15.24mm',
  'TO-92': 'Package_TO_SOT_THT:TO-92_Inline',
  'TO-220': 'Package_TO_SOT_THT:TO-220-3_Vertical',
}

export interface NetlistComponent {
  ref: string
  value: string
  footprint: string
  moduleName: string
}

export interface NetlistNet {
  name: string
  nodes: { ref: string; pin: string }[]
}

export interface NetlistModel {
  components: NetlistComponent[]
  nets: NetlistNet[]
}

export function buildNetlistModel(): NetlistModel {
  const components: NetlistComponent[] = []
  const netMap = new Map<string, { ref: string; pin: string }[]>()

  const addNode = (net: string, ref: string, pin: string) => {
    const nodes = netMap.get(net) ?? []
    nodes.push({ ref, pin })
    netMap.set(net, nodes)
  }

  for (const mod of activeModules()) {
    for (const chip of mod.chips) {
      const part = PARTS[chip.part]
      if (!part) continue
      components.push({
        ref: chip.ref,
        value: part.value,
        footprint: FOOTPRINTS[part.package],
        moduleName: mod.name,
      })
      for (const [pin, entry] of Object.entries(chipNetMap(chip))) {
        if (entry.net !== 'NC') addNode(entry.net, chip.ref, pin)
      }
    }
    for (const passive of mod.passives) {
      components.push({
        ref: passive.ref,
        value: passive.value,
        footprint: PASSIVE_FOOTPRINTS[passive.kind],
        moduleName: mod.name,
      })
      for (const [pin, entry] of Object.entries(passiveNetMap(passive))) {
        if (entry.net !== 'NC') addNode(entry.net, passive.ref, pin)
      }
    }
  }

  const nets = [...netMap.entries()]
    .map(([name, nodes]) => ({ name, nodes }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return { components, nets }
}

function escape(text: string): string {
  return text.replace(/"/g, '\\"')
}

export function renderKicadNetlist(model: NetlistModel): string {
  const lines: string[] = []
  lines.push('(export (version "E")')
  lines.push('  (design')
  lines.push('    (source "MSAP-1 simulator module registry")')
  lines.push('    (tool "msap1-simulator (1.0.0)"))')
  lines.push('  (components')
  for (const comp of model.components) {
    lines.push(
      `    (comp (ref "${escape(comp.ref)}") (value "${escape(comp.value)}") (footprint "${escape(comp.footprint)}") (fields (field (name "Module") "${escape(comp.moduleName)}")))`,
    )
  }
  lines.push('  )')
  lines.push('  (nets')
  model.nets.forEach((net, i) => {
    const nodes = net.nodes.map((n) => `(node (ref "${escape(n.ref)}") (pin "${escape(n.pin)}"))`).join(' ')
    lines.push(`    (net (code "${i + 1}") (name "${escape(net.name)}") ${nodes})`)
  })
  lines.push('  )')
  lines.push(')')
  return lines.join('\n')
}
