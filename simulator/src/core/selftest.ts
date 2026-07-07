const memoryStore = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memoryStore.set(key, value)
  },
  removeItem: (key: string) => {
    memoryStore.delete(key)
  },
}

import { assemble } from './asm'
import { EXAMPLES } from './examples'
import { MSAP2 } from './isa'
import { Machine } from './machine'
import MOS_ROM from '../rom/mos-rom.json'

export interface TestReport {
  passed: string[]
  failed: { name: string; reason: string }[]
}

function bootMachine(): Machine {
  const machine = new Machine()
  machine.loadRom(MOS_ROM)
  return machine
}

function run(machine: Machine, ticks: number): void {
  for (let i = 0; i < ticks && !machine.halted; i++) machine.tick()
}

function typeLine(machine: Machine, text: string): void {
  machine.devices.terminal.typeText(text)
  machine.devices.terminal.typeByte(13)
  run(machine, 600000)
}

const CASES: { name: string; run: () => void }[] = [
  {
    name: 'MOS ROM image is present and fits the 4KB ROM',
    run: () => {
      if (!Array.isArray(MOS_ROM) || MOS_ROM.length > 0x1000) throw new Error(`ROM image is ${MOS_ROM.length} entries`)
      if (MOS_ROM[0] !== 0x30) throw new Error('reset vector is not a JMP')
      const used = MOS_ROM.filter((b: number) => b !== 0).length
      if (used < 1000) throw new Error(`ROM suspiciously empty: ${used} nonzero bytes`)
    },
  },
  {
    name: 'microcode: instructions take their real T-state counts',
    run: () => {
      const source = '.org 0x1000\n nop\n lda #5\n lda 0x1EF0\n jmp next\nnext: hlt\n'
      const assembled = assemble(source, MSAP2)
      if (!assembled.ok) throw new Error(assembled.error.message)
      const machine = new Machine()
      machine.loadRom(MOS_ROM)
      machine.mergeImage(assembled.result.image)
      machine.pc = 0x1000
      const counts: number[] = []
      for (let i = 0; i < 5; i++) {
        const before = machine.cycle
        machine.tick()
        counts.push(machine.cycle - before)
      }
      const want = [3, 5, 9, 7, 3]
      for (let i = 0; i < want.length; i++) {
        if (counts[i] !== want[i]) throw new Error(`instruction ${i}: ${counts[i]} T, want ${want[i]} (all: ${counts.join(',')})`)
      }
    },
  },
  {
    name: 'ROM is write-protected',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      typeLine(machine, 'E 10 EA EA')
      if (machine.rom[0x10] === 0xea) throw new Error('E command overwrote ROM')
      if (machine.readMem(0x10) !== MOS_ROM[0x10]) throw new Error('ROM content changed')
    },
  },
  {
    name: 'MOS boots and prints the banner + prompt',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      const out = machine.devices.terminal.output
      if (!out.includes('MOS 1.1')) throw new Error(`no banner in: ${JSON.stringify(out.slice(0, 80))}`)
      if (!out.includes('> ')) throw new Error('no prompt')
    },
  },
  {
    name: 'H prints help',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      typeLine(machine, 'H')
      const out = machine.devices.terminal.output
      if (!out.includes('DUMP 32 BYTES')) throw new Error(`help missing: ${JSON.stringify(out.slice(-160))}`)
      if (!out.includes('ASSEMBLE')) throw new Error('help missing the assembler')
    },
  },
  {
    name: 'E enters bytes and D dumps them back',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      typeLine(machine, 'E 1000 DE AD BE EF')
      typeLine(machine, 'D 1000')
      const out = machine.devices.terminal.output
      const dumpBody = out.slice(out.lastIndexOf('D 1000'))
      if (!dumpBody.includes('DE AD BE EF')) throw new Error(`dump missing bytes: ${JSON.stringify(out.slice(-220))}`)
      if (!out.trimEnd().endsWith('>')) throw new Error('dump did not return to prompt')
      if (machine.ram[0x1000] !== 0xde || machine.ram[0x1003] !== 0xef) throw new Error('bytes not in RAM')
    },
  },
  {
    name: 'R runs an entered program and prints the registers on RTS',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      typeLine(machine, 'E 1000 10 2A 17 07 04')
      typeLine(machine, 'R 1000')
      const out = machine.devices.terminal.output
      if (!out.includes('A=2A')) throw new Error(`missing A register dump: ${JSON.stringify(out.slice(-80))}`)
      if (!out.includes('X=07')) throw new Error(`missing X register dump: ${JSON.stringify(out.slice(-80))}`)
      if (!out.trimEnd().endsWith('>')) throw new Error('did not return to prompt')
    },
  },
  {
    name: 'A assembles typed source line by line and R runs it',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      typeLine(machine, 'A 1000')
      typeLine(machine, 'lda #48')
      typeLine(machine, 'add #1')
      typeLine(machine, 'jsr 10')
      typeLine(machine, 'lda #21')
      typeLine(machine, 'jsr 10')
      typeLine(machine, 'rts')
      typeLine(machine, '')
      const out = machine.devices.terminal.output
      if (!out.includes('1000: ')) throw new Error(`no assembler prompt: ${JSON.stringify(out.slice(-200))}`)
      if (!out.trimEnd().endsWith('>')) throw new Error('empty line did not exit assemble mode')
      const expected = [0x10, 0x48, 0x20, 0x01, 0x31, 0x10, 0x00, 0x10, 0x21, 0x31, 0x10, 0x00, 0x04]
      for (let i = 0; i < expected.length; i++) {
        if (machine.ram[0x1000 + i] !== expected[i])
          throw new Error(`byte ${i}: got ${machine.ram[0x1000 + i].toString(16)}, want ${expected[i].toString(16)}`)
      }
      typeLine(machine, 'R 1000')
      if (!machine.devices.terminal.output.includes('I!')) throw new Error('assembled program did not print I!')
    },
  },
  {
    name: 'A handles every addressing mode',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      typeLine(machine, 'A 1000')
      typeLine(machine, 'ldx #2')
      typeLine(machine, 'lda 1010,x')
      typeLine(machine, 'sta (1F00)')
      typeLine(machine, 'out #3')
      typeLine(machine, 'brk')
      typeLine(machine, '')
      const expected = [0x17, 0x02, 0x13, 0x10, 0x10, 0x15, 0x00, 0x1f, 0x41, 0x03, 0x37]
      for (let i = 0; i < expected.length; i++) {
        if (machine.ram[0x1000 + i] !== expected[i])
          throw new Error(`byte ${i}: got ${machine.ram[0x1000 + i].toString(16)}, want ${expected[i].toString(16)}`)
      }
    },
  },
  {
    name: 'A rejects garbage with ? and keeps the address',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      typeLine(machine, 'A 1000')
      typeLine(machine, 'zzz')
      typeLine(machine, 'nop')
      typeLine(machine, '')
      const out = machine.devices.terminal.output
      if (!out.includes('?')) throw new Error('no ? for a bad mnemonic')
      const prompts = out.split('1000: ').length - 1
      if (prompts < 2) throw new Error('address advanced past the failed line')
      if (machine.ram[0x1000] !== 0x00) throw new Error('NOP not emitted after the error')
    },
  },
  {
    name: 'BRK breaks into the monitor with a register dump',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      typeLine(machine, 'E 1000 10 5A 17 03 37')
      typeLine(machine, 'R 1000')
      const out = machine.devices.terminal.output
      if (!out.includes('BRK @1005')) throw new Error(`missing BRK report: ${JSON.stringify(out.slice(-120))}`)
      if (!out.includes('A=5A') || !out.includes('X=03')) throw new Error('BRK register dump wrong')
      if (!out.trimEnd().endsWith('>')) throw new Error('BRK did not return to the prompt')
    },
  },
  {
    name: 'disk boots seeded with the example programs',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      typeLine(machine, 'F')
      const out = machine.devices.terminal.output
      for (const name of ['HELLO', 'ECHO', 'SHOUT', 'TICKS']) {
        if (!out.includes(name)) throw new Error(`seeded listing missing ${name}: ${JSON.stringify(out.slice(-200))}`)
      }
      typeLine(machine, 'L HELLO')
      run(machine, 600000)
      typeLine(machine, 'R 1000')
      if (!machine.devices.terminal.output.includes('HELLO FROM MSAP-2!'))
        throw new Error(`L HELLO + R 1000 failed: ${JSON.stringify(machine.devices.terminal.output.slice(-120))}`)
      machine.devices.terminal.typeText('R TICKS')
      machine.devices.terminal.typeByte(13)
      run(machine, 600000)
      if (machine.devices.display === 0) throw new Error('seeded R TICKS never ticked the display')
      machine.devices.terminal.typeByte(32)
      run(machine, 600000)
      if (!machine.devices.terminal.output.trimEnd().endsWith('>')) throw new Error('R TICKS did not return to MOS')
    },
  },
  {
    name: 'R NAME loads from disk and runs (R SHOUT, R ECHO, bare R)',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      typeLine(machine, 'R SHOUT')
      if (!machine.devices.terminal.output.includes('SAY SOMETHING: '))
        throw new Error(`R SHOUT missing prompt: ${JSON.stringify(machine.devices.terminal.output.slice(-120))}`)
      typeLine(machine, 'abc')
      if (!machine.devices.terminal.output.includes('ABC')) throw new Error('R SHOUT output wrong')
      typeLine(machine, 'R ECHO')
      machine.devices.terminal.typeText('hi')
      run(machine, 400000)
      machine.devices.terminal.typeByte(27)
      run(machine, 400000)
      const out = machine.devices.terminal.output
      if (!out.slice(out.lastIndexOf('R ECHO')).includes('hi')) throw new Error('R ECHO (hex-prefix name) did not run')
      typeLine(machine, 'L HELLO')
      typeLine(machine, 'R')
      if (!machine.devices.terminal.output.includes('HELLO FROM MSAP-2!')) throw new Error('bare R did not run at USER')
      typeLine(machine, 'R NOPE')
      if (!machine.devices.terminal.output.includes('NOT FOUND')) throw new Error('R NOPE missing NOT FOUND')
    },
  },
  {
    name: 'Hello example assembles, merges, and runs under MOS',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      const example = EXAMPLES.find((e) => e.name === 'Hello')!
      const assembled = assemble(example.source, MSAP2)
      if (!assembled.ok) throw new Error(assembled.error.message)
      machine.mergeImage(assembled.result.image)
      typeLine(machine, 'R 1000')
      if (!machine.devices.terminal.output.includes('HELLO FROM MSAP-2!'))
        throw new Error(`missing hello: ${JSON.stringify(machine.devices.terminal.output.slice(-120))}`)
    },
  },
  {
    name: 'Shout example uppercases a typed line',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      const example = EXAMPLES.find((e) => e.name === 'Shout')!
      const assembled = assemble(example.source, MSAP2)
      if (!assembled.ok) throw new Error(assembled.error.message)
      machine.mergeImage(assembled.result.image)
      typeLine(machine, 'R 1000')
      if (!machine.devices.terminal.output.includes('SAY SOMETHING: '))
        throw new Error(`missing prompt: ${JSON.stringify(machine.devices.terminal.output.slice(-120))}`)
      typeLine(machine, 'hello world')
      if (!machine.devices.terminal.output.includes('HELLO WORLD'))
        throw new Error(`missing shout: ${JSON.stringify(machine.devices.terminal.output.slice(-120))}`)
    },
  },
  {
    name: 'Echo example echoes keys until ESC',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      typeLine(machine, 'L ECHO')
      run(machine, 400000)
      typeLine(machine, 'R 1000')
      machine.devices.terminal.typeText('abc')
      run(machine, 400000)
      const out = machine.devices.terminal.output
      if (!out.slice(out.lastIndexOf('R 1000')).includes('abc'))
        throw new Error(`echo missing: ${JSON.stringify(out.slice(-80))}`)
      machine.devices.terminal.typeByte(27)
      run(machine, 400000)
      if (!machine.devices.terminal.output.trimEnd().endsWith('>')) throw new Error('ESC did not return to MOS')
    },
  },
  {
    name: 'S saves, F lists, X deletes, L loads a file',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      typeLine(machine, 'E 1000 12 34 56 78')
      typeLine(machine, 'S PROG 1000 4')
      if (!machine.devices.terminal.output.includes('OK')) throw new Error('save not OK')
      typeLine(machine, 'F')
      if (!machine.devices.terminal.output.includes('PROG 4B'))
        throw new Error(`listing: ${JSON.stringify(machine.devices.terminal.output.slice(-160))}`)
      typeLine(machine, 'L PROG 1800')
      run(machine, 200000)
      if (machine.ram[0x1800] !== 0x12 || machine.ram[0x1803] !== 0x78) throw new Error('load bytes wrong')
      typeLine(machine, 'X PROG')
      typeLine(machine, 'F')
      const listing = machine.devices.terminal.output.slice(machine.devices.terminal.output.lastIndexOf('F'))
      if (listing.includes('PROG')) throw new Error('delete failed')
    },
  },
  {
    name: 'L for a missing file reports NOT FOUND',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      typeLine(machine, 'L NOPE')
      if (!machine.devices.terminal.output.includes('NOT FOUND')) throw new Error('missing NOT FOUND')
    },
  },
  {
    name: 'Ticks example: timer interrupt drives the display',
    run: () => {
      const machine = bootMachine()
      run(machine, 200000)
      const example = EXAMPLES.find((e) => e.name === 'Ticks')!
      const assembled = assemble(example.source, MSAP2)
      if (!assembled.ok) throw new Error(assembled.error.message)
      machine.mergeImage(assembled.result.image)
      machine.devices.terminal.typeText('R 1000')
      machine.devices.terminal.typeByte(13)
      run(machine, 60000)
      if (machine.devices.display === 0) throw new Error('display never ticked')
      machine.devices.terminal.typeByte(32)
      run(machine, 200000)
      const out = machine.devices.terminal.output
      if (!out.trimEnd().endsWith('>')) throw new Error('did not return to MOS')
    },
  },
  {
    name: 'ED: write a labeled program, assemble to disk, run it',
    run: () => {
      const machine = bootMachine()
      run(machine, 400000)
      typeLine(machine, 'R EDIT')
      if (!machine.devices.terminal.output.includes('ED 1.0')) throw new Error('ED did not start')
      typeLine(machine, '10 ldx #0')
      typeLine(machine, '20 top: txa')
      typeLine(machine, '30 add #30')
      typeLine(machine, '40 jsr 10')
      typeLine(machine, '50 inx')
      typeLine(machine, '60 cpx #5')
      typeLine(machine, '70 jnz top')
      typeLine(machine, '80 rts')
      typeLine(machine, '.a count')
      if (!machine.devices.terminal.output.includes('OK')) throw new Error(`assemble failed: ${JSON.stringify(machine.devices.terminal.output.slice(-120))}`)
      typeLine(machine, '.q')
      typeLine(machine, 'R COUNT')
      const out = machine.devices.terminal.output
      if (!out.includes('01234')) throw new Error(`program output wrong: ${JSON.stringify(out.slice(-120))}`)
    },
  },
  {
    name: 'ED: source save/open roundtrip, line replace and delete',
    run: () => {
      const machine = bootMachine()
      run(machine, 400000)
      typeLine(machine, 'R EDIT')
      typeLine(machine, '10 lda #41')
      typeLine(machine, '20 rts')
      typeLine(machine, '.s src')
      if (!machine.devices.terminal.output.includes('OK')) throw new Error('source save failed')
      typeLine(machine, '.q')
      typeLine(machine, 'R EDIT')
      typeLine(machine, '.o src')
      typeLine(machine, '10 lda #42')
      typeLine(machine, '15 brk')
      typeLine(machine, '15')
      typeLine(machine, '.l')
      const out = machine.devices.terminal.output
      const listing = out.slice(out.lastIndexOf('.l'))
      if (!listing.includes('0010 lda #42')) throw new Error(`replace missing: ${JSON.stringify(listing.slice(0, 120))}`)
      if (!listing.includes('0020 rts')) throw new Error('loaded line missing')
      if (listing.includes('brk')) throw new Error('deleted line still listed')
      typeLine(machine, '.q')
    },
  },
  {
    name: 'ED: assembly errors report the line and abort cleanly',
    run: () => {
      const machine = bootMachine()
      run(machine, 400000)
      typeLine(machine, 'R EDIT')
      typeLine(machine, '10 lda #41')
      typeLine(machine, '20 fnord')
      typeLine(machine, '.a bad')
      const out = machine.devices.terminal.output
      if (!out.includes('ERR @0020')) throw new Error(`missing line error: ${JSON.stringify(out.slice(-100))}`)
      typeLine(machine, '.q')
      typeLine(machine, 'F')
      const listing = machine.devices.terminal.output
      if (listing.slice(listing.lastIndexOf('F')).includes('BAD')) throw new Error('failed assembly left a file')
    },
  },
  {
    name: 'stack: JSR/RTS nest, PHA/PLA balance, TXS resets',
    run: () => {
      const source = `
.org 0x1000
        ldx #0xF0
        txs
        lda #1
        pha
        lda #2
        jsr sub1
        pla
        out #3
        hlt
sub1:   pha
        jsr sub2
        pla
        rts
sub2:   rts
`
      const assembled = assemble(source, MSAP2)
      if (!assembled.ok) throw new Error(assembled.error.message)
      const machine = new Machine()
      machine.mergeImage(assembled.result.image)
      machine.pc = 0x1000
      run(machine, 1000)
      if (!machine.halted) throw new Error('did not halt')
      if (machine.devices.display !== 1) throw new Error(`display ${machine.devices.display}, want 1 (stack imbalance)`)
      if (machine.sp !== 0xf0) throw new Error(`sp ${machine.sp.toString(16)}, want 0xF0`)
    },
  },
  {
    name: 'indirect and indexed addressing work',
    run: () => {
      const source = `
.org 0x1000
        ldx #2
        lda table,x
        sta result
        lda (vec)
        add result
        out #3
        hlt
table:  .byte 5, 6, 7, 8
vec:    .word target
target: .byte 30
result: .byte 0
`
      const assembled = assemble(source, MSAP2)
      if (!assembled.ok) throw new Error(assembled.error.message)
      const machine = new Machine()
      machine.mergeImage(assembled.result.image)
      machine.pc = 0x1000
      run(machine, 1000)
      if (machine.devices.display !== 37) throw new Error(`display ${machine.devices.display}, want 37`)
    },
  },
]

export function runSelfTest(): TestReport {
  const report: TestReport = { passed: [], failed: [] }
  for (const testCase of CASES) {
    memoryStore.clear()
    try {
      testCase.run()
      report.passed.push(testCase.name)
    } catch (e) {
      report.failed.push({ name: testCase.name, reason: e instanceof Error ? e.message : String(e) })
    }
  }
  return report
}
