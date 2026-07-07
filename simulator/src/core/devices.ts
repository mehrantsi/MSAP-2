import ED_PROG from '../rom/ed-prog.json'
import { assemble } from './asm'
import { EXAMPLES } from './examples'
import { MSAP2 } from './isa'

export interface Devices {
  portRead: (port: number) => number
  portWrite: (port: number, value: number) => void
  onCycles: (count: number) => boolean
}

const USER_BASE = 0x1000

function seededFiles(): Record<string, number[]> {
  const files: Record<string, number[]> = { EDIT: ED_PROG as number[] }
  for (const example of EXAMPLES) {
    const result = assemble(example.source, MSAP2)
    if (!result.ok) continue
    const image = result.result.image
    let last = -1
    for (let i = USER_BASE; i < image.length; i++) if (image[i] !== null) last = i
    if (last < USER_BASE) continue
    const bytes: number[] = []
    for (let i = USER_BASE; i <= last; i++) bytes.push(image[i] ?? 0)
    files[example.name.toUpperCase()] = bytes
  }
  return files
}

function seedChecksum(files: Record<string, number[]>): string {
  let hash = 0
  for (const name of Object.keys(files).sort()) {
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
    for (const byte of files[name]) hash = (hash * 33 + byte) >>> 0
  }
  return String(hash)
}

export const TX_CYCLES = 80

export class TerminalDevice {
  private input: number[] = []
  private txBusy = 0
  output = ''
  outputVersion = 0

  typeText(text: string): void {
    for (const ch of text) this.input.push(ch.charCodeAt(0) & 0xff)
  }

  typeByte(byte: number): void {
    this.input.push(byte & 0xff)
  }

  read(): number {
    return this.input.shift() ?? 0
  }

  hasInput(): number {
    return this.input.length > 0 ? 1 : 0
  }

  status(): number {
    return (this.input.length > 0 ? 1 : 0) | (this.txBusy === 0 ? 2 : 0)
  }

  advance(cycles: number): void {
    this.txBusy = Math.max(0, this.txBusy - cycles)
  }

  write(value: number): void {
    this.txBusy = TX_CYCLES
    if (value === 8) {
      this.output = this.output.slice(0, -1)
    } else if (value === 12) {
      this.output = ''
    } else if (value === 13) {
      /* carriage return folded into newline */
    } else if (value === 10) {
      this.output += '\n'
    } else if (value >= 32 && value < 127) {
      this.output += String.fromCharCode(value)
    }
    if (this.output.length > 8000) this.output = this.output.slice(-6000)
    this.outputVersion++
  }

  clear(): void {
    this.input = []
    this.output = ''
    this.outputVersion++
  }
}

type DiskState =
  | { kind: 'idle'; command: number[] }
  | { kind: 'reading'; buffer: number[]; index: number }
  | { kind: 'writing'; name: string; remaining: number; lengthBytes: number[]; data: number[] }

export const DISK_BUSY_CYCLES = 512

export class DiskDevice {
  private state: DiskState = { kind: 'idle', command: [] }
  private busy = 0
  private storageKeyName: string

  constructor(storageKeyName = 'msap2-disk') {
    this.storageKeyName = storageKeyName
    try {
      const seeds = seededFiles()
      const sum = seedChecksum(seeds)
      const markerKey = `${this.storageKeyName}-seed`
      if (localStorage.getItem(markerKey) !== sum) {
        this.saveFiles({ ...this.loadFiles(), ...seeds })
        localStorage.setItem(markerKey, sum)
      }
    } catch {
      /* no storage available */
    }
  }

  private loadFiles(): Record<string, number[]> {
    try {
      const raw = localStorage.getItem(this.storageKeyName)
      if (raw) return JSON.parse(raw)
    } catch {
      /* fresh disk */
    }
    return {}
  }

  private saveFiles(files: Record<string, number[]>): void {
    try {
      localStorage.setItem(this.storageKeyName, JSON.stringify(files))
    } catch {
      /* full or private */
    }
  }

  ready(): number {
    return this.busy === 0 ? 1 : 0
  }

  advance(cycles: number): void {
    this.busy = Math.max(0, this.busy - cycles)
  }

  read(): number {
    if (this.busy > 0) return 0
    if (this.state.kind === 'reading') {
      const value = this.state.buffer[this.state.index] ?? 0
      this.state.index++
      if (this.state.index >= this.state.buffer.length) this.state = { kind: 'idle', command: [] }
      return value
    }
    return 0
  }

  write(value: number): void {
    if (this.state.kind === 'writing') {
      if (this.state.lengthBytes.length < 2) {
        this.state.lengthBytes.push(value)
        if (this.state.lengthBytes.length === 2) {
          this.state.remaining = this.state.lengthBytes[0] | (this.state.lengthBytes[1] << 8)
          if (this.state.remaining === 0) this.finishWrite()
        }
        return
      }
      this.state.data.push(value)
      this.state.remaining--
      if (this.state.remaining <= 0) this.finishWrite()
      return
    }
    if (this.state.kind !== 'idle') this.state = { kind: 'idle', command: [] }
    if (value !== 0) {
      this.state.command.push(value)
      return
    }
    const text = String.fromCharCode(...this.state.command)
    this.state = { kind: 'idle', command: [] }
    this.busy = DISK_BUSY_CYCLES
    this.execute(text)
  }

  private finishWrite(): void {
    if (this.state.kind !== 'writing') return
    const files = this.loadFiles()
    files[this.state.name] = this.state.data
    this.saveFiles(files)
    this.busy = DISK_BUSY_CYCLES
    this.state = { kind: 'idle', command: [] }
  }

  private execute(text: string): void {
    const space = text.indexOf(' ')
    const op = (space === -1 ? text : text.slice(0, space)).toUpperCase()
    const arg = space === -1 ? '' : text.slice(space + 1).trim().toUpperCase()
    const files = this.loadFiles()

    switch (op) {
      case 'L': {
        const data = files[arg]
        if (!data) {
          this.state = { kind: 'reading', buffer: [0xff, 0xff], index: 0 }
        } else {
          this.state = { kind: 'reading', buffer: [data.length & 0xff, (data.length >> 8) & 0xff, ...data], index: 0 }
        }
        break
      }
      case 'S': {
        this.state = { kind: 'writing', name: arg, remaining: 0, lengthBytes: [], data: [] }
        break
      }
      case 'F': {
        const names = Object.keys(files).sort()
        const listing =
          names.length === 0
            ? 'NO FILES\n'
            : names.map((name) => `${name} ${files[name].length}B`).join('\n') + '\n'
        this.state = { kind: 'reading', buffer: [...listing].map((c) => c.charCodeAt(0)), index: 0 }
        break
      }
      case 'D': {
        const existed = files[arg] !== undefined
        delete files[arg]
        this.saveFiles(files)
        this.state = { kind: 'reading', buffer: [existed ? 1 : 0], index: 0 }
        break
      }
      default:
        this.state = { kind: 'reading', buffer: [0], index: 0 }
    }
  }
}

export class TimerDevice {
  periodCycles = 0
  private accumulator = 0

  setPeriod(value: number): void {
    this.periodCycles = value === 0 ? 0 : value * 256
    this.accumulator = 0
  }

  advance(cycles: number): boolean {
    if (this.periodCycles === 0) return false
    this.accumulator += cycles
    if (this.accumulator >= this.periodCycles) {
      this.accumulator -= this.periodCycles
      return true
    }
    return false
  }
}

export class DeviceBus implements Devices {
  terminal: TerminalDevice
  disk: DiskDevice
  timer: TimerDevice
  display = 0

  constructor(terminal = new TerminalDevice(), disk = new DiskDevice(), timer = new TimerDevice()) {
    this.terminal = terminal
    this.disk = disk
    this.timer = timer
  }

  portRead(port: number): number {
    switch (port & 0xff) {
      case 0:
        return this.terminal.read()
      case 1:
        return this.terminal.status()
      case 2:
        return this.disk.read()
      case 5:
        return this.disk.ready()
      default:
        return 0
    }
  }

  portWrite(port: number, value: number): void {
    switch (port & 0xff) {
      case 0:
        this.terminal.write(value)
        break
      case 2:
        this.disk.write(value)
        break
      case 3:
        this.display = value & 0xff
        break
      case 4:
        this.timer.setPeriod(value & 0xff)
        break
    }
  }

  onCycles(count: number): boolean {
    this.terminal.advance(count)
    this.disk.advance(count)
    return this.timer.advance(count)
  }
}
