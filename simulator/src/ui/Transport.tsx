import { estimatePower } from '../core/electrical'
import { powered, useSim } from '../state/store'

const HZ_MIN = Math.log10(1)
const HZ_MAX = Math.log10(2000000)

export function Transport() {
  const snap = useSim((s) => s.snap)
  const running = useSim((s) => s.running)
  const setRunning = useSim((s) => s.setRunning)
  const hz = useSim((s) => s.hz)
  const setHz = useSim((s) => s.setHz)
  const signed = useSim((s) => s.signed)
  const setSigned = useSim((s) => s.setSigned)
  const reset = useSim((s) => s.reset)
  const stepT = useSim((s) => s.stepT)
  const stepInstruction = useSim((s) => s.stepInstruction)
  const psu = useSim((s) => s.psu)

  const isOn = powered(psu)
  const power = isOn ? estimatePower(snap, signed, psu.vcc, hz) : null
  const hzLabel = hz >= 1000 ? `${(hz / 1000).toFixed(1)} kHz` : `${Math.round(hz)} Hz`
  const blocked = !isOn || snap.halted

  return (
    <div className="transport panel">
      <button onClick={reset} title="Reset the CPU, keep RAM contents">
        Reset
      </button>
      <button onClick={stepT} disabled={running || blocked} title="Advance one T state (mono-stable clock)">
        Step T
      </button>
      <button onClick={stepInstruction} disabled={running || blocked} title="Run to the next instruction boundary">
        Step instr
      </button>
      <button
        className="primary"
        onClick={() => setRunning(!running)}
        disabled={blocked}
        title="Free-running clock (bi-stable mode)"
      >
        {running ? 'Pause' : 'Run'}
      </button>
      <label className="speed">
        <input
          type="range"
          min={HZ_MIN}
          max={HZ_MAX}
          step={0.01}
          value={Math.log10(hz)}
          onChange={(e) => setHz(Math.round(Math.pow(10, Number(e.target.value))))}
          aria-label="Clock speed"
        />
        <span>{hzLabel}</span>
      </label>
      <button className={signed ? 'toggle on' : 'toggle'} onClick={() => setSigned(!signed)} title="SW3: signed / unsigned display">
        {signed ? 'signed' : 'unsigned'}
      </button>
      <span className="readout">cycle {snap.cycle}</span>
      <span className="readout amber">{power ? `${power.totalMa.toFixed(0)} mA` : '0 mA'}</span>
      {psu.tripped && <span className="readout halted">TRIP</span>}
      {!psu.tripped && !isOn && <span className="readout halted">NO PWR</span>}
      {isOn && snap.halted && <span className="readout halted">HALTED</span>}
    </div>
  )
}
