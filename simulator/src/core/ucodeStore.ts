import { storageKey } from '../machines'
import { Machine } from './machine'
import { baseTemplate, buildRoms, UcodeRow } from './ucode'

export interface UcodeOverride {
  steps?: number[]
  taken?: number[]
}

export type UcodeOverrides = Record<number, UcodeOverride>

const key = () => storageKey('msap1-ucode')

export function loadOverrides(): UcodeOverrides {
  try {
    const raw = localStorage.getItem(key())
    if (raw) return JSON.parse(raw)
  } catch {
    /* stock microcode */
  }
  return {}
}

export function saveOverrides(overrides: UcodeOverrides): void {
  try {
    if (Object.keys(overrides).length === 0) localStorage.removeItem(key())
    else localStorage.setItem(key(), JSON.stringify(overrides))
  } catch {
    /* private mode */
  }
}

export function mergedTemplate(overrides: UcodeOverrides): Record<number, UcodeRow> {
  const template = baseTemplate()
  for (const [key, override] of Object.entries(overrides)) {
    const opcode = Number(key)
    const base = template[opcode]
    if (!base) continue
    template[opcode] = {
      ...base,
      steps: override.steps ?? base.steps,
      taken: override.taken ?? base.taken,
    }
  }
  return template
}

export function applyUcode(machine: Machine, overrides: UcodeOverrides): void {
  machine.setRoms(buildRoms(mergedTemplate(overrides)))
}
