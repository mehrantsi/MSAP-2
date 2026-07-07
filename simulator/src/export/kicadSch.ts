import { activeModules } from '../core/design'
import { ModuleDef } from '../core/modules'
import { PARTS } from '../core/parts'

let uuidCounter = 0
const uuid = (): string => `a0000000-0000-4000-8000-${String(++uuidCounter).padStart(12, '0')}`

const F = (n: number): string => (Math.round(n * 100) / 100).toFixed(2)

interface PinGeom {
  number: string
  x: number
  y: number
  angle: number
}

interface SymbolGeom {
  width: number
  height: number
  pins: PinGeom[]
}

function symbolGeometry(pinCount: number): SymbolGeom {
  const rows = Math.ceil(pinCount / 2)
  const half = Math.ceil(pinCount / 2)
  const width = pinCount > 20 ? 20.32 : 15.24
  const height = (rows + 1) * 2.54
  const top = ((rows - 1) * 2.54) / 2
  const pins: PinGeom[] = []
  for (let i = 0; i < pinCount; i++) {
    const left = i < half
    const row = left ? i : pinCount - 1 - i
    pins.push({
      number: String(i + 1),
      x: left ? -(width / 2 + 2.54) : width / 2 + 2.54,
      y: top - row * 2.54,
      angle: left ? 0 : 180,
    })
  }
  return { width, height, pins }
}

function libSymbol(name: string, geom: SymbolGeom): string {
  const w2 = geom.width / 2
  const h2 = geom.height / 2
  const pins = geom.pins
    .map(
      (p) =>
        `      (pin passive line (at ${F(p.x)} ${F(p.y)} ${p.angle}) (length 2.54) ` +
        `(name "~" (effects (font (size 1.016 1.016)))) (number "${p.number}" (effects (font (size 1.016 1.016)))))`,
    )
    .join('\n')
  return `    (symbol "${name}" (pin_names (offset 0.508)) (in_bom yes) (on_board yes)
      (property "Reference" "U" (at 0 ${F(h2 + 2.54)} 0) (effects (font (size 1.27 1.27))))
      (property "Value" "${name}" (at 0 ${F(-h2 - 2.54)} 0) (effects (font (size 1.27 1.27))))
      (property "Footprint" "" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))
      (property "Datasheet" "" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))
      (symbol "${name}_0_1"
        (rectangle (start ${F(-w2)} ${F(h2)}) (end ${F(w2)} ${F(-h2)}) (stroke (width 0.254) (type default)) (fill (type background))))
      (symbol "${name}_1_1"
${pins}
      ))`
}

interface Placed {
  ref: string
  part: string
  pinNets: Record<string, string>
  pinCount: number
  x: number
  y: number
}

function boardComponents(module: ModuleDef): { ref: string; part: string; pinNets: Record<string, string>; pinCount: number }[] {
  const items: { ref: string; part: string; pinNets: Record<string, string>; pinCount: number }[] = []
  for (const chip of module.chips) {
    const part = PARTS[chip.part]
    items.push({ ref: chip.ref, part: chip.part, pinNets: chip.pins ?? {}, pinCount: part?.pins ?? 14 })
  }
  for (const passive of module.passives) {
    if (!passive.pins) continue
    const pinNumbers = Object.keys(passive.pins).map(Number)
    const pinCount = Math.max(2, ...pinNumbers)
    items.push({ ref: passive.ref, part: `${passive.kind.toUpperCase()}_${passive.value.replace(/[^A-Za-z0-9]+/g, '_')}`, pinNets: passive.pins, pinCount })
  }
  return items
}

export function renderKicadSch(module: ModuleDef): string {
  uuidCounter = 0
  const components = boardComponents(module)
  const geoms = new Map<string, SymbolGeom>()
  const libNames = new Map<string, string>()
  for (const c of components) {
    const key = `${c.part}_${c.pinCount}`
    if (!geoms.has(key)) {
      geoms.set(key, symbolGeometry(c.pinCount))
      libNames.set(key, c.part)
    }
  }

  const cols = 4
  const xPitch = 111.76
  const placed: Placed[] = []
  let rowY = 40.64
  let rowMax = 0
  components.forEach((c, i) => {
    const col = i % cols
    if (col === 0 && i > 0) {
      rowY += rowMax + 22.86
      rowMax = 0
    }
    const geom = geoms.get(`${c.part}_${c.pinCount}`)!
    rowMax = Math.max(rowMax, geom.height)
    placed.push({ ...c, x: 55.88 + col * xPitch, y: rowY })
  })

  const lib = [...geoms.entries()].map(([key, geom]) => libSymbol(key, geom)).join('\n')

  const instances = placed
    .map((c) => {
      const geom = geoms.get(`${c.part}_${c.pinCount}`)!
      const pinRefs = geom.pins.map((p) => `    (pin "${p.number}" (uuid "${uuid()}"))`).join('\n')
      return `  (symbol (lib_id "${c.part}_${c.pinCount}") (at ${F(c.x)} ${F(c.y)} 0) (unit 1) (in_bom yes) (on_board yes) (dnp no) (uuid "${uuid()}")
    (property "Reference" "${c.ref}" (at ${F(c.x)} ${F(c.y - geom.height / 2 - 3.81)} 0) (effects (font (size 1.27 1.27))))
    (property "Value" "${libNames.get(`${c.part}_${c.pinCount}`)}" (at ${F(c.x)} ${F(c.y + geom.height / 2 + 3.81)} 0) (effects (font (size 1.27 1.27))))
    (property "Footprint" "" (at ${F(c.x)} ${F(c.y)} 0) (effects (font (size 1.27 1.27)) hide))
${pinRefs}
  )`
    })
    .join('\n')

  const labels: string[] = []
  for (const c of placed) {
    const geom = geoms.get(`${c.part}_${c.pinCount}`)!
    for (const p of geom.pins) {
      const net = c.pinNets[p.number]
      if (!net || net === 'NC') continue
      const lx = c.x + p.x
      const ly = c.y - p.y
      const angle = p.angle === 0 ? 180 : 0
      const justify = p.angle === 0 ? '(justify right)' : '(justify left)'
      labels.push(
        `  (global_label "${net}" (shape input) (at ${F(lx)} ${F(ly)} ${angle}) (fields_autoplaced) (effects (font (size 1.27 1.27)) ${justify}) (uuid "${uuid()}")
    (property "Intersheetrefs" "\${INTERSHEETREFS}" (at ${F(lx)} ${F(ly)} 0) (effects (font (size 1.27 1.27)) hide)))`,
      )
    }
  }

  return `(kicad_sch (version 20230121) (generator "msap2-simulator")

  (uuid "${uuid()}")

  (paper "A1")

  (title_block
    (title "MSAP-2 rev.A - ${module.name}")
    (comment 1 "generated from the simulator module registry")
  )

  (lib_symbols
${lib}
  )

${instances}

${labels.join('\n')}

  (text "${module.name}" (at 55.88 20.32 0) (effects (font (size 5.08 5.08) (thickness 1)) (justify left)))

  (sheet_instances (path "/" (page "1")))
)
`
}

export function renderAllKicadSch(): { name: string; content: string }[] {
  return activeModules()
    .filter((m) => m.chips.length > 0 || m.passives.some((p) => p.pins))
    .map((m) => ({ name: m.name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, ''), content: renderKicadSch(m) }))
}
