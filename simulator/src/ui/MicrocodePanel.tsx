import { useMemo, useState } from 'react'
import { MSAP2 } from '../core/isa'
import { Machine } from '../core/machine'
import {
  AI, AXS, BI, FI, FRI, HLT, IEC, IES, II, IOW, IRQ_SLOT, MI, RST, RW, TH, TL, XI,
  aluFn, buildRoms, busSrc, ctrOp, describeWord, marSrc, STEPS, UcodeRow,
} from '../core/ucode'
import { loadOverrides, mergedTemplate, saveOverrides, UcodeOverrides } from '../core/ucodeStore'
import MOS_ROM from '../rom/mos-rom.json'
import { machine, useSim } from '../state/store'

const BUS_NAMES = ['none', 'RAM', 'A', 'X', 'B', 'ALU', 'FLG', 'PCL', 'PCH', 'IO', 'VEC-IRQ', 'VEC-BRK', 'ZERO']
const MAR_NAMES = ['PC', 'TMP', 'SP', 'TMP+X']
const CTR_NAMES = ['none', 'PC++', 'PC=TMP', 'SP++', 'SP--', 'SP=BUS', 'TMP++', 'X++', 'X--']
const ALU_NAMES = ['ADD', 'SUB', 'AND', 'OR', 'XOR', 'SHL', 'SHR', 'PASB']
const STROBES: { label: string; bit: number }[] = [
  { label: 'AI', bit: AI }, { label: 'XI', bit: XI }, { label: 'BI', bit: BI }, { label: 'II', bit: II },
  { label: 'TL', bit: TL }, { label: 'TH', bit: TH }, { label: 'FRI', bit: FRI }, { label: 'RW', bit: RW },
  { label: 'IOW', bit: IOW }, { label: 'FI', bit: FI }, { label: 'AXS', bit: AXS },
  { label: 'IES', bit: IES }, { label: 'IEC', bit: IEC }, { label: 'RST', bit: RST }, { label: 'HLT', bit: HLT },
]

function opcodeLabel(opcode: number): string {
  if (opcode === IRQ_SLOT) return 'IRQ slot'
  const defs = MSAP2.instructions.filter((d) => d.opcode === opcode)
  if (defs.length === 0) return `0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`
  const def = defs[0]
  const mode = def.mode ? `.${def.mode}` : ''
  return `${def.mnemonic}${mode}`
}

function download(name: string, bytes: Uint8Array): void {
  const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function MicrocodePanel() {
  const snap = useSim((s) => s.snap)
  const refresh = useSim((s) => s.refresh)
  const [overrides, setOverrides] = useState<UcodeOverrides>(() => loadOverrides())
  const [selected, setSelected] = useState(0x10)
  const [variant, setVariant] = useState<'steps' | 'taken'>('steps')
  const [editStep, setEditStep] = useState<number | null>(null)
  const [bootResult, setBootResult] = useState<string | null>(null)

  const template = useMemo(() => mergedTemplate(overrides), [overrides])
  const opcodes = useMemo(
    () => Object.keys(template).map(Number).sort((a, b) => a - b),
    [template],
  )
  const row: UcodeRow | undefined = template[selected]
  const steps = variant === 'taken' && row?.taken ? row.taken : row?.steps ?? []
  const isModified = overrides[selected] !== undefined

  const commit = (next: UcodeOverrides) => {
    setOverrides(next)
    saveOverrides(next)
    machine.setRoms(buildRoms(mergedTemplate(next)))
    refresh()
  }

  const updateSteps = (updated: number[]) => {
    const current = overrides[selected] ?? {}
    const next = { ...overrides, [selected]: { ...current, [variant]: updated } }
    commit(next)
  }

  const setWord = (index: number, cw: number) => {
    const updated = steps.slice()
    updated[index] = cw
    updateSteps(updated)
  }

  const revert = () => {
    const next = { ...overrides }
    delete next[selected]
    commit(next)
  }

  const resetAll = () => commit({})

  const exportRoms = () => {
    const roms = buildRoms(template)
    roms.forEach((rom, i) => download(`msap2-control-u4${i + 1}.bin`, rom))
  }

  const bootCheck = () => {
    const test = new Machine()
    test.loadRom(MOS_ROM)
    test.setRoms(buildRoms(template))
    for (let i = 0; i < 200000 && !test.halted; i++) test.stepT()
    const out = test.devices.terminal.output
    setBootResult(out.includes('MOS') && out.includes('>') ? 'boot OK - MOS banner and prompt' : `boot FAILED: ${JSON.stringify(out.slice(0, 40))}`)
  }

  const liveStep = snap.irOpcode === selected && !snap.halted ? snap.step : -1
  const word = editStep !== null ? steps[editStep] ?? 0 : 0

  return (
    <div className="ucode">
      <div className="ucode-toolbar">
        <select value={selected} onChange={(e) => { setSelected(Number(e.target.value)); setEditStep(null); setVariant('steps') }}>
          {opcodes.map((op) => (
            <option key={op} value={op}>
              {`0x${op.toString(16).toUpperCase().padStart(2, '0')}  ${opcodeLabel(op)}${overrides[op] ? ' *' : ''}`}
            </option>
          ))}
        </select>
        {row?.taken && (
          <div className="tabs ucode-variant">
            <button className={variant === 'steps' ? 'on' : ''} onClick={() => setVariant('steps')}>not taken</button>
            <button className={variant === 'taken' ? 'on' : ''} onClick={() => setVariant('taken')}>taken</button>
          </div>
        )}
        {isModified && <button onClick={revert}>Revert op</button>}
      </div>

      <table className="kv ucode-steps">
        <tbody>
          {steps.map((cw, i) => (
            <tr key={i} className={i === liveStep ? 'current' : editStep === i ? 'editing' : ''} onClick={() => setEditStep(i)}>
              <td>T{i}</td>
              <td>{describeWord(cw) || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ucode-rowops">
        <button onClick={() => steps.length < STEPS && updateSteps([...steps, RST])}>+ step</button>
        <button onClick={() => steps.length > 1 && updateSteps(steps.slice(0, -1))}>- step</button>
        <span className="fine-print">click a step to edit it</span>
      </div>

      {editStep !== null && (
        <div className="ucode-editor">
          <label>
            bus
            <select value={busSrc(word)} onChange={(e) => setWord(editStep, (word & ~0x0f) | Number(e.target.value))}>
              {BUS_NAMES.map((name, i) => (
                <option key={name} value={i}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            MAR
            <select
              value={word & MI ? marSrc(word) : -1}
              onChange={(e) => {
                const v = Number(e.target.value)
                setWord(editStep, v < 0 ? word & ~(MI | (3 << 14)) : (word & ~(3 << 14)) | MI | (v << 14))
              }}
            >
              <option value={-1}>off</option>
              {MAR_NAMES.map((name, i) => (
                <option key={name} value={i}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            ctr
            <select value={ctrOp(word)} onChange={(e) => setWord(editStep, (word & ~(0x0f << 16)) | (Number(e.target.value) << 16))}>
              {CTR_NAMES.map((name, i) => (
                <option key={name} value={i}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            ALU
            <select value={aluFn(word)} onChange={(e) => setWord(editStep, (word & ~(7 << 20)) | (Number(e.target.value) << 20))}>
              {ALU_NAMES.map((name, i) => (
                <option key={name} value={i}>{name}</option>
              ))}
            </select>
          </label>
          <div className="ucode-strobes">
            {STROBES.map((s) => (
              <button
                key={s.label}
                className={word & s.bit ? 'sig on' : 'sig'}
                onClick={() => setWord(editStep, word ^ s.bit)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="ucode-actions">
        <button onClick={bootCheck}>Boot check</button>
        <button onClick={exportRoms}>Export EEPROMs (4x 28C256)</button>
        <button onClick={resetAll}>Reset all</button>
      </div>
      {bootResult && <div className="fine-print">{bootResult}</div>}
      <div className="fine-print">
        Address = flags(3) | opcode(8) | step(4) into four 28C256 ROMs (32-bit control word). Edits apply live and persist; export burns U41-U44.
      </div>
    </div>
  )
}
