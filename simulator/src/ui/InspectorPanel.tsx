import { useMemo, useState } from 'react'
import { activeFindChip, activeModules } from '../core/design'
import { disassemble } from '../core/disasm'
import { estimatePower } from '../core/electrical'
import { PARTS } from '../core/parts'
import { currentMachine } from '../machines'
import { activeIsa, InspectorTab, useSim } from '../state/store'

const hex = (v: number, width = 2) => v.toString(16).toUpperCase().padStart(width, '0')

function StateTab() {
  const snap = useSim((s) => s.snap)
  const machineDef = currentMachine()
  const rows: [string, string][] = machineDef.registers.map((reg) => [
    reg.name,
    reg.format ? reg.format(snap) : `0x${hex(reg.get(snap))}  ${reg.get(snap)}`,
  ])
  return (
    <div>
      <table className="kv">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flag-row">
        {machineDef.flags.map((flag) => (
          <span key={flag.name} className={flag.get(snap) ? 'flag on' : 'flag'}>
            {flag.name}
          </span>
        ))}
        <span className="flag on subtle">{snap.fetch ? 'FETCH' : 'EXEC'}</span>
        <span className="flag on subtle">T{snap.step}</span>
        {snap.busConflict && <span className="flag warn">BUS CONFLICT</span>}
      </div>
      <div className="panel-subtitle">Control word</div>
      <div className="signal-grid">
        {machineDef.signals.map((sig) => {
          const on = (snap.controlWord & sig.bit) !== 0
          return (
            <span key={sig.name} className={on ? 'sig on' : 'sig'} title={sig.description}>
              {sig.name}
            </span>
          )
        })}
      </div>
    </div>
  )
}

const PAGE_COUNT = 32

function pageRegion(page: number): string {
  if (page < 0x10) return 'MOS'
  if (page < 0x1f) return 'USER'
  return 'SYS/STACK'
}

function RamTab() {
  const snap = useSim((s) => s.snap)
  const breakpoints = useSim((s) => s.breakpoints)
  const toggleBreakpoint = useSim((s) => s.toggleBreakpoint)
  const [pinnedPage, setPinnedPage] = useState<number | null>(null)
  const page = Math.min(pinnedPage ?? snap.pc >> 8, PAGE_COUNT - 1)
  const base = page << 8
  const disasm = disassemble(snap.ram, snap.pc, 5, activeIsa())

  return (
    <div>
      <div className="panel-subtitle">RAM - click a byte to toggle a breakpoint</div>
      <div className="ram-pager">
        <button onClick={() => setPinnedPage(Math.max(0, page - 1))} title="Previous 256-byte page">
          ‹
        </button>
        <span className="ram-pager-label">
          {`0x${(base).toString(16).toUpperCase().padStart(4, '0')} - 0x${(base + 0xff).toString(16).toUpperCase().padStart(4, '0')}`}
          <em>{pageRegion(page)}</em>
        </span>
        <button onClick={() => setPinnedPage(Math.min(PAGE_COUNT - 1, page + 1))} title="Next 256-byte page">
          ›
        </button>
        <button className={pinnedPage === null ? 'on' : ''} onClick={() => setPinnedPage(null)} title="Follow the program counter">
          PC
        </button>
      </div>
      <div className="ram-grid">
        {[...snap.ram.slice(base, base + 256)].map((byte, offset) => {
          const addr = base + offset
          const classes = ['cell']
          if (addr === snap.pc) classes.push('pc')
          if (addr === snap.mar) classes.push('mar')
          if (breakpoints.includes(addr)) classes.push('bp')
          return (
            <button key={addr} className={classes.join(' ')} onClick={() => toggleBreakpoint(addr)} title={`0x${addr.toString(16).padStart(4, '0').toUpperCase()}`}>
              {hex(byte)}
            </button>
          )
        })}
      </div>
      <div className="legend">
        <span className="cell pc">PC</span>
        <span className="cell mar">MAR</span>
        <span className="cell bp">breakpoint</span>
      </div>
      <div className="panel-subtitle">Disassembly at PC</div>
      <table className="kv disasm">
        <tbody>
          {disasm.map((line) => (
            <tr key={line.address} className={line.address === snap.pc ? 'current' : ''}>
              <td>{hex(line.address)}</td>
              <td>{line.bytes.map((b) => hex(b)).join(' ')}</td>
              <td>{line.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PowerTab() {
  const snap = useSim((s) => s.snap)
  const signed = useSim((s) => s.signed)
  const hz = useSim((s) => s.hz)
  const estimate = estimatePower(snap, signed, 5, hz)
  return (
    <div>
      <table className="kv power">
        <thead>
          <tr>
            <th>module</th>
            <th>chips</th>
            <th>LEDs</th>
            <th>total</th>
          </tr>
        </thead>
        <tbody>
          {estimate.modules.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>{m.chipsMa.toFixed(1)}</td>
              <td>{m.ledsMa.toFixed(1)}</td>
              <td>{m.totalMa.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>total @ {estimate.vcc.toFixed(1)}V</td>
            <td colSpan={2}></td>
            <td>{estimate.totalMa.toFixed(0)} mA</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

const HZ_MAX_LOG = Math.log10(2000000)

function SwitchControl({ label, on, onFlip }: { label: string; on: boolean; onFlip: () => void }) {
  return (
    <label className="ui-switch-row">
      <span>{label}</span>
      <button
        role="switch"
        aria-checked={on}
        className={on ? 'ui-switch on' : 'ui-switch'}
        onClick={onFlip}
      >
        <span className="ui-switch-knob" />
      </button>
      <span className={on ? 'ui-switch-state on' : 'ui-switch-state'}>{on ? 'on' : 'off'}</span>
    </label>
  )
}

function PassiveProps() {
  const sel = useSim((s) => s.selectedPassive)!
  const designVersion = useSim((s) => s.designVersion)
  const design = useSim((s) => s.design)
  const setPassiveValue = useSim((s) => s.setPassiveValue)
  const hz = useSim((s) => s.hz)
  const setHz = useSim((s) => s.setHz)
  const running = useSim((s) => s.running)
  const setRunning = useSim((s) => s.setRunning)
  const signed = useSim((s) => s.signed)
  const setSigned = useSim((s) => s.setSigned)
  const stepT = useSim((s) => s.stepT)
  const snap = useSim((s) => s.snap)

  const module = useMemo(
    () => activeModules().find((m) => m.id === sel.moduleId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [designVersion, sel.moduleId],
  )
  const passive = module?.passives.find((p) => p.ref === sel.ref)
  if (!module || !passive) return <div className="fine-print">Component not found.</div>

  const stateKey = `${module.id}:${passive.ref}#state`
  const storedOn = design.passiveOverrides?.[stateKey] === 'on'
  const isClockPot = module.id === 'clock' && passive.ref === 'R1'
  const isStepButton = module.id === 'clock' && passive.ref === 'SW1'
  const isModeSwitch = module.id === 'clock' && passive.ref === 'SW2'
  const isSignSwitch = module.id === 'output' && passive.ref === 'SW3'
  const wiperPct = Math.round((Math.log10(Math.max(1, hz)) / HZ_MAX_LOG) * 100)

  const editableValue = passive.kind === 'res' || passive.kind === 'cap' || passive.kind === 'rnet'

  return (
    <div>
      <div className="chip-title">{passive.ref}</div>
      <table className="kv">
        <tbody>
          <tr>
            <td>module</td>
            <td>{module.name}</td>
          </tr>
          <tr>
            <td>kind</td>
            <td>{passive.kind}</td>
          </tr>
          <tr>
            <td>{passive.kind === 'switch' ? 'function' : 'value'}</td>
            <td>
              {editableValue ? (
                <input
                  className="prop-input"
                  type="text"
                  value={passive.value}
                  onChange={(e) => setPassiveValue(module.id, passive.ref, e.target.value)}
                  aria-label="Component value"
                />
              ) : (
                passive.value
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {passive.kind === 'switch' && isStepButton && (
        <div className="prop-control">
          <button className="primary" onClick={stepT} disabled={running || snap.halted}>
            Press - one T state
          </button>
          <div className="prop-note">momentary, mono-stable clock button</div>
        </div>
      )}
      {passive.kind === 'switch' && isModeSwitch && (
        <div className="prop-control">
          <SwitchControl label="astable / run" on={running} onFlip={() => setRunning(!running)} />
          <div className="prop-note">bi-stable = free-running clock, off = single-step mode</div>
        </div>
      )}
      {passive.kind === 'switch' && isSignSwitch && (
        <div className="prop-control">
          <SwitchControl label="signed display" on={signed} onFlip={() => setSigned(!signed)} />
        </div>
      )}
      {passive.kind === 'switch' && !isStepButton && !isModeSwitch && !isSignSwitch && (
        <div className="prop-control">
          <SwitchControl
            label={passive.value}
            on={storedOn}
            onFlip={() => setPassiveValue(module.id, `${passive.ref}#state`, storedOn ? 'off' : 'on')}
          />
          <div className="prop-note">position persists; not bound to simulation behavior</div>
        </div>
      )}

      {passive.kind === 'pot' && isClockPot && (
        <div className="prop-control">
          <div className="panel-subtitle">Wiper - drives the 555 astable frequency</div>
          <label className="psu-row">
            <span>{wiperPct}% = {hz >= 1000 ? `${(hz / 1000).toFixed(1)} kHz` : `${Math.round(hz)} Hz`}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={wiperPct}
              onChange={(e) => setHz(Math.max(1, Math.round(Math.pow(10, (Number(e.target.value) / 100) * HZ_MAX_LOG))))}
              aria-label="Pot wiper"
            />
          </label>
        </div>
      )}
      {passive.kind === 'pot' && !isClockPot && (
        <div className="prop-control">
          <label className="psu-row">
            <span>wiper {Number(design.passiveOverrides?.[stateKey] ?? 50)}%</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Number(design.passiveOverrides?.[stateKey] ?? 50)}
              onChange={(e) => setPassiveValue(module.id, `${passive.ref}#state`, e.target.value)}
              aria-label="Pot wiper"
            />
          </label>
          <div className="prop-note">position persists; not bound to simulation behavior</div>
        </div>
      )}

      {passive.kind === 'led' && (
        <div className="prop-control">
          <div className="prop-note">indicator LED - state driven by the circuit</div>
        </div>
      )}
    </div>
  )
}

function ChipTab() {
  const selected = useSim((s) => s.selectedChip)
  const selectedPassive = useSim((s) => s.selectedPassive)
  const setSelectedNet = useSim((s) => s.setSelectedNet)
  const setPanel = useSim((s) => s.setPanel)
  const openNet = (net: string) => {
    setSelectedNet(net)
    setPanel('schematic', { visible: true })
  }
  if (selectedPassive) return <PassiveProps />
  if (!selected) return <div className="fine-print">Click any chip or component on a board to inspect it.</div>
  const located = activeFindChip(selected)
  if (!located) return <div className="fine-print">Unknown chip.</div>
  const found = { module: located.module.name, part: located.chip.part, pins: located.chip.pins }
  const spec = PARTS[found.part]
  const rows: [string, string][] = [
    ['module', found.module],
    ['part', spec.value],
    ['family', spec.family],
    ['package', `${spec.package} (${spec.pins} pins)`],
    ['supply', spec.vccPin ? `VCC pin ${spec.vccPin}, GND pin ${spec.gndPin}` : 'discrete'],
    ['Icc', `${spec.iccTypMa} mA typ / ${spec.iccMaxMa} mA max`],
    ...(spec.vihV !== undefined ? ([['VIH / VIL', `${spec.vihV}V / ${spec.vilV}V @ 5V`]] as [string, string][]) : []),
    ...(spec.vohV !== undefined ? ([['VOH / VOL', `${spec.vohV}V / ${spec.volV}V`]] as [string, string][]) : []),
    ['input Z', spec.inputImpedance],
    ...(spec.outputDriveMa ? ([['drive', `+/-${spec.outputDriveMa} mA per output`]] as [string, string][]) : []),
    ...(spec.tpdNs ? ([['tPD', `~${spec.tpdNs} ns`]] as [string, string][]) : []),
    ...(spec.cpdPf ? ([['Cpd', `${spec.cpdPf} pF`]] as [string, string][]) : []),
  ]
  return (
    <div>
      <div className="chip-title">{selected}</div>
      <table className="kv">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="fine-print">{spec.description}</div>
      {found.pins && (
        <>
          <div className="panel-subtitle">Declared nets - click to trace in the schematic</div>
          <table className="kv">
            <tbody>
              {Object.entries(found.pins).map(([pin, net]) => (
                <tr key={pin}>
                  <td>pin {pin}</td>
                  <td>
                    <button className="net-link" onClick={() => openNet(net)}>
                      {net}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

const TABS: { id: InspectorTab; label: string }[] = [
  { id: 'state', label: 'State' },
  { id: 'ram', label: 'RAM' },
  { id: 'power', label: 'Power' },
  { id: 'chip', label: 'Part' },
]

export function InspectorPanel() {
  const tab = useSim((s) => s.inspectorTab)
  const setTab = useSim((s) => s.setInspectorTab)
  return (
    <div className="inspector-panel">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-body">
        {tab === 'state' && <StateTab />}
        {tab === 'ram' && <RamTab />}
        {tab === 'power' && <PowerTab />}
        {tab === 'chip' && <ChipTab />}
      </div>
    </div>
  )
}
