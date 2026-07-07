export type OperandMode = 'imm' | 'abs' | 'ind' | 'absx' | 'port'

export interface InstructionDef {
  mnemonic: string
  opcode: number
  mode: OperandMode | null
  description: string
}

export interface Isa {
  name: string
  addressBits: number
  instructions: InstructionDef[]
}

export function operandBytes(isa: Isa, mode: OperandMode | null): number {
  if (mode === null) return 0
  if (mode === 'imm' || mode === 'port') return 1
  return isa.addressBits > 8 ? 2 : 1
}

export function instructionSize(isa: Isa, def: InstructionDef): number {
  return 1 + operandBytes(isa, def.mode)
}

export const MSAP2: Isa = {
  name: 'msap2',
  addressBits: 13,
  instructions: [
    { mnemonic: 'NOP', opcode: 0x00, mode: null, description: 'No operation' },
    { mnemonic: 'HLT', opcode: 0x01, mode: null, description: 'Halt the clock' },
    { mnemonic: 'EI', opcode: 0x02, mode: null, description: 'Enable interrupts' },
    { mnemonic: 'DI', opcode: 0x03, mode: null, description: 'Disable interrupts' },
    { mnemonic: 'RTS', opcode: 0x04, mode: null, description: 'Return from subroutine' },
    { mnemonic: 'RTI', opcode: 0x05, mode: null, description: 'Return from interrupt (restores flags)' },
    { mnemonic: 'PHA', opcode: 0x06, mode: null, description: 'Push A onto the stack' },
    { mnemonic: 'PLA', opcode: 0x07, mode: null, description: 'Pop A from the stack' },
    { mnemonic: 'PHX', opcode: 0x08, mode: null, description: 'Push X onto the stack' },
    { mnemonic: 'PLX', opcode: 0x09, mode: null, description: 'Pop X from the stack' },
    { mnemonic: 'TAX', opcode: 0x0a, mode: null, description: 'Copy A to X' },
    { mnemonic: 'TXA', opcode: 0x0b, mode: null, description: 'Copy X to A' },
    { mnemonic: 'INX', opcode: 0x0c, mode: null, description: 'Increment X' },
    { mnemonic: 'DEX', opcode: 0x0d, mode: null, description: 'Decrement X' },
    { mnemonic: 'SHL', opcode: 0x0e, mode: null, description: 'Shift A left through carry' },
    { mnemonic: 'SHR', opcode: 0x0f, mode: null, description: 'Shift A right through carry' },
    { mnemonic: 'LDA', opcode: 0x10, mode: 'imm', description: 'Load A immediate' },
    { mnemonic: 'LDA', opcode: 0x11, mode: 'abs', description: 'Load A from address' },
    { mnemonic: 'LDA', opcode: 0x12, mode: 'ind', description: 'Load A via pointer stored at address' },
    { mnemonic: 'LDA', opcode: 0x13, mode: 'absx', description: 'Load A from address + X' },
    { mnemonic: 'STA', opcode: 0x14, mode: 'abs', description: 'Store A to address' },
    { mnemonic: 'STA', opcode: 0x15, mode: 'ind', description: 'Store A via pointer stored at address' },
    { mnemonic: 'STA', opcode: 0x16, mode: 'absx', description: 'Store A to address + X' },
    { mnemonic: 'LDX', opcode: 0x17, mode: 'imm', description: 'Load X immediate' },
    { mnemonic: 'LDX', opcode: 0x18, mode: 'abs', description: 'Load X from address' },
    { mnemonic: 'STX', opcode: 0x19, mode: 'abs', description: 'Store X to address' },
    { mnemonic: 'TXS', opcode: 0x1a, mode: null, description: 'Copy X to the stack pointer' },
    { mnemonic: 'ADD', opcode: 0x20, mode: 'imm', description: 'A = A + immediate' },
    { mnemonic: 'ADD', opcode: 0x21, mode: 'abs', description: 'A = A + [address]' },
    { mnemonic: 'SUB', opcode: 0x22, mode: 'imm', description: 'A = A - immediate' },
    { mnemonic: 'SUB', opcode: 0x23, mode: 'abs', description: 'A = A - [address]' },
    { mnemonic: 'AND', opcode: 0x24, mode: 'imm', description: 'A = A and immediate' },
    { mnemonic: 'AND', opcode: 0x25, mode: 'abs', description: 'A = A and [address]' },
    { mnemonic: 'ORA', opcode: 0x26, mode: 'imm', description: 'A = A or immediate' },
    { mnemonic: 'ORA', opcode: 0x27, mode: 'abs', description: 'A = A or [address]' },
    { mnemonic: 'XOR', opcode: 0x28, mode: 'imm', description: 'A = A xor immediate' },
    { mnemonic: 'XOR', opcode: 0x29, mode: 'abs', description: 'A = A xor [address]' },
    { mnemonic: 'CMP', opcode: 0x2a, mode: 'imm', description: 'Compare A with immediate (flags only)' },
    { mnemonic: 'CMP', opcode: 0x2b, mode: 'abs', description: 'Compare A with [address] (flags only)' },
    { mnemonic: 'CPX', opcode: 0x2c, mode: 'imm', description: 'Compare X with immediate (flags only)' },
    { mnemonic: 'JMP', opcode: 0x30, mode: 'abs', description: 'Jump' },
    { mnemonic: 'JSR', opcode: 0x31, mode: 'abs', description: 'Jump to subroutine (pushes return address)' },
    { mnemonic: 'JZ', opcode: 0x32, mode: 'abs', description: 'Jump if zero' },
    { mnemonic: 'JNZ', opcode: 0x33, mode: 'abs', description: 'Jump if not zero' },
    { mnemonic: 'JC', opcode: 0x34, mode: 'abs', description: 'Jump if carry' },
    { mnemonic: 'JNC', opcode: 0x35, mode: 'abs', description: 'Jump if not carry' },
    { mnemonic: 'JN', opcode: 0x36, mode: 'abs', description: 'Jump if negative' },
    { mnemonic: 'BRK', opcode: 0x37, mode: null, description: 'Break into the monitor (prints PC/A/X)' },
    { mnemonic: 'JMP', opcode: 0x38, mode: 'ind', description: 'Jump via pointer stored at address' },
    { mnemonic: 'IN', opcode: 0x40, mode: 'port', description: 'Read port into A (sets Z/N)' },
    { mnemonic: 'OUT', opcode: 0x41, mode: 'port', description: 'Write A to port' },
  ],
}

export function findInstruction(isa: Isa, mnemonic: string, mode: OperandMode | null): InstructionDef | undefined {
  const upper = mnemonic.toUpperCase()
  return isa.instructions.find((d) => d.mnemonic === upper && d.mode === mode)
}

export function mnemonicExists(isa: Isa, mnemonic: string): boolean {
  const upper = mnemonic.toUpperCase()
  return isa.instructions.some((d) => d.mnemonic === upper)
}

export function findByOpcode(isa: Isa, opcode: number): InstructionDef | undefined {
  return isa.instructions.find((d) => d.opcode === opcode)
}
