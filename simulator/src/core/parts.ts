export type PackageName = 'DIP-8' | 'DIP-14' | 'DIP-16' | 'DIP-20' | 'DIP-24W' | 'DIP-28W' | 'TO-92' | 'TO-220'

export interface PartSpec {
  value: string
  family: 'HC' | 'LS' | 'NMOS' | 'CMOS' | 'analog' | 'discrete'
  package: PackageName
  pins: number
  vccMinV?: number
  vccMaxV?: number
  vccPin?: number
  gndPin?: number
  iccTypMa: number
  iccMaxMa: number
  vihV?: number
  vilV?: number
  vohV?: number
  volV?: number
  inputImpedance: string
  outputDriveMa?: number
  tpdNs?: number
  cpdPf?: number
  description: string
}

export const PARTS: Record<string, PartSpec> = {
  'LM555': {
    value: 'LM555', vccMinV: 4.5, vccMaxV: 16, family: 'analog', package: 'DIP-8', pins: 8, vccPin: 8, gndPin: 1,
    iccTypMa: 3, iccMaxMa: 6, inputImpedance: 'TRIG/THR ~10^10 Ohm', tpdNs: 100,
    description: 'Timer, astable clock oscillator',
  },
  '74HC00': {
    value: '74HC00', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 9, cpdPf: 22,
    description: 'Quad 2-input NAND',
  },
  '74HC02': {
    value: '74HC02', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 9, cpdPf: 22,
    description: 'Quad 2-input NOR',
  },
  '74HC04': {
    value: '74HC04', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 8, cpdPf: 21,
    description: 'Hex inverter',
  },
  '74HC08': {
    value: '74HC08', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 10, cpdPf: 20,
    description: 'Quad 2-input AND',
  },
  '74HC14': {
    value: '74HC14', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 2.7, vilV: 1.6, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm, 0.9V typ hysteresis', outputDriveMa: 5.2, tpdNs: 12, cpdPf: 28,
    description: 'Hex Schmitt-trigger inverter (switch debounce)',
  },
  '74LS32': {
    value: '74LS32', vccMinV: 4.75, vccMaxV: 5.25, family: 'LS', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 4.9, iccMaxMa: 9.8, vihV: 2.0, vilV: 0.8, vohV: 3.4, volV: 0.35,
    inputImpedance: 'IIL 0.4mA @ 0.4V (LS input)', outputDriveMa: 8, tpdNs: 14,
    description: 'Quad 2-input OR',
  },
  '74HC86': {
    value: '74HC86', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 11, cpdPf: 30,
    description: "Quad XOR (two's complement for subtraction)",
  },
  '74HC107': {
    value: '74HC107', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 0.002, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 16, cpdPf: 24,
    description: 'Dual JK flip-flop (opcode latch, display scan)',
  },
  '74HC138': {
    value: '74HC138', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.002, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 20, cpdPf: 32,
    description: '3-to-8 line decoder (microstep decode, IR toggle)',
  },
  '74HC157': {
    value: '74HC157', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.002, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 14, cpdPf: 28,
    description: 'Quad 2-input multiplexer (address source select)',
  },
  '74LS157': {
    value: '74LS157', vccMinV: 4.75, vccMaxV: 5.25, family: 'LS', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 9.7, iccMaxMa: 16, vihV: 2.0, vilV: 0.8, vohV: 3.4, volV: 0.35,
    inputImpedance: 'IIL 0.4mA @ 0.4V (LS input)', outputDriveMa: 8, tpdNs: 14,
    description: 'Quad 2-input multiplexer (RAM data mux; deliberately LS so power gating works - CMOS would back-power through ESD diodes)',
  },
  '74HC161': {
    value: '74HC161', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.004, iccMaxMa: 0.08, vihV: 3.5, vilV: 1.5,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 20, cpdPf: 33,
    description: '4-bit presettable binary counter (PC, microstep, IR toggle)',
  },
  '74HC173': {
    value: '74HC173', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.004, iccMaxMa: 0.08, vihV: 3.5, vilV: 1.5,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 17, cpdPf: 30,
    description: '4-bit D register with tri-state outputs',
  },
  '74HC245': {
    value: '74HC245', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-20', pins: 20, vccPin: 20, gndPin: 10,
    iccTypMa: 0.004, iccMaxMa: 0.08, vihV: 3.5, vilV: 1.5,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 7.8, tpdNs: 12, cpdPf: 40,
    description: 'Octal bus transceiver (module-to-bus interface)',
  },
  '74LS283': {
    value: '74LS283', vccMinV: 4.75, vccMaxV: 5.25, family: 'LS', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 22, iccMaxMa: 39, vihV: 2.0, vilV: 0.8, vohV: 3.4, volV: 0.35,
    inputImpedance: 'IIL 0.4mA @ 0.4V (LS input)', outputDriveMa: 8, tpdNs: 24,
    description: '4-bit full adder with fast carry',
  },
  'HM6116P': {
    value: 'HM6116P', vccMinV: 4.5, vccMaxV: 5.5, family: 'CMOS', package: 'DIP-24W', pins: 24, vccPin: 24, gndPin: 12,
    iccTypMa: 15, iccMaxMa: 35, vihV: 2.2, vilV: 0.8,
    inputImpedance: '~10^12 Ohm (CMOS), I/O tri-state', tpdNs: 120,
    description: '2K x 8 static RAM (256 bytes used; A8-A10 reserved for the MSAP-2 MMU)',
  },
  '74HC283': {
    value: '74HC283', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.008, iccMaxMa: 0.16, vihV: 3.5, vilV: 1.5,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 20, cpdPf: 60,
    description: '4-bit binary full adder with fast carry',
  },
  'AT28C64': {
    value: 'AT28C64', vccMinV: 4.5, vccMaxV: 5.5, family: 'CMOS', package: 'DIP-28W', pins: 28, vccPin: 28, gndPin: 14,
    iccTypMa: 15, iccMaxMa: 40, vihV: 2.0, vilV: 0.8,
    inputImpedance: '~10^12 Ohm (CMOS)', tpdNs: 150,
    description: '8K x 8 EEPROM - the MOS ROM (4KB used at 0x0000-0x0FFF)',
  },
  '74HC181': {
    value: '74HC181', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-24W', pins: 24, vccPin: 24, gndPin: 12,
    iccTypMa: 0.008, iccMaxMa: 0.16, vihV: 3.5, vilV: 1.5,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 25, cpdPf: 90,
    description: '4-bit ALU slice: 16 arithmetic + 16 logic functions with carry',
  },
  'AT28C16': {
    value: 'AT28C16', vccMinV: 4.5, vccMaxV: 5.5, family: 'CMOS', package: 'DIP-24W', pins: 24, vccPin: 24, gndPin: 12,
    iccTypMa: 15, iccMaxMa: 40, vihV: 2.0, vilV: 0.8,
    inputImpedance: '~10^12 Ohm (CMOS)', tpdNs: 150,
    description: '2K x 8 EEPROM (microcode / 7-segment decode)',
  },
  '2N2222A': {
    value: '2N2222A', family: 'discrete', package: 'TO-92', pins: 3,
    iccTypMa: 0, iccMaxMa: 0, inputImpedance: 'hFE 100-300, Vbe 0.7V',
    description: 'NPN BJT, buffers the RC write-pulse edge for RAM WE',
  },
  '2N3906': {
    value: '2N3906', family: 'discrete', package: 'TO-92', pins: 3,
    iccTypMa: 0, iccMaxMa: 0, inputImpedance: 'hFE 100-300, Vbe -0.7V',
    description: 'PNP BJT, gates the IR toggle counter clock from II',
  },
  'MC6850': {
    value: 'MC6850', vccMinV: 4.75, vccMaxV: 5.25, family: 'NMOS', package: 'DIP-24W', pins: 24, vccPin: 12, gndPin: 1,
    iccTypMa: 35, iccMaxMa: 60, vihV: 2.0, vilV: 0.8,
    inputImpedance: 'NMOS gate inputs, bus tri-state', tpdNs: 400,
    description: 'ACIA - asynchronous serial interface for the terminal',
  },
  'IRF9540N': {
    value: 'IRF9540N', family: 'discrete', package: 'TO-220', pins: 3,
    iccTypMa: 0, iccMaxMa: 0, inputImpedance: 'Vgs(th) -2..-4V, Rds(on) 0.117 Ohm',
    description: 'P-channel MOSFET, power-gates the LS157 RAM input muxes',
  },
  '74HC10': {
    value: '74HC10', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 10, cpdPf: 22,
    description: 'Triple 3-input NAND',
  },
  '74HC27': {
    value: '74HC27', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 10, cpdPf: 22,
    description: 'Triple 3-input NOR',
  },
  '74HC32': {
    value: '74HC32', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 11, cpdPf: 22,
    description: 'Quad 2-input OR',
  },
  '74HC74': {
    value: '74HC74', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 18, cpdPf: 24,
    description: 'Dual D flip-flop with set/reset',
  },
  '74HC125': {
    value: '74HC125', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 12, cpdPf: 25,
    description: 'Quad tri-state buffer, active-low enable',
  },
  '74HC126': {
    value: '74HC126', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 12, cpdPf: 25,
    description: 'Quad tri-state buffer, active-high enable',
  },
  '74HC132': {
    value: '74HC132', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 15, cpdPf: 26,
    description: 'Quad 2-input NAND, Schmitt inputs',
  },
  '74HC109': {
    value: '74HC109', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 18, cpdPf: 24,
    description: 'Dual JK flip-flop with set/reset',
  },
  '74HC139': {
    value: '74HC139', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 16, cpdPf: 30,
    description: 'Dual 2-to-4 line decoder',
  },
  '74HC151': {
    value: '74HC151', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 20, cpdPf: 32,
    description: '8-input multiplexer',
  },
  '74HC153': {
    value: '74HC153', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 16, cpdPf: 30,
    description: 'Dual 4-input multiplexer',
  },
  '74HC163': {
    value: '74HC163', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.004, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 20, cpdPf: 33,
    description: '4-bit synchronous counter, sync reset',
  },
  '74HC164': {
    value: '74HC164', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 0.004, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 17, cpdPf: 30,
    description: '8-bit serial-in parallel-out shift register',
  },
  '74HC165': {
    value: '74HC165', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.004, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 18, cpdPf: 30,
    description: '8-bit parallel-in serial-out shift register',
  },
  '74HC174': {
    value: '74HC174', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.004, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 16, cpdPf: 30,
    description: 'Hex D flip-flop with common clear',
  },
  '74HC175': {
    value: '74HC175', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.004, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 16, cpdPf: 28,
    description: 'Quad D flip-flop with common clear',
  },
  '74HC193': {
    value: '74HC193', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.004, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 21, cpdPf: 34,
    description: '4-bit up/down counter, dual clock',
  },
  '74HC194': {
    value: '74HC194', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.004, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 18, cpdPf: 32,
    description: '4-bit bidirectional universal shift register',
  },
  '74HC221': {
    value: '74HC221', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 30, cpdPf: 30,
    description: 'Dual monostable multivibrator',
  },
  '74HC251': {
    value: '74HC251', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 20, cpdPf: 32,
    description: '8-input multiplexer, tri-state',
  },
  '74HC253': {
    value: '74HC253', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 16, cpdPf: 30,
    description: 'Dual 4-input multiplexer, tri-state',
  },
  '74HC257': {
    value: '74HC257', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 14, cpdPf: 28,
    description: 'Quad 2-input multiplexer, tri-state',
  },
  '74HC259': {
    value: '74HC259', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 18, cpdPf: 32,
    description: '8-bit addressable latch',
  },
  '74HC595': {
    value: '74HC595', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-16', pins: 16, vccPin: 16, gndPin: 8,
    iccTypMa: 0.004, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 18, cpdPf: 32,
    description: '8-bit shift register with output latch (the programmer uses these)',
  },
  '74HC688': {
    value: '74HC688', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-20', pins: 20, vccPin: 20, gndPin: 10,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 22, cpdPf: 36,
    description: '8-bit identity comparator (address decode for the MMU)',
  },
  '74HC240': {
    value: '74HC240', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-20', pins: 20, vccPin: 20, gndPin: 10,
    iccTypMa: 0.004, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 12, cpdPf: 38,
    description: 'Octal inverting buffer, tri-state',
  },
  '74HC244': {
    value: '74HC244', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-20', pins: 20, vccPin: 20, gndPin: 10,
    iccTypMa: 0.004, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 12, cpdPf: 38,
    description: 'Octal buffer, tri-state',
  },
  '74HC273': {
    value: '74HC273', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-20', pins: 20, vccPin: 20, gndPin: 10,
    iccTypMa: 0.004, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 17, cpdPf: 40,
    description: 'Octal D flip-flop with clear',
  },
  '74HC373': {
    value: '74HC373', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-20', pins: 20, vccPin: 20, gndPin: 10,
    iccTypMa: 0.004, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 15, cpdPf: 40,
    description: 'Octal transparent latch, tri-state',
  },
  '74HC374': {
    value: '74HC374', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-20', pins: 20, vccPin: 20, gndPin: 10,
    iccTypMa: 0.004, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 16, cpdPf: 40,
    description: 'Octal D flip-flop, tri-state',
  },
  '74HC541': {
    value: '74HC541', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-20', pins: 20, vccPin: 20, gndPin: 10,
    iccTypMa: 0.004, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 13, cpdPf: 38,
    description: 'Octal buffer, tri-state, flow-through pinout',
  },
  '74HC573': {
    value: '74HC573', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-20', pins: 20, vccPin: 20, gndPin: 10,
    iccTypMa: 0.004, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 15, cpdPf: 40,
    description: 'Octal transparent latch, flow-through pinout',
  },
  '74HC574': {
    value: '74HC574', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-20', pins: 20, vccPin: 20, gndPin: 10,
    iccTypMa: 0.004, iccMaxMa: 0.04, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 16, cpdPf: 40,
    description: 'Octal D flip-flop, flow-through pinout',
  },
  '74HC154': {
    value: '74HC154', vccMinV: 2, vccMaxV: 6, family: 'HC', package: 'DIP-24W', pins: 24, vccPin: 24, gndPin: 12,
    iccTypMa: 0.002, iccMaxMa: 0.02, vihV: 3.5, vilV: 1.5, vohV: 4.9, volV: 0.1,
    inputImpedance: '~10^12 Ohm (CMOS gate)', outputDriveMa: 5.2, tpdNs: 24, cpdPf: 40,
    description: '4-to-16 line decoder',
  },
  '74LS00': {
    value: '74LS00', vccMinV: 4.75, vccMaxV: 5.25, family: 'LS', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 1.6, iccMaxMa: 3.2, vihV: 2.0, vilV: 0.8, vohV: 3.4, volV: 0.35,
    inputImpedance: 'IIL 0.4mA @ 0.4V (LS input)', outputDriveMa: 8, tpdNs: 10,
    description: 'Quad 2-input NAND',
  },
  '74LS04': {
    value: '74LS04', vccMinV: 4.75, vccMaxV: 5.25, family: 'LS', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 2.4, iccMaxMa: 4.8, vihV: 2.0, vilV: 0.8, vohV: 3.4, volV: 0.35,
    inputImpedance: 'IIL 0.4mA @ 0.4V (LS input)', outputDriveMa: 8, tpdNs: 10,
    description: 'Hex inverter',
  },
  '74LS08': {
    value: '74LS08', vccMinV: 4.75, vccMaxV: 5.25, family: 'LS', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 4.4, iccMaxMa: 8.8, vihV: 2.0, vilV: 0.8, vohV: 3.4, volV: 0.35,
    inputImpedance: 'IIL 0.4mA @ 0.4V (LS input)', outputDriveMa: 8, tpdNs: 12,
    description: 'Quad 2-input AND',
  },
  '74LS181': {
    value: '74LS181', vccMinV: 4.75, vccMaxV: 5.25, family: 'LS', package: 'DIP-24W', pins: 24, vccPin: 24, gndPin: 12,
    iccTypMa: 37, iccMaxMa: 74, vihV: 2.0, vilV: 0.8, vohV: 3.4, volV: 0.35,
    inputImpedance: 'IIL 0.4mA @ 0.4V (LS input)', outputDriveMa: 8, tpdNs: 24,
    description: '4-bit ALU, 16 logic/16 arithmetic functions',
  },
  '74LS245': {
    value: '74LS245', vccMinV: 4.75, vccMaxV: 5.25, family: 'LS', package: 'DIP-20', pins: 20, vccPin: 20, gndPin: 10,
    iccTypMa: 40, iccMaxMa: 80, vihV: 2.0, vilV: 0.8, vohV: 3.4, volV: 0.35,
    inputImpedance: 'IIL 0.4mA @ 0.4V (LS input)', outputDriveMa: 8, tpdNs: 12,
    description: 'Octal bus transceiver',
  },
  'HM6264': {
    value: 'HM6264', vccMinV: 4.5, vccMaxV: 5.5, family: 'CMOS', package: 'DIP-28W', pins: 28, vccPin: 28, gndPin: 14,
    iccTypMa: 8, iccMaxMa: 40, vihV: 2.2, vilV: 0.8,
    inputImpedance: '~10^12 Ohm (CMOS), I/O tri-state', tpdNs: 100,
    description: '8K x 8 static RAM',
  },
  '62256': {
    value: '62256', vccMinV: 4.5, vccMaxV: 5.5, family: 'CMOS', package: 'DIP-28W', pins: 28, vccPin: 28, gndPin: 14,
    iccTypMa: 10, iccMaxMa: 50, vihV: 2.2, vilV: 0.8,
    inputImpedance: '~10^12 Ohm (CMOS), I/O tri-state', tpdNs: 85,
    description: '32K x 8 static RAM',
  },
  'AT28C64B': {
    value: 'AT28C64B', vccMinV: 4.5, vccMaxV: 5.5, family: 'CMOS', package: 'DIP-28W', pins: 28, vccPin: 28, gndPin: 14,
    iccTypMa: 12, iccMaxMa: 30, vihV: 2.2, vilV: 0.8,
    inputImpedance: '~10^12 Ohm (CMOS), I/O tri-state', tpdNs: 150,
    description: '8K x 8 EEPROM',
  },
  'AT28C256': {
    value: 'AT28C256', vccMinV: 4.5, vccMaxV: 5.5, family: 'CMOS', package: 'DIP-28W', pins: 28, vccPin: 28, gndPin: 14,
    iccTypMa: 15, iccMaxMa: 50, vihV: 2.2, vilV: 0.8,
    inputImpedance: '~10^12 Ohm (CMOS), I/O tri-state', tpdNs: 150,
    description: '32K x 8 EEPROM',
  },
  'LM358': {
    value: 'LM358', vccMinV: 3, vccMaxV: 32, family: 'analog', package: 'DIP-8', pins: 8, vccPin: 8, gndPin: 4,
    iccTypMa: 0.7, iccMaxMa: 1.2, inputImpedance: 'JFET-ish bipolar inputs, ~2MOhm',
    tpdNs: 1000, description: 'Dual op-amp, single-supply',
  },
  'LM393': {
    value: 'LM393', vccMinV: 2, vccMaxV: 36, family: 'analog', package: 'DIP-8', pins: 8, vccPin: 8, gndPin: 4,
    iccTypMa: 0.8, iccMaxMa: 2.5, inputImpedance: 'Bipolar inputs, open-collector out',
    tpdNs: 1300, description: 'Dual comparator, open-collector outputs',
  },
  'NE556': {
    value: 'NE556', vccMinV: 4.5, vccMaxV: 16, family: 'analog', package: 'DIP-14', pins: 14, vccPin: 14, gndPin: 7,
    iccTypMa: 6, iccMaxMa: 12, inputImpedance: 'TRIG/THR ~10^10 Ohm',
    tpdNs: 100, description: 'Dual 555 timer',
  },
  '2N3904': {
    value: '2N3904', family: 'discrete', package: 'TO-92', pins: 3,
    iccTypMa: 0, iccMaxMa: 0, inputImpedance: 'hFE 100-300, Vbe 0.7V',
    description: 'NPN BJT, general purpose',
  },
  'BC547': {
    value: 'BC547', family: 'discrete', package: 'TO-92', pins: 3,
    iccTypMa: 0, iccMaxMa: 0, inputImpedance: 'hFE 110-450, Vbe 0.7V',
    description: 'NPN BJT, low noise general purpose',
  },
  'TIP120': {
    value: 'TIP120', family: 'discrete', package: 'TO-220', pins: 3,
    iccTypMa: 0, iccMaxMa: 0, inputImpedance: 'Darlington hFE >1000, Vbe ~1.4V',
    description: 'NPN Darlington power transistor',
  },
  'IRF540N': {
    value: 'IRF540N', family: 'discrete', package: 'TO-220', pins: 3,
    iccTypMa: 0, iccMaxMa: 0, inputImpedance: 'Vgs(th) 2-4V, Rds(on) 44 mOhm',
    description: 'N-channel power MOSFET',
  },
  'IRLZ44N': {
    value: 'IRLZ44N', family: 'discrete', package: 'TO-220', pins: 3,
    iccTypMa: 0, iccMaxMa: 0, inputImpedance: 'Vgs(th) 1-2V (logic level), Rds(on) 22 mOhm',
    description: 'N-channel logic-level MOSFET',
  },
}

export interface LedSpec {
  color: 'red' | 'yellow' | 'green' | 'blue'
  vfV: number
  seriesOhm: number
  currentMa: number
}

export function ledCurrentMa(color: LedSpec['color'], seriesOhm: number, vccV = 5): number {
  const vf = { red: 1.9, yellow: 2.0, green: 2.2, blue: 2.9 }[color]
  const driverOutputOhm = 55
  return Math.max(0, (vccV - vf) / (seriesOhm + driverOutputOhm)) * 1000
}

export function outputLevels(family: PartSpec['family'], vcc: number): { high: number; low: number } {
  if (family === 'LS') return { high: Math.min(3.4, Math.max(0, vcc - 1.4)), low: 0.35 }
  return { high: Math.max(0, vcc - 0.1), low: 0.1 }
}

export function partsOutOfSpec(partNames: string[], vcc: number): { part: string; range: string }[] {
  const seen = new Set<string>()
  const out: { part: string; range: string }[] = []
  for (const name of partNames) {
    if (seen.has(name)) continue
    seen.add(name)
    const spec = PARTS[name]
    if (!spec || spec.vccMinV === undefined) continue
    if (vcc < spec.vccMinV || vcc > (spec.vccMaxV ?? 99)) {
      out.push({ part: spec.value, range: `${spec.vccMinV}-${spec.vccMaxV}V` })
    }
  }
  return out
}
