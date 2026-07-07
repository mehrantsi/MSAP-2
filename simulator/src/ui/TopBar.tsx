import { useState } from 'react'
import { downloadText } from '../export/download'
import { renderAllKicadSch } from '../export/kicadSch'
import { buildNetlistModel, renderKicadNetlist } from '../export/netlist'
import { renderKicadPcb } from '../export/pcb'
import { renderBlockDiagramSvg } from '../export/svg'
import { currentMachine, MACHINES, switchMachine } from '../machines'
import { PanelId, useSim } from '../state/store'

const PANEL_LABELS: { id: PanelId; label: string }[] = [
  { id: 'program', label: 'Program' },
  { id: 'inspector', label: 'Inspect' },
  { id: 'sniffer', label: 'Logic' },
  { id: 'scope', label: 'Scope' },
  { id: 'psu', label: 'PSU' },
  { id: 'schematic', label: 'Schematic' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'microcode', label: 'Microcode' },
]

const HELP_SECTIONS: { title: string; lines: string[] }[] = [
  {
    title: 'Probing and scope',
    lines: [
      'Arm CH1-CH4 in the scope, then click a chip pin in the scene to attach the probe.',
      'Drag the graticule to pan, wheel to change the timebase; triggers, V/div, and FFT are in the scope header.',
      'Hovering a chip shows each pin: number, signal, or net.',
    ],
  },
  {
    title: 'Debugging',
    lines: [
      'Click label chips in the Program panel or RAM bytes in the Inspector to toggle breakpoints.',
      'Step T is one clock; Step instr runs to the next fetch.',
      'Logic analyzer: hover for a cursor that highlights the matching decoded instruction; drag pans, wheel zooms.',
    ],
  },
  {
    title: 'Schematic',
    lines: [
      'The Schematic panel draws the selected board KiCad-style: symbols, pin numbers, and net label flags colored by class.',
      'Click a pin to select it: its net highlights everywhere and all member pins list below - click one to jump boards.',
      'Rewire from the editor row: type a net (existing or new) and Connect; NC marks a no-connect; the revert arrow restores base wiring.',
      'Clicking a chip pin in the 3D scene selects the same pin in the schematic.',
      'Add chips and parts (including LEDs and 10-LED bars) from the rows above the sheet; drag symbols to rearrange, +/- to zoom.',
      'Create or remove boards and reset to stock from the bottom row.',
    ],
  },
  {
    title: 'Terminal + MOS',
    lines: [
      'The Terminal panel is the MSAP-2 console: click it and type - keys feed port 0, output comes from port 0 writes.',
      'MOS boots at reset: H lists commands - D dump, E enter bytes, R run, L/S load/save files on the disk, F list, X delete.',
      'Programs assembled in the Program panel merge into RAM without disturbing MOS; run them with R 1000.',
      'Syscalls for your programs: PUTC 010, GETC 013, PUTS 016 (pointer in 1A0/1A1), GETLN 019, EXIT 01C.',
    ],
  },
  {
    title: 'Designing',
    lines: [
      'New boards stack into the chosen column; parts come from the catalog with real datasheet specs.',
      'Select a chip symbol to swap its part; pin-compatible swaps (same pin count) keep their probe signals.',
      'The harness strip below the sheet adds or removes the board-level bus/control/clock ribbons, including base ones.',
      'Additions persist in this browser. New parts are structural until modeled in src/core/machine.ts and modules.ts.',
    ],
  },
  {
    title: 'Components',
    lines: [
      'Click any resistor, cap, pot, or switch for its properties; values are editable and persist.',
      "The clock pot R1's wiper drives the simulated 555 frequency.",
    ],
  },
  {
    title: 'Power model',
    lines: [
      'Current = datasheet quiescent + HC dynamic (Cpd x V^2 x f) + per-LED (Vcc - Vf) / (Rs + Rout), display multiplexed over 4 digits.',
      'The PSU trips when the smoothed draw stays over the limit for ~0.4s; reset it from the PSU panel.',
      'Compare with the bench meter on the real build (~290 mA with the programmer attached).',
    ],
  },
]

export function TopBar() {
  const [helpOpen, setHelpOpen] = useState(false)
  const view = useSim((s) => s.view)
  const setView = useSim((s) => s.setView)
  const wires = useSim((s) => s.wires)
  const toggleWires = useSim((s) => s.toggleWires)
  const panels = useSim((s) => s.panels)
  const setPanel = useSim((s) => s.setPanel)

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-name">{currentMachine().name}</span>
        <span className="brand-sub">{currentMachine().subtitle}</span>
        {MACHINES.length > 1 && (
          <select
            className="machine-picker"
            value={currentMachine().id}
            onChange={(e) => switchMachine(e.target.value)}
            aria-label="Machine"
          >
            {MACHINES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="topbar-actions">
        <div className="segmented" role="group" aria-label="Panels">
          {PANEL_LABELS.map((p) => (
            <button
              key={p.id}
              className={panels[p.id].visible ? 'on' : ''}
              onClick={() => setPanel(p.id, { visible: !panels[p.id].visible })}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Wires">
          <button className={wires.bus ? 'on wire-bus' : 'wire-bus'} onClick={() => toggleWires('bus')} title="Bus ribbons">
            Bus
          </button>
          <button className={wires.ctl ? 'on wire-ctl' : 'wire-ctl'} onClick={() => toggleWires('ctl')} title="Control signal harness">
            Ctl
          </button>
          <button className={wires.clk ? 'on wire-clk' : 'wire-clk'} onClick={() => toggleWires('clk')} title="Clock distribution">
            Clk
          </button>
        </div>
        <div className="segmented" role="group" aria-label="View mode">
          <button className={view === '3d' ? 'on' : ''} onClick={() => setView('3d')}>
            3D
          </button>
          <button className={view === '2d' ? 'on' : ''} onClick={() => setView('2d')}>
            2D
          </button>
        </div>
        <button className={helpOpen ? 'toggle on' : 'toggle'} onClick={() => setHelpOpen(!helpOpen)} aria-expanded={helpOpen} title="Help">
          ?
        </button>
        <details className="export-menu">
          <summary>Export</summary>
          <div className="export-list">
            <button onClick={() => downloadText('msap2.net', renderKicadNetlist(buildNetlistModel()))}>
              KiCad netlist
            </button>
            <button onClick={() => downloadText('msap2.kicad_pcb', renderKicadPcb('tht'))}>KiCad PCB (DIP)</button>
            <button onClick={() => downloadText('msap2-smd.kicad_pcb', renderKicadPcb('smd'))}>KiCad PCB (SMD)</button>
            <button
              onClick={() => {
                for (const sheet of renderAllKicadSch()) downloadText(`${sheet.name}.kicad_sch`, sheet.content)
              }}
            >
              KiCad schematics (per board)
            </button>
            <button onClick={() => downloadText('msap2-blocks.svg', renderBlockDiagramSvg(), 'image/svg+xml')}>
              Block SVG
            </button>
          </div>
        </details>
      </div>
      {helpOpen && (
        <div className="help-popover panel">
          <div className="help-header">
            <span>Help</span>
            <button onClick={() => setHelpOpen(false)} aria-label="Close help">
              ×
            </button>
          </div>
          <div className="help-body">
            {HELP_SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="panel-subtitle">{section.title}</div>
                {section.lines.map((line) => (
                  <div key={line} className="help-line">
                    {line}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
