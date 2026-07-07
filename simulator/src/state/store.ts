import { create } from 'zustand'
import { assemble, AsmError } from '../core/asm'
import {
  activeFindChip,
  CustomDesign,
  freshDesign,
  loadDesign,
  nextBoardId,
  nextChipRef,
  nextPassiveRef,
  persistDesign,
  setActiveDesign,
} from '../core/design'
import { estimatePower } from '../core/electrical'
import { Machine, Snapshot } from '../core/machine'
import { ConnectionDef, PassiveKind } from '../core/modules'
import { currentMachine, storageKey } from '../machines'

export const machine: Machine = currentMachine().createCore()

export function activeIsa() {
  return currentMachine().isa
}

const initialDesign = loadDesign()
setActiveDesign(initialDesign)

export type ViewMode = '3d' | '2d'
export type InspectorTab = 'state' | 'ram' | 'power' | 'chip'

export interface Probe {
  chipRef: string
  pin: string
}

export interface PanelState {
  x: number
  y: number
  collapsed: boolean
  visible: boolean
  maximized?: boolean
}

export interface PsuState {
  on: boolean
  vcc: number
  limitMa: number
  tripped: boolean
}

export const PANEL_IDS = ['program', 'inspector', 'sniffer', 'scope', 'psu', 'schematic', 'terminal', 'microcode'] as const
export type PanelId = (typeof PANEL_IDS)[number]

const PANEL_DEFAULTS: Record<PanelId, PanelState> = {
  program: { x: 14, y: 52, collapsed: false, visible: true },
  inspector: { x: -344, y: 52, collapsed: false, visible: true },
  sniffer: { x: 14, y: -320, collapsed: false, visible: true },
  scope: { x: -680, y: -540, collapsed: false, visible: false },
  psu: { x: 330, y: 52, collapsed: false, visible: false },
  schematic: { x: 360, y: 90, collapsed: false, visible: false },
  terminal: { x: -560, y: -420, collapsed: false, visible: true },
  microcode: { x: 340, y: 70, collapsed: false, visible: false },
}

const DEFAULT_PROBES: (Probe | null)[] = [{ chipRef: 'U2', pin: '2' }, { chipRef: 'U8', pin: '18' }, null, null]

function loadProbes(): (Probe | null)[] {
  try {
    const raw = localStorage.getItem(storageKey('msap1-probes'))
    if (raw) {
      const parsed = JSON.parse(raw) as (Probe | null)[]
      if (Array.isArray(parsed) && parsed.length === 4) return parsed
    }
  } catch {
    /* fresh defaults */
  }
  return DEFAULT_PROBES
}

function persistProbes(probes: (Probe | null)[]): void {
  try {
    localStorage.setItem(storageKey('msap1-probes'), JSON.stringify(probes))
  } catch {
    /* private mode */
  }
}

type WireToggles = Record<'bus' | 'ctl' | 'clk', boolean>

function loadWireToggles(): WireToggles {
  try {
    const raw = localStorage.getItem(storageKey('msap1-wires'))
    if (raw) return { bus: true, ctl: true, clk: false, ...JSON.parse(raw) }
  } catch {
    /* fresh */
  }
  return { bus: true, ctl: true, clk: false }
}

function storeWireToggles(wires: WireToggles): void {
  try {
    localStorage.setItem(storageKey('msap1-wires'), JSON.stringify(wires))
  } catch {
    /* private mode */
  }
}

function loadSchematicView(): Record<string, { zoom: number; wires: boolean }> {
  try {
    const raw = localStorage.getItem(storageKey('msap1-schview'))
    if (raw) return JSON.parse(raw)
  } catch {
    /* fresh */
  }
  return {}
}

function loadPanels(): Record<PanelId, PanelState> {
  try {
    const raw = localStorage.getItem('msap1-panels')
    if (raw) return { ...PANEL_DEFAULTS, ...JSON.parse(raw) }
  } catch {
    /* fresh defaults */
  }
  return { ...PANEL_DEFAULTS }
}

function persistPanels(panels: Record<PanelId, PanelState>): void {
  try {
    localStorage.setItem('msap1-panels', JSON.stringify(panels))
  } catch {
    /* private mode */
  }
}

interface SimStore {
  snap: Snapshot
  running: boolean
  hz: number
  signed: boolean
  view: ViewMode
  source: string
  asmError: AsmError | null
  loadedName: string | null
  labels: [string, number][]
  breakpoints: number[]
  selectedChip: string | null
  selectedPassive: { moduleId: string; ref: string } | null
  designerBoard: string
  schematicSel: { ref: string; pin: string } | null
  selectedNet: string | null
  schematicView: Record<string, { zoom: number; wires: boolean }>
  inspectorTab: InspectorTab
  traceVersion: number
  wires: Record<'bus' | 'ctl' | 'clk', boolean>
  dragMode: 'orbit' | 'pan'
  psu: PsuState
  probes: (Probe | null)[]
  armedChannel: number | null
  panels: Record<PanelId, PanelState>
  tooltip: { text: string; x: number; y: number } | null
  design: CustomDesign
  designVersion: number

  refresh: () => void
  setRunning: (running: boolean) => void
  setHz: (hz: number) => void
  setSigned: (signed: boolean) => void
  setView: (view: ViewMode) => void
  setSource: (source: string) => void
  setInspectorTab: (tab: InspectorTab) => void
  selectChip: (ref: string | null) => void
  toggleWires: (kind: 'bus' | 'ctl' | 'clk') => void
  setDragMode: (mode: 'orbit' | 'pan') => void
  setPsu: (patch: Partial<PsuState>) => void
  setProbe: (channel: number, probe: Probe | null) => void
  armChannel: (channel: number | null) => void
  setPanel: (id: PanelId, patch: Partial<PanelState>) => void
  setTooltip: (tooltip: { text: string; x: number; y: number } | null) => void
  addBoard: (name: string, column: 'left' | 'right') => void
  addChip: (moduleId: string, part: string) => void
  addPassive: (moduleId: string, kind: PassiveKind, value: string, color?: string) => void
  addConnection: (conn: ConnectionDef) => void
  swapChip: (ref: string, part: string) => void
  revertSwap: (ref: string) => void
  setPassiveValue: (moduleId: string, ref: string, value: string) => void
  setPinNet: (ref: string, pin: string, net: string) => void
  removePinNet: (ref: string, pin: string) => void
  setDesignerBoard: (id: string) => void
  setSchematicSel: (sel: { ref: string; pin: string } | null) => void
  setSelectedNet: (net: string | null) => void
  setSchematicView: (boardId: string, patch: Partial<{ zoom: number; wires: boolean }>) => void
  setSchematicPos: (ref: string, x: number, y: number) => void
  clearSchematicPos: (ref: string) => void
  removeBaseWire: (key: string) => void
  restoreBaseWire: (key: string) => void
  resetDesign: () => void
  selectPassive: (sel: { moduleId: string; ref: string } | null) => void
  removeChip: (moduleId: string, ref: string) => void
  removePassive: (moduleId: string, ref: string) => void
  removeBoard: (id: string) => void
  removeConnection: (index: number) => void
  assembleAndLoad: () => void
  loadExample: (name: string) => void
  reset: () => void
  stepT: () => void
  stepInstruction: () => void
  toggleBreakpoint: (addr: number) => void
}

export const useSim = create<SimStore>((set, get) => ({
  snap: machine.snapshot(),
  running: false,
  hz: 100000,
  signed: false,
  view: '3d',
  source: currentMachine().examples[0].source,
  asmError: null,
  loadedName: null,
  labels: [],
  breakpoints: [],
  selectedChip: null,
  selectedPassive: null,
  designerBoard: 'ram',
  schematicSel: null,
  selectedNet: null,
  schematicView: loadSchematicView(),
  inspectorTab: 'state',
  traceVersion: 0,
  wires: loadWireToggles(),
  dragMode: 'orbit',
  psu: { on: true, vcc: 5, limitMa: 800, tripped: false },
  probes: loadProbes(),
  armedChannel: null,
  panels: loadPanels(),
  tooltip: null,
  design: initialDesign,
  designVersion: 0,

  refresh: () => set((s) => ({ snap: machine.snapshot(), traceVersion: s.traceVersion + 1 })),
  setRunning: (running) => set({ running }),
  setHz: (hz) => set({ hz }),
  setSigned: (signed) => set({ signed }),
  setView: (view) => set({ view }),
  setSource: (source) => set({ source }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
  selectChip: (ref) => {
    const board = ref ? activeFindChip(ref)?.module.id : undefined
    set({
      selectedChip: ref,
      selectedPassive: null,
      inspectorTab: ref ? 'chip' : get().inspectorTab,
      ...(board ? { designerBoard: board } : {}),
    })
  },
  selectPassive: (sel) =>
    set({
      selectedPassive: sel,
      selectedChip: null,
      inspectorTab: sel ? 'chip' : get().inspectorTab,
      ...(sel ? { designerBoard: sel.moduleId } : {}),
    }),
  setDesignerBoard: (designerBoard) => set({ designerBoard }),
  setSchematicSel: (schematicSel) => set({ schematicSel }),
  setSelectedNet: (selectedNet) => set({ selectedNet }),
  setSchematicView: (boardId, patch) => {
    const current = get().schematicView[boardId] ?? { zoom: 1, wires: true }
    const schematicView = { ...get().schematicView, [boardId]: { ...current, ...patch } }
    try {
      localStorage.setItem(storageKey('msap1-schview'), JSON.stringify(schematicView))
    } catch {
      /* private mode */
    }
    set({ schematicView })
  },
  setSchematicPos: (ref, x, y) => {
    const design = structuredClone(get().design)
    design.schematicPos = design.schematicPos ?? {}
    design.schematicPos[ref] = { x: Math.round(x), y: Math.round(y) }
    applyDesign(design, set)
  },

  clearSchematicPos: (ref) => {
    const design = structuredClone(get().design)
    if (design.schematicPos) delete design.schematicPos[ref]
    applyDesign(design, set)
  },

  removeBaseWire: (key) => {
    const design = structuredClone(get().design)
    design.removedWires = design.removedWires ?? []
    if (!design.removedWires.includes(key)) design.removedWires.push(key)
    applyDesign(design, set)
  },

  restoreBaseWire: (key) => {
    const design = structuredClone(get().design)
    design.removedWires = (design.removedWires ?? []).filter((k) => k !== key)
    applyDesign(design, set)
  },

  resetDesign: () => {
    const design = freshDesign()
    try {
      localStorage.removeItem(storageKey('msap1-design'))
    } catch {
      /* private mode */
    }
    setActiveDesign(design)
    set({ design, designVersion: get().designVersion + 1, designerBoard: 'ram', selectedChip: null, selectedPassive: null })
  },
  toggleWires: (kind) =>
    set((s) => {
      const wires = { ...s.wires, [kind]: !s.wires[kind] }
      storeWireToggles(wires)
      return { wires }
    }),
  setDragMode: (dragMode) => set({ dragMode }),

  setPsu: (patch) => {
    const psu = { ...get().psu, ...patch }
    set({ psu })
    if (!psu.on || psu.tripped) set({ running: false })
  },

  setProbe: (channel, probe) => {
    const probes = [...get().probes]
    probes[channel] = probe
    persistProbes(probes)
    set({ probes, armedChannel: null })
  },

  armChannel: (channel) => set({ armedChannel: channel }),

  setPanel: (id, patch) => {
    const panels = { ...get().panels, [id]: { ...get().panels[id], ...patch } }
    persistPanels(panels)
    set({ panels })
  },

  setTooltip: (tooltip) => set({ tooltip }),

  addBoard: (name, column) => {
    const design = structuredClone(get().design)
    const id = nextBoardId()
    design.boards.push({ id, name: name.trim() || 'NEW BOARD', column })
    applyDesign(design, set)
    set({ designerBoard: id })
  },

  addChip: (moduleId, part) => {
    const design = structuredClone(get().design)
    design.chips[moduleId] = [...(design.chips[moduleId] ?? []), { ref: nextChipRef(), part }]
    applyDesign(design, set)
  },

  addPassive: (moduleId, kind, value, color) => {
    const design = structuredClone(get().design)
    design.passives[moduleId] = [
      ...(design.passives[moduleId] ?? []),
      { ref: nextPassiveRef(kind), kind, value: value.trim() || '-', ...(color ? { color } : {}) },
    ]
    applyDesign(design, set)
  },

  addConnection: (conn) => {
    const design = structuredClone(get().design)
    design.connections.push(conn)
    applyDesign(design, set)
  },

  swapChip: (ref, part) => {
    const design = structuredClone(get().design)
    design.replacements = design.replacements ?? {}
    design.replacements[ref] = part
    applyDesign(design, set)
  },

  revertSwap: (ref) => {
    const design = structuredClone(get().design)
    if (design.replacements) delete design.replacements[ref]
    applyDesign(design, set)
  },

  setPassiveValue: (moduleId, ref, value) => {
    const design = structuredClone(get().design)
    design.passiveOverrides = design.passiveOverrides ?? {}
    design.passiveOverrides[`${moduleId}:${ref}`] = value
    applyDesign(design, set)
  },

  setPinNet: (ref, pin, net) => {
    const design = structuredClone(get().design)
    design.pinNets = design.pinNets ?? {}
    design.pinNets[ref] = { ...(design.pinNets[ref] ?? {}), [pin]: net.trim() }
    applyDesign(design, set)
  },

  removePinNet: (ref, pin) => {
    const design = structuredClone(get().design)
    if (design.pinNets?.[ref]) {
      delete design.pinNets[ref][pin]
      if (Object.keys(design.pinNets[ref]).length === 0) delete design.pinNets[ref]
    }
    applyDesign(design, set)
  },

  removeChip: (moduleId, ref) => {
    const design = structuredClone(get().design)
    design.chips[moduleId] = (design.chips[moduleId] ?? []).filter((c) => c.ref !== ref)
    applyDesign(design, set)
  },

  removePassive: (moduleId, ref) => {
    const design = structuredClone(get().design)
    design.passives[moduleId] = (design.passives[moduleId] ?? []).filter((p) => p.ref !== ref)
    applyDesign(design, set)
  },

  removeBoard: (id) => {
    const design = structuredClone(get().design)
    design.boards = design.boards.filter((b) => b.id !== id)
    delete design.chips[id]
    delete design.passives[id]
    design.connections = design.connections.filter((c) => c.from !== id && c.to !== id)
    applyDesign(design, set)
  },

  removeConnection: (index) => {
    const design = structuredClone(get().design)
    design.connections.splice(index, 1)
    applyDesign(design, set)
  },

  assembleAndLoad: () => {
    const result = assemble(get().source, activeIsa())
    if (!result.ok) {
      set({ asmError: result.error })
      return
    }
    machine.mergeImage(result.result.image)
    set({
      asmError: null,
      labels: [...result.result.labels.entries()],
    })
    get().refresh()
  },

  loadExample: (name) => {
    const example = currentMachine().examples.find((e) => e.name === name)
    if (!example) return
    set({ source: example.source, loadedName: name })
    const result = assemble(example.source, activeIsa())
    if (result.ok) {
      machine.mergeImage(result.result.image)
      set({ asmError: null, labels: [...result.result.labels.entries()] })
      get().refresh()
    }
  },

  reset: () => {
    const ram = machine.ram.slice()
    machine.reset()
    machine.ram.set(ram)
    machine.devices.terminal.clear()
    set({ running: false })
    get().refresh()
  },

  stepT: () => {
    if (!powered(get().psu)) return
    machine.stepT()
    get().refresh()
  },

  stepInstruction: () => {
    if (!powered(get().psu)) return
    machine.stepInstruction()
    get().refresh()
  },

  toggleBreakpoint: (addr) => {
    if (machine.breakpoints.has(addr)) machine.breakpoints.delete(addr)
    else machine.breakpoints.add(addr)
    set({ breakpoints: [...machine.breakpoints].sort((a, b) => a - b) })
  },
}))

function applyDesign(design: CustomDesign, set: (partial: Partial<{ design: CustomDesign; designVersion: number }>) => void): void {
  persistDesign(design)
  setActiveDesign(design)
  set({ design, designVersion: useSim.getState().designVersion + 1 })
}

export function powered(psu: PsuState): boolean {
  return psu.on && !psu.tripped && psu.vcc >= 3
}

export function startRunner(): () => void {
  let raf = 0
  let last = performance.now()
  let accumulator = 0
  let avgDraw = 0
  let overSinceMs: number | null = null
  let wasTripped = false

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    const state = useSim.getState()
    const { running, hz, refresh, setRunning, psu, signed, setPsu } = state

    if (psu.tripped !== wasTripped) {
      wasTripped = psu.tripped
      if (!psu.tripped) {
        avgDraw = 0
        overSinceMs = null
      }
    }

    if (!running || machine.halted || !powered(psu)) {
      accumulator = 0
      return
    }
    accumulator += dt * hz
    let budget = Math.min(accumulator, 50000)
    let paused = false
    while (budget >= 1) {
      const { hitBreakpoint } = machine.stepT()
      budget -= 1
      accumulator -= 1
      if (hitBreakpoint || machine.halted) {
        paused = true
        break
      }
    }
    if (paused) {
      setRunning(false)
      accumulator = 0
    }
    refresh()

    const draw = estimatePower(machine.snapshot(), signed, psu.vcc, hz).totalMa
    const alpha = Math.min(1, dt / 0.25)
    avgDraw += (draw - avgDraw) * alpha
    if (avgDraw > psu.limitMa) {
      if (overSinceMs === null) overSinceMs = now
      if (now - overSinceMs > 400) {
        setPsu({ tripped: true })
        overSinceMs = null
      }
    } else {
      overSinceMs = null
    }
  }

  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}
