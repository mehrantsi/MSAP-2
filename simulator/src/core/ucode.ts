export const BUS_NONE = 0
export const BUS_RAM = 1
export const BUS_A = 2
export const BUS_X = 3
export const BUS_B = 4
export const BUS_ALU = 5
export const BUS_FLG = 6
export const BUS_PCL = 7
export const BUS_PCH = 8
export const BUS_IO = 9
export const BUS_VECI = 10
export const BUS_VECB = 11
export const BUS_ZERO = 12

export const AI = 1 << 4
export const XI = 1 << 5
export const BI = 1 << 6
export const II = 1 << 7
export const TL = 1 << 8
export const TH = 1 << 9
export const FRI = 1 << 10
export const RW = 1 << 11
export const IOW = 1 << 12
export const MI = 1 << 13

export const MS_PC = 0 << 14
export const MS_TMP = 1 << 14
export const MS_SP = 2 << 14
export const MS_TMPX = 3 << 14

export const CTR_NONE = 0
export const CTR_PCI = 1 << 16
export const CTR_PCL = 2 << 16
export const CTR_SPI = 3 << 16
export const CTR_SPD = 4 << 16
export const CTR_SPL = 5 << 16
export const CTR_TPI = 6 << 16
export const CTR_XU = 7 << 16
export const CTR_XD = 8 << 16

export const F_ADD = 0 << 20
export const F_SUB = 1 << 20
export const F_AND = 2 << 20
export const F_OR = 3 << 20
export const F_XOR = 4 << 20
export const F_SHL = 5 << 20
export const F_SHR = 6 << 20
export const F_PASB = 7 << 20

export const FI = 1 << 23
export const AXS = 1 << 24
export const IES = 1 << 25
export const IEC = 1 << 26
export const RST = 1 << 27
export const HLT = 1 << 28

export const busSrc = (cw: number): number => cw & 0x0f
export const marSrc = (cw: number): number => (cw >> 14) & 0x03
export const ctrOp = (cw: number): number => (cw >> 16) & 0x0f
export const aluFn = (cw: number): number => (cw >> 20) & 0x07

export const IRQ_SLOT = 0xff

export interface UcodeRow {
  steps: number[]
  taken?: number[]
  condition?: (c: boolean, z: boolean, n: boolean) => boolean
}

const FETCH = [MI | MS_PC, BUS_RAM | II | CTR_PCI]

const OPADDR = [MI | MS_PC, BUS_RAM | TL | CTR_PCI, MI | MS_PC, BUS_RAM | TH | CTR_PCI]

const DEREF = [MI | MS_TMP, BUS_RAM | BI, CTR_TPI, MI | MS_TMP, BUS_RAM | TH, BUS_B | TL]

const PUSH = (src: number) => [MI | MS_SP, src | RW, CTR_SPD]

const row = (steps: number[]): UcodeRow => ({ steps: [...FETCH, ...steps] })

const branch = (condition: (c: boolean, z: boolean, n: boolean) => boolean): UcodeRow => ({
  steps: [...FETCH, ...OPADDR, RST],
  taken: [...FETCH, ...OPADDR, CTR_PCL | RST],
  condition,
})

const aluImm = (fn: number, load: number) => row([MI | MS_PC, BUS_RAM | BI | CTR_PCI, BUS_ALU | fn | load | FI | RST])
const aluAbs = (fn: number, load: number) => row([...OPADDR, MI | MS_TMP, BUS_RAM | BI, BUS_ALU | fn | load | FI | RST])

export function baseTemplate(): Record<number, UcodeRow> {
  return {
    0x00: row([RST]),
    0x01: row([HLT]),
    0x02: row([IES | RST]),
    0x03: row([IEC | RST]),
    0x04: row([CTR_SPI, MI | MS_SP, BUS_RAM | TL, CTR_SPI, MI | MS_SP, BUS_RAM | TH, CTR_PCL | RST]),
    0x05: row([
      CTR_SPI, MI | MS_SP, BUS_RAM | FRI,
      CTR_SPI, MI | MS_SP, BUS_RAM | TL,
      CTR_SPI, MI | MS_SP, BUS_RAM | TH,
      CTR_PCL | RST,
    ]),
    0x06: row([...PUSH(BUS_A), RST]),
    0x07: row([CTR_SPI, MI | MS_SP, BUS_RAM | BI, BUS_ALU | F_PASB | AI | FI | RST]),
    0x08: row([...PUSH(BUS_X), RST]),
    0x09: row([CTR_SPI, MI | MS_SP, BUS_RAM | BI, BUS_ALU | F_PASB | XI | FI | RST]),
    0x0a: row([BUS_A | BI, BUS_ALU | F_PASB | XI | FI | RST]),
    0x0b: row([BUS_X | BI, BUS_ALU | F_PASB | AI | FI | RST]),
    0x0c: row([CTR_XU, BUS_X | BI, BUS_ALU | F_PASB | FI | RST]),
    0x0d: row([CTR_XD, BUS_X | BI, BUS_ALU | F_PASB | FI | RST]),
    0x0e: row([BUS_ALU | F_SHL | AI | FI | RST]),
    0x0f: row([BUS_ALU | F_SHR | AI | FI | RST]),
    0x10: aluImm(F_PASB, AI),
    0x11: aluAbs(F_PASB, AI),
    0x12: row([...OPADDR, ...DEREF, MI | MS_TMP, BUS_RAM | BI, BUS_ALU | F_PASB | AI | FI | RST]),
    0x13: row([...OPADDR, MI | MS_TMPX, BUS_RAM | BI, BUS_ALU | F_PASB | AI | FI | RST]),
    0x14: row([...OPADDR, MI | MS_TMP, BUS_A | RW | RST]),
    0x15: row([...OPADDR, ...DEREF, MI | MS_TMP, BUS_A | RW | RST]),
    0x16: row([...OPADDR, MI | MS_TMPX, BUS_A | RW | RST]),
    0x17: aluImm(F_PASB, XI),
    0x18: aluAbs(F_PASB, XI),
    0x19: row([...OPADDR, MI | MS_TMP, BUS_X | RW | RST]),
    0x1a: row([BUS_X | CTR_SPL | RST]),
    0x20: aluImm(F_ADD, AI),
    0x21: aluAbs(F_ADD, AI),
    0x22: aluImm(F_SUB, AI),
    0x23: aluAbs(F_SUB, AI),
    0x24: aluImm(F_AND, AI),
    0x25: aluAbs(F_AND, AI),
    0x26: aluImm(F_OR, AI),
    0x27: aluAbs(F_OR, AI),
    0x28: aluImm(F_XOR, AI),
    0x29: aluAbs(F_XOR, AI),
    0x2a: aluImm(F_SUB, 0),
    0x2b: aluAbs(F_SUB, 0),
    0x2c: row([MI | MS_PC, BUS_RAM | BI | CTR_PCI, BUS_ALU | F_SUB | AXS | FI | RST]),
    0x30: row([...OPADDR, CTR_PCL | RST]),
    0x31: row([...OPADDR, ...PUSH(BUS_PCH), ...PUSH(BUS_PCL), CTR_PCL | RST]),
    0x32: branch((_c, z) => z),
    0x33: branch((_c, z) => !z),
    0x34: branch((c) => c),
    0x35: branch((c) => !c),
    0x36: branch((_c, _z, n) => n),
    0x37: row([...PUSH(BUS_PCH), ...PUSH(BUS_PCL), ...PUSH(BUS_FLG), BUS_VECB | TL, BUS_ZERO | TH, IEC | CTR_PCL | RST]),
    0x38: row([...OPADDR, ...DEREF, CTR_PCL | RST]),
    0x40: row([MI | MS_PC, BUS_RAM | TL | CTR_PCI, BUS_IO | BI, BUS_ALU | F_PASB | AI | FI | RST]),
    0x41: row([MI | MS_PC, BUS_RAM | TL | CTR_PCI, BUS_A | IOW | RST]),
    [IRQ_SLOT]: {
      steps: [
        MI | MS_PC, II,
        ...PUSH(BUS_PCH), ...PUSH(BUS_PCL), ...PUSH(BUS_FLG),
        BUS_VECI | TL, BUS_ZERO | TH, IEC | CTR_PCL | RST,
      ],
    },
  }
}

export const ROM_COUNT = 4
export const ROM_SIZE = 32768
export const STEPS = 16

export function romAddress(flagBits: number, opcode: number, step: number): number {
  return (flagBits << 12) | (opcode << 4) | step
}

export function buildRoms(template: Record<number, UcodeRow>): Uint8Array[] {
  const roms = Array.from({ length: ROM_COUNT }, () => new Uint8Array(ROM_SIZE))
  for (let flagBits = 0; flagBits < 8; flagBits++) {
    const c = (flagBits & 1) !== 0
    const z = (flagBits & 2) !== 0
    const n = (flagBits & 4) !== 0
    for (let opcode = 0; opcode < 256; opcode++) {
      const entry = template[opcode]
      for (let step = 0; step < STEPS; step++) {
        let cw: number
        if (!entry) {
          cw = step === 0 ? MI | MS_PC : step === 1 ? BUS_RAM | II | CTR_PCI : HLT
        } else {
          const steps = entry.condition && entry.condition(c, z, n) && entry.taken ? entry.taken : entry.steps
          cw = step < steps.length ? steps[step] : RST
        }
        const addr = romAddress(flagBits, opcode, step)
        roms[0][addr] = cw & 0xff
        roms[1][addr] = (cw >> 8) & 0xff
        roms[2][addr] = (cw >> 16) & 0xff
        roms[3][addr] = (cw >> 24) & 0xff
      }
    }
  }
  return roms
}

export const CW_SIGNALS: { name: string; bit?: number; describe: (cw: number) => string | null }[] = [
  { name: 'BUS', describe: (cw) => ['', 'RAM', 'A', 'X', 'B', 'ALU', 'FLG', 'PCL', 'PCH', 'IO', 'VECI', 'VECB', 'ZERO'][busSrc(cw)] || null },
  { name: 'AI', describe: (cw) => (cw & AI ? 'AI' : null) },
  { name: 'XI', describe: (cw) => (cw & XI ? 'XI' : null) },
  { name: 'BI', describe: (cw) => (cw & BI ? 'BI' : null) },
  { name: 'II', describe: (cw) => (cw & II ? 'II' : null) },
  { name: 'TL', describe: (cw) => (cw & TL ? 'TL' : null) },
  { name: 'TH', describe: (cw) => (cw & TH ? 'TH' : null) },
  { name: 'FRI', describe: (cw) => (cw & FRI ? 'FRI' : null) },
  { name: 'RW', describe: (cw) => (cw & RW ? 'RW' : null) },
  { name: 'IOW', describe: (cw) => (cw & IOW ? 'IOW' : null) },
  { name: 'MAR', describe: (cw) => (cw & MI ? `MI:${['PC', 'TMP', 'SP', 'TMP+X'][marSrc(cw)]}` : null) },
  { name: 'CTR', describe: (cw) => ['', 'PC++', 'PC=TMP', 'SP++', 'SP--', 'SP=BUS', 'TMP++', 'X++', 'X--'][ctrOp(cw)] || null },
  { name: 'ALU', describe: (cw) => ((cw & FI) !== 0 || busSrc(cw) === BUS_ALU ? `F:${['ADD', 'SUB', 'AND', 'OR', 'XOR', 'SHL', 'SHR', 'PASB'][aluFn(cw)]}` : null) },
  { name: 'FI', describe: (cw) => (cw & FI ? 'FI' : null) },
  { name: 'AXS', describe: (cw) => (cw & AXS ? 'AXS' : null) },
  { name: 'IE', describe: (cw) => (cw & IES ? 'IES' : cw & IEC ? 'IEC' : null) },
  { name: 'RST', describe: (cw) => (cw & RST ? 'RST' : null) },
  { name: 'HLT', describe: (cw) => (cw & HLT ? 'HLT' : null) },
]

export function describeWord(cw: number): string {
  const parts: string[] = []
  for (const sig of CW_SIGNALS) {
    const d = sig.describe(cw)
    if (d) parts.push(d)
  }
  return parts.join(' ')
}
