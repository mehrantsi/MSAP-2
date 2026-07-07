export const SIG = {
  FETCH: 1 << 11,
  MEMR: 1 << 10,
  MEMW: 1 << 9,
  STKR: 1 << 8,
  STKW: 1 << 7,
  ALU: 1 << 6,
  IOR: 1 << 5,
  IOW: 1 << 4,
  JMP: 1 << 3,
  IRQ: 1 << 2,
  IEN: 1 << 1,
  HLT: 1 << 0,
} as const

export type SignalName = keyof typeof SIG

export interface SignalInfo {
  name: SignalName
  bit: number
  activeLow: boolean
  description: string
}

export const SIGNALS: SignalInfo[] = [
  { name: 'FETCH', bit: SIG.FETCH, activeLow: false, description: 'Opcode fetch cycle' },
  { name: 'MEMR', bit: SIG.MEMR, activeLow: false, description: 'Memory read' },
  { name: 'MEMW', bit: SIG.MEMW, activeLow: false, description: 'Memory write' },
  { name: 'STKR', bit: SIG.STKR, activeLow: false, description: 'Stack pop' },
  { name: 'STKW', bit: SIG.STKW, activeLow: false, description: 'Stack push' },
  { name: 'ALU', bit: SIG.ALU, activeLow: false, description: 'ALU operation' },
  { name: 'IOR', bit: SIG.IOR, activeLow: false, description: 'Port read' },
  { name: 'IOW', bit: SIG.IOW, activeLow: false, description: 'Port write' },
  { name: 'JMP', bit: SIG.JMP, activeLow: false, description: 'Control transfer taken' },
  { name: 'IRQ', bit: SIG.IRQ, activeLow: false, description: 'Interrupt entry' },
  { name: 'IEN', bit: SIG.IEN, activeLow: false, description: 'Interrupts enabled' },
  { name: 'HLT', bit: SIG.HLT, activeLow: false, description: 'Halted' },
]
