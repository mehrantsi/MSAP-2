# MSAP-2 Simulator

The design workbench for MSAP-2: the successor to MSAP-1 with interrupts, a hardware stack, more registers, a richer ALU, an 8KB address space, a serial terminal, mass storage, and a resident operating system with a built-in line assembler and breakpoint debugging. Where the MSAP-1 simulator is a cycle-accurate digital twin of finished hardware, this is the opposite end of the workflow - a **microcode-accurate rev.A**: the CPU executes control words from four 28C256 ROM images, T-state by T-state, and boots the MOS 1.1 operating system from a 4KB ROM - the same artifacts (control ROMs + OS ROM) the hardware build will burn. The 3D bench, logic analyzer, oscilloscope, PSU, schematic editor, and KiCad export carry over from the MSAP-1 twin.

## Run

```
npm install
npm run dev        # open the printed URL
npm test           # headless self-test: boots MOS and drives it through the terminal
npm run build      # type-check + production build
```

## Architecture

| | MSAP-1 | MSAP-2 |
|---|---|---|
| Opcodes | 4-bit (16 slots) | 8-bit, variable-length instructions (1-3 bytes) |
| Memory | 16 bytes | 8 KB (13-bit addresses, HM6264 SRAM) |
| Registers | A, B, OUT | A, X, SP, PC(13), OUT |
| Flags | C, Z | C, Z, N, plus the interrupt-enable bit |
| Addressing | absolute only | immediate, absolute, indirect, indexed-X, port |
| Stack | - | 0x1Fxx page, SP starts at 0x1FFF and grows down (TXS relocates it) |
| Interrupts | - | IRQ vector with flag save/restore, EI/DI/RTI |
| I/O | 7-seg display | 5 ports: console in/out, disk, display, timer |

### Memory map

| Range | Use |
|---|---|
| `0x0000-0x0FFF` | MOS: reset vector at `0x0000`, IRQ vector at `0x0008`, BRK vector at `0x000B`, syscall jump table at `0x0010`, monitor code, messages, and the assembler tables |
| `0x1000-0x1EFF` | User program area (`R 1000`) - just under 4KB |
| `0x1F00-0x1F9F` | MOS variables, line buffer, disk command buffer |
| `0x1FA0-0x1FFF` | Stack (SP starts at `0xFF` = address `0x1FFF`, grows down; the monitor resets it with `TXS` at every prompt) |

### Interrupts

An IRQ pushes PC high, PC low, then the flags, disables interrupts, and jumps to `0x008`. `RTI` restores the flags and return address. `EI`/`DI` gate the whole mechanism. The timer (port 4) raises an IRQ every A x 256 cycles; the Ticks example hooks the vector and counts on the 7-segment display.

### I/O ports

| Port | Device |
|---|---|
| 0 | Console data - `IN` reads a key, `OUT` prints a character |
| 1 | Console status - bit 0: RX byte waiting, bit 1: TX ready (ACIA-style; poll bit 1 before OUT, mask bit 0 for input) |
| 2 | Smart disk - Arduino + SD card protocol (below) |
| 3 | 7-segment display |
| 4 | Timer - `OUT` with A=n fires an IRQ every n x 256 T-states, A=0 stops (161 counter chain + 688 comparator) |
| 5 | Disk status - 1 when the disk has finished the last command; poll before reading port 2 |

### Instruction set

Implied (1 byte): `NOP HLT EI DI RTS RTI PHA PLA PHX PLX TAX TXA TXS INX DEX SHL SHR BRK`

| Mnemonic | Modes | Notes |
|---|---|---|
| `LDA` | `#imm` `abs` `(ind)` `abs,x` | loads set Z/N |
| `STA` | `abs` `(ind)` `abs,x` | |
| `LDX` / `STX` | `#imm` `abs` / `abs` | |
| `ADD SUB AND ORA XOR CMP` | `#imm` `abs` | `CMP`/`SUB` set C = no borrow (A >= operand) |
| `CPX` | `#imm` | |
| `JMP JSR JZ JNZ JC JNC JN` | `abs` | two-byte little-endian addresses |
| `BRK` | - | pushes PC + flags and breaks into the monitor with a register dump |
| `IN` / `OUT` | `#port` | |

Assembler dialect: labels, `.org .byte .word .equ .ascii .asciiz`, `#` immediates, `<`/`>` lo/hi byte operators, `;` comments. The same dialect is spoken by the in-app assembler and by `msap-asm --isa msap2` in the 8-bit_CPU_Programmer repo (verified byte-for-byte in that repo's test suite).

## MOS 1.1

The resident monitor boots at reset, prints a banner, and takes commands from the terminal:

| Command | Action |
|---|---|
| `A AAAA` | assemble mode: type one instruction per line at the shown address, empty line ends |
| `D AAAA` | dump 32 bytes from hex address AAAA |
| `E AAAA BB ..` | enter bytes into memory |
| `R AAAA` or `R NAME` | run at an address, or load a file from disk and run it (bare `R` runs at `1000`) - `RTS` returns and prints A/X |
| `L NAME [AAAA]` | load a file from disk (default `1000`) |
| `S NAME AAAA NN` | save NN bytes from AAAA as NAME |
| `X NAME` | delete a file |
| `F` | list files |
| `H` | help |

Syscalls (stable jump table, safe to link against):

| Address | Call | Contract |
|---|---|---|
| `0x010` | PUTC | prints A |
| `0x013` | GETC | blocks, returns key in A |
| `0x016` | PUTS | prints the NUL-terminated string pointed to by `0x1F00/0x1F01` |
| `0x019` | GETLN | reads an edited line into `0x1F20`, NUL-terminated |
| `0x01C` | EXIT | returns to the monitor prompt |

The smart disk (port 2) mirrors the planned Arduino + SD card module: commands are NUL-terminated strings - `L NAME` answers length lo/hi (0xFFFF = not found) then the bytes, `S NAME` takes length then bytes, `F` streams a text listing, `D NAME` answers a status byte. In the simulator the filesystem persists in localStorage.

The assemble mode is a resident table-driven line assembler in the tradition of the Apple II mini-assembler: mnemonics with `#imm`, `abs`, `(ind)`, `abs,x` and port operands, all operands hex, no labels (the prompt shows the current address, so jumps use it directly). For breakpoints, put `BRK` anywhere in a program (opcode `37`): it stops, prints `BRK @AAAA A=.. X=..`, and returns to the prompt.

The disk boots pre-loaded with the example programs (`F` lists HELLO, ECHO, SHOUT, TICKS - `L SHOUT` then `R 1000` runs one). The MOS source lives in its own repo, `~/dev/MOS-1` - about 2.4KB assembled, well inside its 4KB ROM. The simulator loads the built `mos-rom.json` binary; `MOS-1/build.sh` reassembles it with `msap-asm` and refreshes the image.

## Using it

- **Terminal panel**: click it and type; keys feed port 0 and the clock auto-starts. The default clock is 20 kHz so the OS feels interactive (slider goes to 500 kHz); drag it down to watch the polling loop in the logic analyzer.
- **Program panel**: the examples (Hello, Echo, Shout, Ticks) assemble into the user area and *merge* into RAM without resetting, so MOS keeps running - load one, then type `R 1000`.
- **Inspector**: PC/A/X/SP/flags live view, RAM browser with a 256-byte pager (or follow-PC), power estimate, and part datasheets.
- Everything else - scope probes on chip pins, PSU limits, schematic editing with the design overlay, KiCad netlist/PCB export, per-panel maximize and persistence - works as in the MSAP-1 simulator.

## Microcode

The core executes T-state by T-state **from four 28C256 control-ROM images** - there is no instruction logic in TypeScript. `src/core/ucode.ts` defines the 32-bit control word (bus-source field, register strobes, MAR source mux, counter ops, ALU function, sequencer bits) and the microprogram for every opcode; `buildRoms()` expands it across the 8 flag banks (address = flags(3) | opcode(8) | step(4)), and `machine.stepT()` decodes one word per clock: drive the bus, latch the strobes, count, reset or advance the step counter. Conditional jumps are flag-banked ROM rows, interrupts are a forced opcode slot (0xFF), and BRK is an ordinary microprogram. The **Microcode panel** edits the control words live (with a boot check) and exports the four EEPROM .bin images for burning.

The OS is not part of the simulator: it lives in `~/dev/MOS-1`, is assembled by the real `msap-asm` toolchain, and the simulator boots the resulting binary from a write-protected 4KB ROM region - the same image a 28C64 would hold. Programs run through a RAM trampoline and interrupts hook a RAM vector, so nothing depends on writable ROM.

## Timing budget

One T-state must cover the longest path: step counter -> control ROM (150 ns) -> strobe gating -> source drive + RAM/ROM access (100-150 ns) -> latch setup. With standard 150 ns EEPROMs that is roughly 450-500 ns, so **~2 MHz** is the honest ceiling the slider allows; 70 ns ROMs and 55 ns SRAM on a PCB push toward 4-5 MHz. The console TX takes 80 T-states per character and the disk raises its ready bit ~512 T-states after a command - MOS polls both, so the same binary runs at any clock.

## Self-test

`npm test` assembles the OS, boots a headless machine, and drives it through the terminal: banner and help, `E`/`D` roundtrip, the resident assembler (including every addressing mode and error recovery), `BRK` breakpoints, the register dump on `RTS`, the seeded disk, all four examples (including the interrupt-driven Ticks), save/list/load/delete, stack discipline with `TXS`, and indirect/indexed addressing.
