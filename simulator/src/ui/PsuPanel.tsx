import { activeModules } from '../core/design'
import { estimatePower } from '../core/electrical'
import { partsOutOfSpec } from '../core/parts'
import { powered, useSim } from '../state/store'

export function PsuPanel() {
  const psu = useSim((s) => s.psu)
  const setPsu = useSim((s) => s.setPsu)
  const snap = useSim((s) => s.snap)
  const signed = useSim((s) => s.signed)
  const hz = useSim((s) => s.hz)

  const isOn = powered(psu)
  const draw = isOn ? estimatePower(snap, signed, psu.vcc, hz).totalMa : 0
  const warnings = partsOutOfSpec(activeModules().flatMap((m) => m.chips.map((c) => c.part)), psu.vcc)
  const status = psu.tripped ? 'TRIP' : !psu.on ? 'OFF' : psu.vcc < 3 ? 'UVLO' : 'CV'

  return (
    <div className="psu">
      <div className="psu-readouts">
        <div className="psu-readout">
          <span className="psu-value">{psu.on ? psu.vcc.toFixed(2) : '0.00'}</span>
          <span className="psu-unit">V</span>
        </div>
        <div className="psu-readout">
          <span className="psu-value amber">{(draw / 1000).toFixed(3)}</span>
          <span className="psu-unit">A</span>
        </div>
        <span className={`psu-status ${status.toLowerCase()}`}>{status}</span>
      </div>

      <label className="psu-row">
        <span>VCC {psu.vcc.toFixed(2)}V</span>
        <input
          type="range"
          min={3}
          max={6}
          step={0.05}
          value={psu.vcc}
          onChange={(e) => setPsu({ vcc: Number(e.target.value) })}
          aria-label="Supply voltage"
        />
      </label>
      <label className="psu-row">
        <span>I-limit {psu.limitMa} mA</span>
        <input
          type="range"
          min={50}
          max={1000}
          step={10}
          value={psu.limitMa}
          onChange={(e) => setPsu({ limitMa: Number(e.target.value) })}
          aria-label="Current limit"
        />
      </label>

      <div className="psu-buttons">
        <button className={psu.on ? 'toggle on' : 'toggle'} onClick={() => setPsu({ on: !psu.on })}>
          {psu.on ? 'Output on' : 'Output off'}
        </button>
        {psu.tripped && (
          <button className="primary" onClick={() => setPsu({ tripped: false })}>
            Reset trip
          </button>
        )}
      </div>

      {psu.tripped && <div className="asm-error">Overcurrent: draw exceeded {psu.limitMa} mA and the output latched off.</div>}
      {psu.on && psu.vcc < 3 && <div className="asm-error">Below ~3V the HC logic loses state; the clock is held.</div>}
      {warnings.length > 0 && psu.on && !psu.tripped && (
        <div className="psu-warnings">
          {warnings.map((w) => (
            <div key={w.part}>
              {w.part} is outside its {w.range} supply range
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
