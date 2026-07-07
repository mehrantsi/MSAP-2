import { EXAMPLES } from '../core/examples'
import { MSAP2 as MSAP2_ISA } from '../core/isa'
import { Machine } from '../core/machine'
import { CONNECTIONS, MODULES } from '../core/modules'
import { SIGNALS } from '../core/signals'
import { applyUcode, loadOverrides } from '../core/ucodeStore'
import MOS_ROM from '../rom/mos-rom.json'
import { MachineDefinition } from './types'

export const msap2: MachineDefinition = {
  id: 'msap2',
  name: 'MSAP-2',
  subtitle: 'rev.A - microcoded',
  isa: MSAP2_ISA,
  signals: SIGNALS,
  registers: [
    { name: 'PC', bits: 13, get: (s) => s.pc, format: (s) => `0x${s.pc.toString(16).toUpperCase().padStart(4, '0')}  ${s.pc}` },
    { name: 'A', bits: 8, get: (s) => s.a },
    { name: 'X', bits: 8, get: (s) => s.x },
    { name: 'SP', bits: 8, get: (s) => s.sp },
    { name: 'MAR', bits: 13, get: (s) => s.mar, format: (s) => `0x${s.mar.toString(16).toUpperCase().padStart(4, '0')}  ${s.mar}` },
    {
      name: 'OP',
      bits: 8,
      get: (s) => s.irOpcode,
      format: (s) => `0x${s.irOpcode.toString(16).toUpperCase().padStart(2, '0')}`,
    },
    { name: 'OUT', bits: 8, get: (s) => s.out },
    { name: 'BUS', bits: 8, get: (s) => s.bus },
  ],
  flags: [
    { name: 'CF', get: (s) => s.carry },
    { name: 'ZF', get: (s) => s.zero },
    { name: 'NF', get: (s) => s.negative },
    { name: 'IE', get: (s) => s.interruptsEnabled },
  ],
  modules: MODULES,
  connections: CONNECTIONS,
  examples: EXAMPLES.map((e) => ({ ...e })),
  createCore: () => {
    const machine = new Machine()
    machine.loadRom(MOS_ROM)
    try {
      applyUcode(machine, loadOverrides())
    } catch {
      /* stock microcode */
    }
    return machine
  },
}
