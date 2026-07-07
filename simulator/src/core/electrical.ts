import { activeModules } from './design'
import { Snapshot } from './machine'
import { ledCurrentMa, PARTS } from './parts'

export interface ModuleCurrent {
  id: string
  name: string
  chipsMa: number
  ledsMa: number
  totalMa: number
}

export interface PowerEstimate {
  vcc: number
  modules: ModuleCurrent[]
  displayMa: number
  totalMa: number
}

function popcount(v: number): number {
  let n = 0
  while (v) {
    n += v & 1
    v >>>= 1
  }
  return n
}

const SEGMENT_COUNTS = [6, 2, 5, 5, 4, 5, 6, 3, 7, 6]

export function displayCurrentMa(out: number, signed: boolean, vcc = 5): number {
  const value = signed && out > 127 ? out - 256 : out
  const text = String(Math.abs(value)).padStart(1, '0')
  let segments = 0
  for (const ch of text) segments += SEGMENT_COUNTS[Number(ch)] ?? 0
  if (value < 0) segments += 1
  const perSegmentMa = ledCurrentMa('red', 220, vcc)
  return (segments * perSegmentMa) / 4
}

export function estimatePower(snapshot: Snapshot, signedDisplay: boolean, vcc = 5, clockHz = 100): PowerEstimate {
  const modules: ModuleCurrent[] = []
  let displayMa = 0

  for (const mod of activeModules()) {
    let chipsMa = 0
    for (const chip of mod.chips) {
      const part = PARTS[chip.part]
      if (!part) continue
      chipsMa += part.iccTypMa
      if (part.cpdPf) {
        chipsMa += part.cpdPf * 1e-12 * vcc * vcc * clockHz * 1000
      }
    }
    let ledsMa = 0
    for (const bar of mod.leds) {
      const lit = popcount(bar.value(snapshot) & ((1 << bar.count) - 1))
      ledsMa += lit * ledCurrentMa(bar.color, bar.seriesOhm, vcc)
    }
    if (mod.sevenSeg) {
      displayMa = displayCurrentMa(snapshot.out, signedDisplay, vcc)
      ledsMa += displayMa
    }
    modules.push({ id: mod.id, name: mod.name, chipsMa, ledsMa, totalMa: chipsMa + ledsMa })
  }

  const totalMa = modules.reduce((acc, m) => acc + m.totalMa, 0)
  return { vcc, modules, displayMa, totalMa }
}
