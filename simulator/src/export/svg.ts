import { activeModules } from '../core/design'
import { PARTS } from '../core/parts'

export function renderBlockDiagramSvg(): string {
  const scale = 70
  const width = 620
  const height = 760
  const cx = width / 2
  const cy = height / 2 + 20

  const parts: string[] = []
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="ui-monospace, Menlo, monospace">`)
  parts.push(`<rect width="${width}" height="${height}" fill="#0b0d10"/>`)
  parts.push(`<text x="${cx}" y="34" fill="#c9d1d9" font-size="16" text-anchor="middle">MSAP-1 rev.B - module block diagram</text>`)
  parts.push(`<text x="${cx}" y="52" fill="#7a8490" font-size="10" text-anchor="middle">generated from the simulator module registry</text>`)

  const modules = activeModules()
  const busMod = modules.find((m) => m.id === 'bus')!
  const busX = cx + busMod.position[0] * scale
  parts.push(`<rect x="${busX - 14}" y="${cy - 210}" width="28" height="430" rx="4" fill="none" stroke="#ffb000" stroke-width="1.5"/>`)
  parts.push(`<text x="${busX}" y="${cy + 238}" fill="#ffb000" font-size="10" text-anchor="middle">BUS[0..7]</text>`)

  for (const mod of modules) {
    if (mod.id === 'bus') continue
    const x = cx + mod.position[0] * scale
    const y = cy + mod.position[1] * scale * 0.72
    const w = mod.size[0] * scale
    const h = Math.max(46, mod.size[1] * scale * 0.55)
    const left = x - w / 2
    const top = y - h / 2

    parts.push(`<line x1="${x < cx ? left + w : left}" y1="${y}" x2="${busX + (x < cx ? -14 : 14)}" y2="${y}" stroke="#3a4250" stroke-width="1"/>`)
    parts.push(`<rect x="${left}" y="${top}" width="${w}" height="${h}" rx="5" fill="#12161c" stroke="#2b3340" stroke-width="1"/>`)
    parts.push(`<text x="${left + 8}" y="${top + 15}" fill="#c9d1d9" font-size="11">${mod.name}</text>`)

    const chipLabels = mod.chips.map((c) => `${c.ref} ${PARTS[c.part]?.value ?? c.part}`)
    chipLabels.slice(0, 4).forEach((label, i) => {
      parts.push(`<text x="${left + 8}" y="${top + 30 + i * 11}" fill="#7a8490" font-size="8.5">${label}</text>`)
    })
    if (chipLabels.length > 4) {
      parts.push(`<text x="${left + 8}" y="${top + 30 + 4 * 11}" fill="#7a8490" font-size="8.5">+${chipLabels.length - 4} more</text>`)
    }
  }

  parts.push(`<text x="${cx}" y="${height - 18}" fill="#4c8dff" font-size="9" text-anchor="middle">control word spine: HLT MI RI RO IO II AI AO EOFI SU BI OI CE CO J RST</text>`)
  parts.push('</svg>')
  return parts.join('\n')
}
