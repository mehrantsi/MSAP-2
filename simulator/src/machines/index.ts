import { msap2 } from './msap2'
import { MachineDefinition } from './types'

export const MACHINES: MachineDefinition[] = [msap2]

export function currentMachine(): MachineDefinition {
  return MACHINES[0]
}

export function switchMachine(_id: string): void {
  /* single machine in this twin */
}

export function storageKey(base: string): string {
  return base.replace(/^msap1/, 'msap2')
}
