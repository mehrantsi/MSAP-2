# MSAP-2

An 8-bit discrete-logic computer - the successor to [MSAP-1](https://github.com/mehrantsi/MSAP-1). Where MSAP-1 is a 256-byte SAP-1 derivative, MSAP-2 is a small but real computer: 8-bit variable-length opcodes driven by microcode in four 28C256 control ROMs, an 8KB address space split between a MOS operating-system ROM and user RAM, a hardware stack, vectored interrupts, a serial console, and an SD-card disk - programmable and usable entirely from its own terminal.

| | |
|---|---|
| Datapath | A, X (up/down counters), SP, 13-bit PC, hidden B operand register, 74HC181 ALU |
| Control | 32-bit control word from 4x 28C256, address = flags(3) \| opcode(8) \| step(4), 16 T-states/instruction max |
| Memory | 28C64 MOS ROM at `0x0000-0x0FFF`, HM6264 SRAM above; 13-bit MAR with a 4-way source mux and TMP+X index adder |
| Interrupts | IRQ pushes PC + flags and vectors through RAM at `0x1F1A`; BRK is a software breakpoint into the monitor |
| I/O | ACIA console (RX/TX status bits), SD disk with ready handshake, 7-seg display, 16-bit counter/comparator timer |
| Software | [MOS 1.1](https://github.com/mehrantsi/MOS-1) monitor (resident line assembler, disk filesystem, run-by-name) + EDIT, a disk-loaded editor/assembler with labels |

## Layout

- **[simulator/](simulator)** - the microcode-accurate simulator: 3D/2D bench, terminal, logic analyzer, oscilloscope, PSU model, microcode editor with EEPROM export, KiCad netlist/PCB export. `npm run dev` to run, `npm test` for the headless self-test that boots MOS and drives it end to end.
- **[Schematics/](Schematics)** - generated KiCad netlist and PCB files plus per-board schematic sheets (SVG/PNG), all derived from the simulator's module registry. See its README for the generation flow.
- The OS and EDIT live in [MOS-1](https://github.com/mehrantsi/MOS-1); the cross assembler (`msap-asm --isa msap2`) lives in [8-bit_CPU_Programmer](https://github.com/mehrantsi/8-bit_CPU_Programmer).

## Status

rev.A: the CPU executes from control-ROM images (no instruction logic outside them), the OS boots from a write-protected ROM image assembled by the real toolchain, every chip on every board carries declared pin nets, and both EEPROM sets (4 control ROMs + OS ROM) export as burnable binaries. Remaining before fabrication: route the exported PCB in KiCad and capture the rev.A schematic there from the netlist.
