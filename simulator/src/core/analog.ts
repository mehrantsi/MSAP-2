import { TraceEntry } from './machine'
import { PinSignal } from './modules'
import { outputLevels, PartSpec } from './parts'

export interface AnalogModel {
  riseTimeS: number
  ringFreqHz: number
  ringDecayS: number
  overshoot: number
  noiseVrms: number
}

export function analogModelFor(family: PartSpec['family']): AnalogModel {
  switch (family) {
    case 'LS':
      return { riseTimeS: 15e-9, ringFreqHz: 38e6, ringDecayS: 30e-9, overshoot: 0.06, noiseVrms: 0.014 }
    case 'CMOS':
      return { riseTimeS: 25e-9, ringFreqHz: 30e6, ringDecayS: 35e-9, overshoot: 0.05, noiseVrms: 0.012 }
    case 'analog':
      return { riseTimeS: 90e-9, ringFreqHz: 12e6, ringDecayS: 60e-9, overshoot: 0.03, noiseVrms: 0.01 }
    default:
      return { riseTimeS: 5.5e-9, ringFreqHz: 46e6, ringDecayS: 24e-9, overshoot: 0.09, noiseVrms: 0.012 }
  }
}

export interface AnalogTrace {
  sample: (t: number) => number
  durationS: number
  transitions: { t: number; rising: boolean }[]
  levels: { high: number; low: number }
}

function hashNoise(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}

export function buildAnalogTrace(
  signal: PinSignal,
  trace: TraceEntry[],
  clockHz: number,
  vcc: number,
  family: PartSpec['family'],
): AnalogTrace {
  const period = 1 / clockHz
  const levels = outputLevels(family, vcc)
  const model = analogModelFor(family)
  const durationS = trace.length * period

  const states: number[] = trace.map((entry) => signal.sample(entry))
  const transitions: { t: number; rising: boolean }[] = []
  for (let i = 1; i < states.length; i++) {
    if (states[i] !== states[i - 1]) {
      transitions.push({ t: i * period, rising: states[i] === 1 })
    }
  }

  const edgeSpan = model.riseTimeS * 2.2
  const ringSpan = model.ringDecayS * 5

  const sample = (t: number): number => {
    if (trace.length === 0) return levels.low
    const clamped = Math.min(Math.max(t, 0), durationS - 1e-12)
    const index = Math.min(states.length - 1, Math.floor(clamped / period))
    let v = states[index] ? levels.high : levels.low

    let lo = 0
    let hi = transitions.length - 1
    let nearest = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (transitions[mid].t <= clamped) {
        nearest = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }

    if (nearest >= 0) {
      const edge = transitions[nearest]
      const dt = clamped - edge.t
      const from = edge.rising ? levels.low : levels.high
      const to = edge.rising ? levels.high : levels.low
      if (dt < edgeSpan) {
        const x = dt / model.riseTimeS
        const shape = 1 - Math.exp(-2.95 * x)
        v = from + (to - from) * Math.min(1, shape)
      }
      if (dt >= 0 && dt < ringSpan) {
        const ring =
          (to - from) *
          model.overshoot *
          Math.exp(-dt / model.ringDecayS) *
          Math.sin(2 * Math.PI * model.ringFreqHz * (dt + model.riseTimeS * 0.4))
        if (dt > model.riseTimeS * 0.5) v += ring
      }
    }

    if (nearest + 1 < transitions.length) {
      const upcoming = transitions[nearest + 1]
      const lead = upcoming.t - clamped
      if (lead < model.riseTimeS * 0.35) {
        const from = upcoming.rising ? levels.low : levels.high
        const to = upcoming.rising ? levels.high : levels.low
        v = from + ((to - from) * 0.08 * (model.riseTimeS * 0.35 - lead)) / (model.riseTimeS * 0.35)
      }
    }

    v += hashNoise(Math.floor(clamped * 2.5e8) + 0.5) * model.noiseVrms * 2.2
    v += hashNoise(Math.floor(clamped * 1.9e7)) * model.noiseVrms * 0.9
    return v
  }

  return { sample, durationS, transitions, levels }
}

export function findTrigger(
  trace: AnalogTrace,
  level: number,
  rising: boolean,
  before: number,
): number | null {
  for (let i = trace.transitions.length - 1; i >= 0; i--) {
    const transition = trace.transitions[i]
    if (transition.t > before) continue
    if (transition.rising !== rising) continue
    const { high, low } = trace.levels
    if (level >= Math.min(low, high) - 0.2 && level <= Math.max(low, high) + 0.2) {
      return transition.t
    }
  }
  return null
}

export function fftMagnitudes(samples: number[]): number[] {
  const n = samples.length
  const re = samples.slice()
  const im = new Array<number>(n).fill(0)

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      const tr = re[i]
      re[i] = re[j]
      re[j] = tr
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len
    const wRe = Math.cos(angle)
    const wIm = Math.sin(angle)
    for (let i = 0; i < n; i += len) {
      let curRe = 1
      let curIm = 0
      for (let k = 0; k < len / 2; k++) {
        const evenRe = re[i + k]
        const evenIm = im[i + k]
        const oddRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm
        const oddIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe
        re[i + k] = evenRe + oddRe
        im[i + k] = evenIm + oddIm
        re[i + k + len / 2] = evenRe - oddRe
        im[i + k + len / 2] = evenIm - oddIm
        const nextRe = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = nextRe
      }
    }
  }

  const out: number[] = []
  for (let i = 0; i < n / 2; i++) {
    out.push((2 / n) * Math.hypot(re[i], im[i]))
  }
  return out
}
