# MSAP-2 rev.A schematics

Everything in this folder is **generated from the simulator's module registry** (`../simulator/src/core/modules.ts`) - the same data the simulation, power model, and inspector run on. Nothing is drawn by hand, so the schematic can never drift from the machine that was verified.

## Files

- `MSAP-2 rev.A.net` - KiCad netlist: every component with footprint, every declared pin net, plus VCC/GND. Import into pcbnew via File > Import Netlist.
- `MSAP-2 rev.A.kicad_pcb` - single consolidated board, through-hole footprints, flow-packed by module with silkscreen labels and net assignments. **Unrouted** - this is the layout starting point.
- `MSAP-2 rev.A SMD.kicad_pcb` - the same board with SMD-equivalent footprints (SOIC/SOT).
- `KiCad/` - one `.kicad_sch` per board (KiCad 7+): every component as a symbol with its real pin count, nets attached as global labels at the pin tips. Open directly in eeschema, or plot from there.
- `SVG/`, `PNGs/` - one sheet per board (clock, PC, registers, stack pointer, ALU, RAM/ROM, control, terminal+disk IO, display, address path), rendered by the simulator's schematic view with routed same-net wires, in the classic KiCad light theme.

## Regenerating

`node scripts/export-schematics.mjs` in `../simulator` regenerates the netlist and both PCB variants after any registry change; the in-app Export menu produces the same files interactively. The per-board sheets come from the app's Schematic view (the SVGs are its exact render). The EEPROM contents (4x control ROM `.bin` from the Microcode panel, `mos.bin` / `ed.bin` from `~/dev/MOS-1/build.sh`) complete the burnable artifact set.

## Status vs MSAP-1

MSAP-1's `Schematics/` holds the hand-captured KiCad project for hardware that exists. MSAP-2 rev.A is the inverse flow: the registry is the source of truth, these files are its export, and the remaining manual steps before fabrication are routing the PCB and (optionally) capturing a hand-drawn `.kicad_sch` from the netlist for documentation.
