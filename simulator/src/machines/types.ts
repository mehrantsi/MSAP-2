import { Isa } from '../core/isa'
import { Machine, Snapshot } from '../core/machine'
import { ConnectionDef, ModuleDef } from '../core/modules'
import { SignalInfo } from '../core/signals'


export interface RegisterSpec {
  name: string
  bits: number
  get: (snap: Snapshot) => number
  format?: (snap: Snapshot) => string
}

export interface FlagSpec {
  name: string
  get: (snap: Snapshot) => boolean
}

export interface MachineExample {
  name: string
  source: string
  expects: string
}

export interface MachineDefinition {
  id: string
  name: string
  subtitle: string
  isa: Isa
  signals: SignalInfo[]
  registers: RegisterSpec[]
  flags: FlagSpec[]
  modules: ModuleDef[]
  connections: ConnectionDef[]
  examples: MachineExample[]
  createCore: () => Machine
}
