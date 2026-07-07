import { useEffect, useMemo, useRef, useState } from 'react'
import { AnalogTrace, buildAnalogTrace, fftMagnitudes, findTrigger } from '../core/analog'
import { activeFindChip as findChip } from '../core/design'
import { PARTS } from '../core/parts'
import { machine, useSim } from '../state/store'

const PROBE_COLORS = ['#ffd21f', '#2fd4e0', '#ff4fd8', '#59f07d']
const TIME_DIVS = [100e-9, 250e-9, 1e-6, 5e-6, 25e-6, 100e-6, 500e-6, 2.5e-3, 10e-3, 50e-3, 250e-3]
const VOLT_DIVS = [0.2, 0.5, 1, 2]
const H_DIVS = 10
const V_DIVS = 8
const PLOT_HEIGHT = 264
const FFT_HEIGHT = 110
const CAPTURE = 2048

function fmtTime(seconds: number): string {
  if (seconds >= 1) return `${seconds.toFixed(1)}s`
  if (seconds >= 1e-3) return `${(seconds * 1e3).toFixed(seconds >= 10e-3 ? 0 : 1)}ms`
  if (seconds >= 1e-6) return `${(seconds * 1e6).toFixed(seconds >= 10e-6 ? 0 : 1)}us`
  return `${(seconds * 1e9).toFixed(0)}ns`
}

function fmtFreq(hz: number): string {
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(2)}MHz`
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(2)}kHz`
  return `${hz.toFixed(1)}Hz`
}

interface Channel {
  probe: { chipRef: string; pin: string }
  label: string
  analog: AnalogTrace | null
  family: string
}

export function Scope() {
  const probes = useSim((s) => s.probes)
  const armedChannel = useSim((s) => s.armedChannel)
  const armChannel = useSim((s) => s.armChannel)
  const setProbe = useSim((s) => s.setProbe)
  const traceVersion = useSim((s) => s.traceVersion)
  const vcc = useSim((s) => s.psu.vcc)
  const hz = useSim((s) => s.hz)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [timeDiv, setTimeDiv] = useState(10e-3)
  const [voltDiv, setVoltDiv] = useState(2)
  const [offsets, setOffsets] = useState([1, -3.4, 0.2, -2.4])
  const [hPos, setHPos] = useState(0)
  const [trigMode, setTrigMode] = useState<'auto' | 'normal' | 'off'>('auto')
  const [trigSource, setTrigSource] = useState(0)
  const [trigRising, setTrigRising] = useState(true)
  const [trigLevel, setTrigLevel] = useState(2.5)
  const [fftOn, setFftOn] = useState(false)
  const [hold, setHold] = useState(false)

  const heldChannels = useRef<(Channel | null)[]>([null, null, null, null])
  const dragRef = useRef<{ startX: number; baseHPos: number } | null>(null)

  const channels = useMemo<(Channel | null)[]>(() => {
    if (hold) return heldChannels.current
    const trace = machine.recentTrace(CAPTURE)
    const built = probes.map((probe) => {
      if (!probe) return null
      const located = findChip(probe.chipRef)
      const signal = located?.chip.signals?.[probe.pin]
      const part = located ? PARTS[located.chip.part] : undefined
      if (!signal || !part) {
        return { probe, label: 'no signal model', analog: null, family: part?.family ?? 'HC' } as Channel
      }
      return {
        probe,
        label: signal.label,
        analog: buildAnalogTrace(signal, trace, hz, vcc, part.family),
        family: part.family,
      } as Channel
    })
    heldChannels.current = built
    return built
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [probes, traceVersion, hz, vcc, hold])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = PLOT_HEIGHT + (fftOn ? FFT_HEIGHT + 8 : 0)
    if (width < 60) return
    canvas.style.height = `${height}px`
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.font = '9.5px ui-monospace, Menlo, monospace'
    ctx.textBaseline = 'middle'

    const plotW = width - 12
    const plotX = 6
    const pxPerDivX = plotW / H_DIVS
    const pxPerDivY = (PLOT_HEIGHT - 12) / V_DIVS
    const centerY = 6 + (PLOT_HEIGHT - 12) / 2

    ctx.strokeStyle = '#161b22'
    ctx.lineWidth = 1
    for (let i = 0; i <= H_DIVS; i++) {
      const x = plotX + i * pxPerDivX + 0.5
      ctx.beginPath()
      ctx.moveTo(x, 6)
      ctx.lineTo(x, PLOT_HEIGHT - 6)
      ctx.stroke()
    }
    for (let i = 0; i <= V_DIVS; i++) {
      const y = 6 + i * pxPerDivY + 0.5
      ctx.beginPath()
      ctx.moveTo(plotX, y)
      ctx.lineTo(plotX + plotW, y)
      ctx.stroke()
    }
    ctx.strokeStyle = '#242c38'
    ctx.beginPath()
    ctx.moveTo(plotX, centerY + 0.5)
    ctx.lineTo(plotX + plotW, centerY + 0.5)
    ctx.moveTo(plotX + plotW / 2 + 0.5, 6)
    ctx.lineTo(plotX + plotW / 2 + 0.5, PLOT_HEIGHT - 6)
    ctx.stroke()

    const window_ = timeDiv * H_DIVS
    const source = channels[trigSource]
    let tEnd = 0
    let triggered = false
    if (source?.analog) {
      tEnd = source.analog.durationS
      if (trigMode !== 'off') {
        const found = findTrigger(source.analog, trigLevel, trigRising, source.analog.durationS - window_ * 0.1)
        if (found !== null) {
          tEnd = found + window_ / 2
          triggered = true
        } else if (trigMode === 'normal') {
          tEnd = -1
        }
      }
    } else {
      const first = channels.find((c) => c?.analog)
      tEnd = first?.analog?.durationS ?? 0
    }
    const tStart = tEnd - window_ + hPos * window_ * 0.5

    const voltsToY = (v: number, offsetDivs: number) => centerY - (v / voltDiv + offsetDivs) * pxPerDivY

    if (source?.analog && trigMode !== 'off') {
      const part = findChip(source.probe.chipRef)
      const spec = part ? PARTS[part.chip.part] : undefined
      ctx.setLineDash([3, 5])
      if (spec?.vihV !== undefined) {
        ctx.strokeStyle = '#3d4550'
        ctx.beginPath()
        ctx.moveTo(plotX, voltsToY(spec.vihV, offsets[trigSource]))
        ctx.lineTo(plotX + plotW, voltsToY(spec.vihV, offsets[trigSource]))
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(plotX, voltsToY(spec.vilV ?? 0, offsets[trigSource]))
        ctx.lineTo(plotX + plotW, voltsToY(spec.vilV ?? 0, offsets[trigSource]))
        ctx.stroke()
      }
      ctx.strokeStyle = PROBE_COLORS[trigSource] + '55'
      ctx.beginPath()
      ctx.moveTo(plotX, voltsToY(trigLevel, offsets[trigSource]))
      ctx.lineTo(plotX + plotW, voltsToY(trigLevel, offsets[trigSource]))
      ctx.stroke()
      ctx.setLineDash([])
    }

    if (tEnd >= 0) {
      channels.forEach((channel, index) => {
        if (!channel?.analog) return
        const color = PROBE_COLORS[index]
        const offset = offsets[index]

        ctx.fillStyle = color
        ctx.fillText('▸', 0, voltsToY(0, offset))

        ctx.save()
        ctx.beginPath()
        ctx.rect(plotX, 6, plotW, PLOT_HEIGHT - 12)
        ctx.clip()
        ctx.strokeStyle = color
        ctx.lineWidth = 1.3
        ctx.beginPath()
        const steps = plotW
        for (let x = 0; x <= steps; x++) {
          const t0 = tStart + (x / steps) * window_
          let vMin = Infinity
          let vMax = -Infinity
          for (let s = 0; s < 3; s++) {
            const v = channel.analog.sample(t0 + (s / 3) * (window_ / steps))
            vMin = Math.min(vMin, v)
            vMax = Math.max(vMax, v)
          }
          const yMid = voltsToY((vMin + vMax) / 2, offset)
          if (x === 0) ctx.moveTo(plotX + x, yMid)
          else ctx.lineTo(plotX + x, yMid)
          if (vMax - vMin > voltDiv * 0.02) {
            ctx.moveTo(plotX + x, voltsToY(vMax, offset))
            ctx.lineTo(plotX + x, voltsToY(vMin, offset))
            ctx.moveTo(plotX + x, yMid)
          }
        }
        ctx.stroke()
        ctx.restore()
      })
    } else {
      ctx.fillStyle = '#5a6470'
      ctx.fillText('waiting for trigger...', plotX + plotW / 2 - 50, centerY)
    }

    ctx.fillStyle = triggered ? '#66e08a' : trigMode === 'off' ? '#5a6470' : '#ffcf66'
    ctx.fillText(triggered ? `TRIG'D CH${trigSource + 1} ${trigRising ? '/' : '\\'} ${trigLevel.toFixed(1)}V` : trigMode === 'off' ? 'free run' : 'AUTO', plotX + 4, PLOT_HEIGHT - 14)
    ctx.fillStyle = '#8a94a2'
    ctx.fillText(`${fmtTime(timeDiv)}/div   ${voltDiv}V/div`, plotX + plotW - 130, PLOT_HEIGHT - 14)

    if (fftOn && tEnd >= 0) {
      const fftTop = PLOT_HEIGHT + 8
      const fftChannel = channels[trigSource]?.analog ? channels[trigSource] : channels.find((c) => c?.analog)
      if (fftChannel?.analog) {
        const n = 1024
        const samples: number[] = []
        for (let i = 0; i < n; i++) {
          samples.push(fftChannel.analog.sample(tStart + (i / n) * window_))
        }
        const mean = samples.reduce((a, b) => a + b, 0) / n
        const magnitudes = fftMagnitudes(
          samples.map((s, i) => (s - mean) * 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)))),
        )
        const fs = n / window_
        const peakIndex = magnitudes.indexOf(Math.max(...magnitudes.slice(1)))

        ctx.strokeStyle = '#161b22'
        ctx.strokeRect(plotX + 0.5, fftTop + 0.5, plotW, FFT_HEIGHT - 16)
        const color = PROBE_COLORS[channels.indexOf(fftChannel)]
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.beginPath()
        const bins = Math.min(magnitudes.length, plotW)
        for (let x = 0; x < bins; x++) {
          const bin = Math.floor((x / bins) * magnitudes.length)
          const db = 20 * Math.log10(magnitudes[bin] + 1e-6)
          const y = fftTop + 2 + Math.min(FFT_HEIGHT - 20, Math.max(0, ((0 - db) / 80) * (FFT_HEIGHT - 20)))
          if (x === 0) ctx.moveTo(plotX + x, y)
          else ctx.lineTo(plotX + x, y)
        }
        ctx.stroke()
        ctx.fillStyle = '#8a94a2'
        ctx.fillText(`FFT 0..${fmtFreq(fs / 2)}   peak ${fmtFreq((peakIndex * fs) / n)}   0..-80dB`, plotX + 4, fftTop + FFT_HEIGHT - 8)
      }
    }
  }, [channels, timeDiv, voltDiv, offsets, hPos, trigMode, trigSource, trigRising, trigLevel, fftOn, vcc])

  const nudgeOffset = (index: number, delta: number) => {
    setOffsets((prev) => prev.map((v, i) => (i === index ? Math.max(-4, Math.min(4, v + delta)) : v)))
  }

  const measurements = channels.map((channel) => {
    if (!channel?.analog) return null
    const transitions = channel.analog.transitions
    if (transitions.length < 3) return { vpp: channel.analog.levels.high - channel.analog.levels.low, freq: 0 }
    const rising = transitions.filter((t) => t.rising)
    let freq = 0
    if (rising.length >= 2) {
      freq = (rising.length - 1) / (rising[rising.length - 1].t - rising[0].t)
    }
    return { vpp: channel.analog.levels.high - channel.analog.levels.low, freq }
  })

  return (
    <div className="scope">
      <div className="scope-controls">
        {probes.map((probe, channel) => (
          <span key={channel} className="scope-channel">
            <button
              className={armedChannel === channel ? 'scope-arm armed' : 'scope-arm'}
              style={{ borderColor: PROBE_COLORS[channel], color: PROBE_COLORS[channel] }}
              onClick={() => armChannel(armedChannel === channel ? null : channel)}
              title="Arm this channel, then click a chip pin in the scene"
            >
              CH{channel + 1}
            </button>
            {probe && (
              <button className="scope-clear" onClick={() => setProbe(channel, null)} title="Remove probe">
                ×
              </button>
            )}
          </span>
        ))}
        <button className={hold ? 'toggle on' : 'toggle'} onClick={() => setHold(!hold)}>
          {hold ? 'Stopped' : 'Running'}
        </button>
        <button className={fftOn ? 'toggle on' : 'toggle'} onClick={() => setFftOn(!fftOn)}>
          FFT
        </button>
      </div>

      <div className="scope-controls">
        <label>
          t/div
          <select value={timeDiv} onChange={(e) => setTimeDiv(Number(e.target.value))}>
            {TIME_DIVS.map((t) => (
              <option key={t} value={t}>
                {fmtTime(t)}
              </option>
            ))}
          </select>
        </label>
        <label>
          V/div
          <select value={voltDiv} onChange={(e) => setVoltDiv(Number(e.target.value))}>
            {VOLT_DIVS.map((v) => (
              <option key={v} value={v}>
                {v}V
              </option>
            ))}
          </select>
        </label>
        <label className="scope-hpos">
          h-pos
          <input type="range" min={-1} max={1} step={0.01} value={hPos} onChange={(e) => setHPos(Number(e.target.value))} />
        </label>
      </div>

      <div className="scope-controls">
        <label>
          trig
          <select value={trigMode} onChange={(e) => setTrigMode(e.target.value as typeof trigMode)}>
            <option value="auto">auto</option>
            <option value="normal">normal</option>
            <option value="off">off</option>
          </select>
        </label>
        <label>
          src
          <select value={trigSource} onChange={(e) => setTrigSource(Number(e.target.value))}>
            {[0, 1, 2, 3].map((i) => (
              <option key={i} value={i}>
                CH{i + 1}
              </option>
            ))}
          </select>
        </label>
        <button className="toggle" onClick={() => setTrigRising(!trigRising)} title="Trigger slope">
          {trigRising ? '/ rising' : '\\ falling'}
        </button>
        <label className="scope-hpos">
          level {trigLevel.toFixed(1)}V
          <input type="range" min={0} max={6} step={0.1} value={trigLevel} onChange={(e) => setTrigLevel(Number(e.target.value))} />
        </label>
      </div>

      <canvas
        ref={canvasRef}
        className="scope-canvas"
        onPointerDown={(e) => {
          dragRef.current = { startX: e.clientX, baseHPos: hPos }
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const drag = dragRef.current
          if (!drag) return
          const plotWidth = Math.max(1, (e.currentTarget as HTMLElement).clientWidth - 12)
          const next = drag.baseHPos - ((e.clientX - drag.startX) / plotWidth) * 2
          setHPos(Math.max(-1, Math.min(1, next)))
        }}
        onPointerUp={() => {
          dragRef.current = null
        }}
        onWheel={(e) => {
          const index = TIME_DIVS.indexOf(timeDiv)
          const next = TIME_DIVS[Math.max(0, Math.min(TIME_DIVS.length - 1, index + (e.deltaY > 0 ? 1 : -1)))]
          setTimeDiv(next)
        }}
      />

      <div className="scope-measure">
        {channels.map((channel, index) =>
          channel ? (
            <span key={index} style={{ color: PROBE_COLORS[index] }}>
              CH{index + 1} {channel.probe.chipRef}.{channel.probe.pin} {channel.label}
              {measurements[index] && measurements[index]!.freq > 0 ? ` ${fmtFreq(measurements[index]!.freq)}` : ''}
              {measurements[index] ? ` ${measurements[index]!.vpp.toFixed(1)}Vpp` : ''}
              <button onClick={() => nudgeOffset(index, 0.5)} title="Move up">
                ▲
              </button>
              <button onClick={() => nudgeOffset(index, -0.5)} title="Move down">
                ▼
              </button>
            </span>
          ) : null,
        )}
      </div>
    </div>
  )
}
