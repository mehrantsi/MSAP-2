import { currentMachine } from '../machines'
import { useSim } from '../state/store'

const EXAMPLES = currentMachine().examples

export function EditorPanel() {
  const source = useSim((s) => s.source)
  const setSource = useSim((s) => s.setSource)
  const assembleAndLoad = useSim((s) => s.assembleAndLoad)
  const loadExample = useSim((s) => s.loadExample)
  const loadedName = useSim((s) => s.loadedName)
  const asmError = useSim((s) => s.asmError)
  const labels = useSim((s) => s.labels)
  const breakpoints = useSim((s) => s.breakpoints)
  const toggleBreakpoint = useSim((s) => s.toggleBreakpoint)

  return (
    <div className="editor-panel">
      <div className="row">
        <select
          value={loadedName ?? ''}
          onChange={(e) => e.target.value && loadExample(e.target.value)}
          aria-label="Load example program"
        >
          <option value="">Load example...</option>
          {EXAMPLES.map((ex) => (
            <option key={ex.name} value={ex.name}>
              {ex.name}
            </option>
          ))}
        </select>
        <button className="primary" onClick={assembleAndLoad}>
          Assemble + load
        </button>
      </div>
      <textarea
        spellCheck={false}
        value={source}
        onChange={(e) => setSource(e.target.value)}
        aria-label="Assembly source"
      />
      {asmError ? (
        <div className="asm-error">
          line {asmError.line}:{asmError.col} - {asmError.message}
        </div>
      ) : (
        <div className="asm-ok">
          {loadedName ? EXAMPLES.find((e) => e.name === loadedName)?.expects ?? 'loaded' : 'edit, then assemble + load'}
        </div>
      )}
      {labels.length > 0 && (
        <div className="labels">
          <div className="panel-subtitle">Labels - click to set a breakpoint</div>
          <div className="label-grid">
            {labels.map(([name, addr]) => (
              <button
                key={name}
                className={breakpoints.includes(addr) ? 'label-chip bp' : 'label-chip'}
                onClick={() => toggleBreakpoint(addr)}
                title={`toggle breakpoint at 0x${addr.toString(16).toUpperCase().padStart(2, '0')}`}
              >
                {name} <span>{addr.toString(16).toUpperCase().padStart(2, '0')}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
