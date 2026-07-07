import { findByOpcode, Isa, MSAP2, operandBytes } from './isa'

export interface DisasmLine {
  address: number
  bytes: number[]
  text: string
}

export function disassemble(ram: Uint8Array, start: number, count: number, isa: Isa = MSAP2): DisasmLine[] {
  const lines: DisasmLine[] = []
  let addr = start
  while (lines.length < count && addr < ram.length) {
    const opcode = ram[addr]
    const def = findByOpcode(isa, opcode)
    if (!def) {
      lines.push({ address: addr, bytes: [opcode], text: `.byte ${opcode}` })
      addr += 1
      continue
    }
    const width = operandBytes(isa, def.mode)
    const bytes: number[] = [opcode]
    for (let i = 1; i <= width && addr + i < ram.length; i++) bytes.push(ram[addr + i])
    let text = def.mnemonic
    if (def.mode === 'imm') text += ` #${bytes[1] ?? 0}`
    else if (def.mode === 'port') text += ` #${bytes[1] ?? 0}`
    else if (def.mode !== null) {
      const target = ((bytes[1] ?? 0) | ((bytes[2] ?? 0) << 8)) & 0x7ff
      const hex = target.toString(16).toUpperCase().padStart(4, '0')
      if (def.mode === 'ind') text += ` ($${hex})`
      else if (def.mode === 'absx') text += ` $${hex},X`
      else text += ` $${hex}`
    }
    lines.push({ address: addr, bytes, text })
    addr += 1 + width
  }
  return lines
}

export function describeOpcode(opcode: number, isa: Isa = MSAP2): string {
  const def = findByOpcode(isa, opcode)
  if (!def) return `?${opcode.toString(16).toUpperCase().padStart(2, '0')}`
  return def.mode ? `${def.mnemonic}.${def.mode}` : def.mnemonic
}
