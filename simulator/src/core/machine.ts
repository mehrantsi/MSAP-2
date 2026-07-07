import { DeviceBus } from './devices'
import { SIG } from './signals'
import {
  AI, AXS, BI, BUS_A, BUS_ALU, BUS_B, BUS_FLG, BUS_IO, BUS_PCH, BUS_PCL, BUS_RAM, BUS_VECB, BUS_VECI,
  BUS_X, BUS_ZERO, FI, FRI, HLT, IEC, IES, II, IOW, IRQ_SLOT, MI, RST, RW, TH, TL, XI,
  baseTemplate, buildRoms, busSrc, ctrOp, aluFn, marSrc, romAddress,
} from './ucode'

export const MEM_SIZE = 8192
export const ROM_TOP = 0x1000
export const STACK_PAGE = 0x1f00
export const RESET_VECTOR = 0x000
export const IRQ_VECTOR = 0x008
export const BRK_VECTOR = 0x00b

export interface TraceEntry {
  cycle: number
  phase: 'fetch' | 'exec'
  opcode: number
  step: number
  bus: number
  controlWord: number
  micro: number
  pc: number
  a: number
  b: number
  mar: number
  out: number
  carry: boolean
  zero: boolean
}

export interface Snapshot {
  bus: number
  pc: number
  a: number
  b: number
  mar: number
  irOpcode: number
  irOperand: number
  sp: number
  x: number
  out: number
  carry: boolean
  zero: boolean
  negative: boolean
  interruptsEnabled: boolean
  step: number
  fetch: boolean
  halted: boolean
  controlWord: number
  micro: number
  aluOut: number
  cycle: number
  busConflict: boolean
  ram: Uint8Array
}

export const TRACE_SIZE = 2048

export class Machine {
  rom = new Uint8Array(ROM_TOP)
  ram = new Uint8Array(MEM_SIZE)
  roms: Uint8Array[] = buildRoms(baseTemplate())
  devices = new DeviceBus()

  pc = RESET_VECTOR
  a = 0
  x = 0
  b = 0
  sp = 0xff
  tmp = 0
  carry = false
  zero = false
  negative = false
  interruptsEnabled = false
  halted = false
  cycle = 0
  bus = 0
  mar = 0
  ir = 0
  step = 0
  irqPending = false
  irqActive = false

  breakpoints = new Set<number>()
  trace: TraceEntry[] = []
  private traceHead = 0

  get lastOpcode(): number {
    return this.ir
  }

  reset(): void {
    this.pc = RESET_VECTOR
    this.a = 0
    this.x = 0
    this.b = 0
    this.sp = 0xff
    this.tmp = 0
    this.carry = false
    this.zero = false
    this.negative = false
    this.interruptsEnabled = false
    this.halted = false
    this.cycle = 0
    this.bus = 0
    this.mar = 0
    this.ir = 0
    this.step = 0
    this.irqPending = false
    this.irqActive = false
    this.trace = []
    this.traceHead = 0
  }

  loadRom(image: ArrayLike<number>): void {
    this.rom.fill(0)
    for (let i = 0; i < Math.min(image.length, this.rom.length); i++) this.rom[i] = image[i] & 0xff
  }

  setRoms(roms: Uint8Array[]): void {
    this.roms = roms
  }

  loadImage(image: (number | null)[]): void {
    this.ram.fill(0)
    this.mergeImage(image)
  }

  mergeImage(image: (number | null)[]): void {
    image.forEach((value, addr) => {
      if (value !== null && addr >= ROM_TOP && addr < this.ram.length) this.ram[addr] = value
    })
  }

  readMem(addr: number): number {
    const a = addr & (MEM_SIZE - 1)
    return a < ROM_TOP ? this.rom[a] : this.ram[a]
  }

  private flagsByte(): number {
    return (this.carry ? 1 : 0) | (this.zero ? 2 : 0) | (this.negative ? 4 : 0) | (this.interruptsEnabled ? 8 : 0)
  }

  private setFlagsByte(value: number): void {
    this.carry = (value & 1) !== 0
    this.zero = (value & 2) !== 0
    this.negative = (value & 4) !== 0
    this.interruptsEnabled = (value & 8) !== 0
  }

  private aluCompute(fn: number, side: number): { value: number; carryOut: boolean; arith: boolean } {
    const a = side
    const b = this.b
    switch (fn) {
      case 0: {
        const sum = a + b
        return { value: sum & 0xff, carryOut: sum > 0xff, arith: true }
      }
      case 1: {
        const diff = a + ((b ^ 0xff) + 1)
        return { value: diff & 0xff, carryOut: diff > 0xff, arith: true }
      }
      case 2:
        return { value: a & b, carryOut: false, arith: false }
      case 3:
        return { value: a | b, carryOut: false, arith: false }
      case 4:
        return { value: a ^ b, carryOut: false, arith: false }
      case 5: {
        const sum = a + a
        return { value: sum & 0xff, carryOut: sum > 0xff, arith: true }
      }
      case 6:
        return { value: a >> 1, carryOut: (a & 1) !== 0, arith: true }
      default:
        return { value: b, carryOut: false, arith: false }
    }
  }

  controlWordAt(flagBits: number, opcode: number, step: number): number {
    const addr = romAddress(flagBits, opcode, step)
    return this.roms[0][addr] | (this.roms[1][addr] << 8) | (this.roms[2][addr] << 16) | (this.roms[3][addr] << 24)
  }

  stepT(): { hitBreakpoint: boolean } {
    if (this.halted) return { hitBreakpoint: false }

    if (this.step === 0) {
      this.irqActive = this.irqPending && this.interruptsEnabled
      if (this.irqActive) this.irqPending = false
    }

    const flagBits = (this.carry ? 1 : 0) | (this.zero ? 2 : 0) | (this.negative ? 4 : 0)
    const rowIr = this.irqActive ? IRQ_SLOT : this.ir
    const cw = this.controlWordAt(flagBits, rowIr, this.step)

    const alu = this.aluCompute(aluFn(cw), cw & AXS ? this.x : this.a)

    let bus = 0
    switch (busSrc(cw)) {
      case BUS_RAM:
        bus = this.readMem(this.mar)
        break
      case BUS_A:
        bus = this.a
        break
      case BUS_X:
        bus = this.x
        break
      case BUS_B:
        bus = this.b
        break
      case BUS_ALU:
        bus = alu.value
        break
      case BUS_FLG:
        bus = this.flagsByte()
        break
      case BUS_PCL:
        bus = this.pc & 0xff
        break
      case BUS_PCH:
        bus = (this.pc >> 8) & 0xff
        break
      case BUS_IO:
        bus = this.devices.portRead(this.tmp & 0xff) & 0xff
        break
      case BUS_VECI:
        bus = IRQ_VECTOR
        break
      case BUS_VECB:
        bus = BRK_VECTOR
        break
      case BUS_ZERO:
        bus = 0
        break
    }
    this.bus = bus

    if (cw & AI) this.a = bus
    if (cw & XI) this.x = bus
    if (cw & BI) this.b = bus
    if (cw & II) this.ir = this.irqActive ? IRQ_SLOT : bus
    if (cw & TL) this.tmp = (this.tmp & 0xff00) | bus
    if (cw & TH) this.tmp = ((bus << 8) | (this.tmp & 0xff)) & 0xffff
    if (cw & FRI) this.setFlagsByte(bus)
    if (cw & RW) {
      const addr = this.mar & (MEM_SIZE - 1)
      if (addr >= ROM_TOP) this.ram[addr] = bus
    }
    if (cw & IOW) this.devices.portWrite(this.tmp & 0xff, bus)

    if (cw & FI) {
      this.zero = alu.value === 0
      this.negative = (alu.value & 0x80) !== 0
      if (alu.arith) this.carry = alu.carryOut
    }

    if (cw & MI) {
      switch (marSrc(cw)) {
        case 0:
          this.mar = this.pc
          break
        case 1:
          this.mar = this.tmp & (MEM_SIZE - 1)
          break
        case 2:
          this.mar = STACK_PAGE | this.sp
          break
        case 3:
          this.mar = (this.tmp + this.x) & (MEM_SIZE - 1)
          break
      }
    }

    switch (ctrOp(cw)) {
      case 1:
        this.pc = (this.pc + 1) & (MEM_SIZE - 1)
        break
      case 2:
        this.pc = this.tmp & (MEM_SIZE - 1)
        break
      case 3:
        this.sp = (this.sp + 1) & 0xff
        break
      case 4:
        this.sp = (this.sp - 1) & 0xff
        break
      case 5:
        this.sp = bus
        break
      case 6:
        this.tmp = (this.tmp + 1) & 0xffff
        break
      case 7:
        this.x = (this.x + 1) & 0xff
        break
      case 8:
        this.x = (this.x - 1) & 0xff
        break
    }

    if (cw & IES) this.interruptsEnabled = true
    if (cw & IEC) this.interruptsEnabled = false
    if (cw & HLT) this.halted = true

    this.cycle++
    if (this.devices.onCycles(1)) this.irqPending = true

    this.pushTrace(this.activityWord(cw), cw)

    let boundary = false
    if (cw & RST || this.step === 15) {
      this.step = 0
      this.irqActive = false
      boundary = true
    } else {
      this.step++
    }

    const hitBreakpoint = boundary && !this.halted && this.breakpoints.has(this.pc)
    return { hitBreakpoint }
  }

  private activityWord(cw: number): number {
    let sig = 0
    const src = busSrc(cw)
    const stackMar = this.mar >= STACK_PAGE
    if (cw & II) sig |= SIG.FETCH
    if (src === BUS_RAM && !stackMar) sig |= SIG.MEMR
    if (cw & RW && !stackMar) sig |= SIG.MEMW
    if (src === BUS_RAM && stackMar) sig |= SIG.STKR
    if (cw & RW && stackMar) sig |= SIG.STKW
    if (src === BUS_ALU || cw & FI) sig |= SIG.ALU
    if (src === BUS_IO) sig |= SIG.IOR
    if (cw & IOW) sig |= SIG.IOW
    if (ctrOp(cw) === 2) sig |= SIG.JMP
    if (this.irqActive) sig |= SIG.IRQ
    if (this.interruptsEnabled) sig |= SIG.IEN
    if (cw & HLT) sig |= SIG.HLT
    return sig
  }

  tick(): { hitBreakpoint: boolean } {
    if (this.halted) return { hitBreakpoint: false }
    for (let i = 0; i < 16; i++) {
      const result = this.stepT()
      if (this.halted || this.step === 0) return result
    }
    return { hitBreakpoint: false }
  }

  atInstructionBoundary(): boolean {
    return this.step === 0
  }

  stepInstruction(): void {
    this.tick()
  }

  private pushTrace(signals: number, micro: number): void {
    const entry: TraceEntry = {
      cycle: this.cycle,
      phase: this.step < 2 ? 'fetch' : 'exec',
      opcode: this.ir,
      step: this.step,
      bus: this.bus,
      controlWord: signals,
      micro,
      pc: this.pc,
      a: this.a,
      b: this.x,
      mar: this.mar,
      out: this.devices.display,
      carry: this.carry,
      zero: this.zero,
    }
    if (this.trace.length < TRACE_SIZE) {
      this.trace.push(entry)
    } else {
      this.trace[this.traceHead] = entry
      this.traceHead = (this.traceHead + 1) % TRACE_SIZE
    }
  }

  recentTrace(count: number): TraceEntry[] {
    const total = this.trace.length
    const take = Math.min(count, total)
    const out: TraceEntry[] = []
    for (let i = total - take; i < total; i++) {
      out.push(this.trace[(this.traceHead + i) % total])
    }
    return out
  }

  snapshot(): Snapshot {
    const last = this.trace.length > 0 ? this.trace[(this.traceHead + this.trace.length - 1) % this.trace.length] : null
    const memory = this.ram.slice()
    memory.set(this.rom, 0)
    return {
      bus: this.bus,
      pc: this.pc,
      a: this.a,
      b: this.x,
      x: this.x,
      sp: this.sp,
      mar: this.mar,
      irOpcode: this.ir,
      irOperand: this.tmp,
      out: this.devices.display,
      carry: this.carry,
      zero: this.zero,
      negative: this.negative,
      interruptsEnabled: this.interruptsEnabled,
      step: this.step,
      fetch: this.step < 2,
      halted: this.halted,
      controlWord: last?.controlWord ?? 0,
      micro: last?.micro ?? 0,
      aluOut: this.a,
      cycle: this.cycle,
      busConflict: false,
      ram: memory,
    }
  }
}
