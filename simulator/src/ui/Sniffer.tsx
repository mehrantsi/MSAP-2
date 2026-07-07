import { useEffect, useRef, useState } from 'react'
import { describeOpcode } from '../core/disasm'
import { TraceEntry } from '../core/machine'
import { currentMachine } from '../machines'
import { activeIsa, machine, useSim } from '../state/store'

const LANES = currentMachine().signals
const CAPTURE = 2048
const WINDOWS = [64, 128, 256, 512, 1024, 2048]
const LABEL_WIDTH = 44

function drawWaveforms(canvas: HTMLCanvasElement, samples: TraceEntry[], laneHeight: number, cursor: number | null): void {
  const ctx = canvas.getContext('2d')!
  const dpr = window.devicePixelRatio || 1
  const width = canvas.clientWidth
  const height = LANES.length * laneHeight + 22
  if (width < 40) return
  canvas.style.height = `${height}px`
  canvas.width = width * dpr
  canvas.height = height * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const plotWidth = width - LABEL_WIDTH
  const px = plotWidth / samples.length

  ctx.font = '9px ui-monospace, Menlo, monospace'
  ctx.textBaseline = 'middle'

  LANES.forEach((sig, lane) => {
    const y0 = lane * laneHeight + 4
    ctx.fillStyle = '#7a8490'
    ctx.fillText(sig.name, 4, y0 + laneHeight / 2)
    ctx.strokeStyle = '#4c8dff'
    ctx.lineWidth = 1
    ctx.beginPath()
    let started = false
    samples.forEach((entry, i) => {
      const on = (entry.controlWord & sig.bit) !== 0
      const x = LABEL_WIDTH + i * px
      const y = on ? y0 + 1.5 : y0 + laneHeight - 3
      if (!started) {
        ctx.moveTo(x, y)
        started = true
      } else {
        ctx.lineTo(x, y)
      }
      ctx.lineTo(x + px, y)
    })
    ctx.stroke()
  })

  const busY = LANES.length * laneHeight + 12
  ctx.fillStyle = '#7a8490'
  ctx.fillText('BUS', 4, busY)
  ctx.fillStyle = '#ffb000'
  let lastBus = -1
  samples.forEach((entry, i) => {
    if (entry.bus !== lastBus) {
      lastBus = entry.bus
      const x = LABEL_WIDTH + i * px
      if (i === 0 || px >= 2 || i % Math.ceil(24 / px) === 0) {
        ctx.fillText(entry.bus.toString(16).toUpperCase().padStart(2, '0'), x, busY)
      }
    }
  })

  if (cursor !== null && cursor >= 0 && cursor < samples.length) {
    const x = LABEL_WIDTH + (cursor + 0.5) * px
    ctx.strokeStyle = '#ff4fd8'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(x, 2)
    ctx.lineTo(x, height - 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#ff4fd8'
    const label = `T ${samples[cursor].cycle}`
    ctx.fillText(label, Math.min(x + 4, width - 40), 8)
  }
}

function getWindow(offset: number, window_: number): TraceEntry[] {
  const all = machine.recentTrace(CAPTURE)
  const clampedOffset = Math.max(0, Math.min(offset, Math.max(0, all.length - window_)))
  const end = all.length - clampedOffset
  return all.slice(Math.max(0, end - window_), end)
}

export function Sniffer() {
  const traceVersion = useSim((s) => s.traceVersion)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [window_, setWindow] = useState(256)
  const [laneHeight, setLaneHeight] = useState(11)
  const [offset, setOffset] = useState(0)
  const [cursor, setCursor] = useState<number | null>(null)
  const dragRef = useRef<{ startX: number; baseOffset: number; moved: boolean } | null>(null)

  const samples = getWindow(offset, window_)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (samples.length > 0) drawWaveforms(canvas, samples, laneHeight, cursor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traceVersion, window_, laneHeight, offset, cursor])

  const cursorEntry = cursor !== null ? samples[Math.min(cursor, samples.length - 1)] : null
  const decodedSource = cursorEntry
    ? samples.slice(Math.max(0, Math.min(cursor!, samples.length - 1) - 5), Math.min(cursor!, samples.length - 1) + 5)
    : machine.recentTrace(10)

  const decoded = decodedSource.map((entry) => ({
    key: entry.cycle,
    current: cursorEntry !== null && entry.cycle === cursorEntry.cycle,
    text: `${entry.phase === 'fetch' ? 'FETCH' : describeOpcode(entry.opcode, activeIsa())}  T${entry.step}  bus 0x${entry.bus
      .toString(16)
      .toUpperCase()
      .padStart(2, '0')}`,
  }))

  const indexFromEvent = (e: React.PointerEvent): number | null => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const plotWidth = rect.width - LABEL_WIDTH
    const x = e.clientX - rect.left - LABEL_WIDTH
    if (x < 0 || plotWidth <= 0) return null
    return Math.max(0, Math.min(samples.length - 1, Math.floor((x / plotWidth) * samples.length)))
  }

  return (
    <div className="sniffer-wrap">
      <div className="scope-controls">
        <label>
          window
          <select value={window_} onChange={(e) => setWindow(Number(e.target.value))}>
            {WINDOWS.map((w) => (
              <option key={w} value={w}>
                {w} T
              </option>
            ))}
          </select>
        </label>
        <label>
          lanes
          <select value={laneHeight} onChange={(e) => setLaneHeight(Number(e.target.value))}>
            <option value={9}>compact</option>
            <option value={11}>normal</option>
            <option value={15}>large</option>
          </select>
        </label>
        {(offset > 0 || cursor !== null) && (
          <button
            className="toggle"
            onClick={() => {
              setOffset(0)
              setCursor(null)
            }}
          >
            live{offset > 0 ? ` (${offset} T back)` : ''}
          </button>
        )}

      </div>
      <div className="sniffer-body">
        <canvas
          ref={canvasRef}
          className="waveforms"
          onPointerDown={(e) => {
            dragRef.current = { startX: e.clientX, baseOffset: offset, moved: false }
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            const drag = dragRef.current
            if (drag) {
              if (Math.abs(e.clientX - drag.startX) > 3) drag.moved = true
              if (drag.moved) {
                const plotWidth = Math.max(1, (e.currentTarget as HTMLElement).clientWidth - LABEL_WIDTH)
                const perPx = window_ / plotWidth
                const next = drag.baseOffset + (e.clientX - drag.startX) * perPx
                setOffset(Math.max(0, Math.min(CAPTURE - window_, Math.round(next))))
                return
              }
            }
            setCursor(indexFromEvent(e))
          }}
          onPointerUp={() => {
            dragRef.current = null
          }}
          onDoubleClick={() => setCursor(null)}
          onWheel={(e) => {
            const index = WINDOWS.indexOf(window_)
            const next = WINDOWS[Math.max(0, Math.min(WINDOWS.length - 1, index + (e.deltaY > 0 ? 1 : -1)))]
            setWindow(next)
          }}
        />
        <div className="decoded">
          {decoded.length === 0 ? (
            <div className="fine-print">No bus activity yet - load a program and step or run.</div>
          ) : (
            decoded.map((line) => (
              <div key={line.key} className={line.current ? 'decoded-line current' : 'decoded-line'}>
                {line.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
