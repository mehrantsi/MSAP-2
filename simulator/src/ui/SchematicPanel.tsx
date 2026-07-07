import React, { useEffect, useMemo, useRef, useState } from 'react'
import { activeModules, chipNetMap, knownNets, partCatalog, passiveNetMap, passivePinCount, pinNetOf, wireKey } from '../core/design'
import { ChipDef, CONNECTIONS, ModuleDef, MODULES, PassiveDef, PassiveKind } from '../core/modules'
import { PARTS } from '../core/parts'
import { useSim } from '../state/store'

const ROW = 15
const BOX_W = 88
const STUB = 11
const LABEL_W = 76
const CELL_W = 320

const LED_COLORS: { name: string; hex: string }[] = [
  { name: 'red', hex: '#ff453a' },
  { name: 'green', hex: '#34c759' },
  { name: 'yellow', hex: '#ffd60a' },
  { name: 'blue', hex: '#4c8dff' },
]

const PASSIVE_KINDS: { kind: PassiveKind; label: string }[] = [
  { kind: 'res', label: 'resistor' },
  { kind: 'cap', label: 'capacitor' },
  { kind: 'rnet', label: 'resistor network' },
  { kind: 'pot', label: 'potentiometer' },
  { kind: 'led', label: 'LED' },
  { kind: 'ledbar', label: '10-LED bar' },
  { kind: 'switch', label: 'switch' },
]

function basePartOf(ref: string, design: { chips: Record<string, { ref: string; part: string }[]> }): string | null {
  for (const mod of MODULES) {
    const chip = mod.chips.find((c) => c.ref === ref)
    if (chip) return chip.part
  }
  for (const chips of Object.values(design.chips)) {
    const chip = chips.find((c) => c.ref === ref)
    if (chip) return chip.part
  }
  return null
}

export function netColor(net: string): string {
  if (net === 'VCC') return '#ff6b6b'
  if (net === 'GND') return '#8a94a2'
  if (net === 'NC') return '#5a6470'
  if (net.startsWith('BUS')) return '#ffb000'
  if (net.startsWith('CTL')) return '#4c8dff'
  if (net.startsWith('CLK') || net.startsWith('RST')) return '#2fd4e0'
  return '#59f07d'
}

interface NetNode {
  ref: string
  pin: string
  moduleId: string
}

function netMembers(net: string): NetNode[] {
  const out: NetNode[] = []
  for (const mod of activeModules()) {
    for (const chip of mod.chips) {
      for (const [pin, entry] of Object.entries(chipNetMap(chip))) {
        if (entry.net === net) out.push({ ref: chip.ref, pin, moduleId: mod.id })
      }
    }
    for (const passive of mod.passives) {
      for (const [pin, entry] of Object.entries(passiveNetMap(passive))) {
        if (entry.net === net) out.push({ ref: passive.ref, pin, moduleId: mod.id })
      }
    }
  }
  return out
}

function labelWidthOf(net: string): number {
  return Math.min(LABEL_W, net.length * 5.6 + 12)
}

interface WireEnd {
  x: number
  y: number
  side: 1 | -1
  net: string
}

function collectWireEnds(
  chips: { chip: ChipDef; x: number; y: number }[],
  passives: { passive: PassiveDef; x: number; y: number }[],
): WireEnd[] {
  const ends: WireEnd[] = []
  const push = (net: string | undefined, x: number, y: number, side: 1 | -1) => {
    if (!net || net === 'NC' || net === 'VCC' || net === 'GND') return
    const attach = side === 1 ? x + STUB + 3 + labelWidthOf(net) : x - STUB - 3 - labelWidthOf(net)
    ends.push({ x: attach, y, side, net })
  }
  for (const { chip, x, y } of chips) {
    const part = PARTS[chip.part]
    const pins = part?.pins ?? 16
    const small = pins <= 3
    const perSide = small ? pins : pins / 2
    const boxX = x + LABEL_W + STUB
    const boxY = y + 18
    const nets = chipNetMap(chip)
    for (let i = 0; i < perSide; i++) {
      const py = boxY + 10 + i * ROW
      push(nets[String(i + 1)]?.net, boxX, py, -1)
      if (!small) push(nets[String(pins - i)]?.net, boxX + BOX_W, py, 1)
    }
  }
  for (const { passive, x, y } of passives) {
    const nets = passiveNetMap(passive)
    const pins = passivePinCount(passive.kind, passive.value)
    if (pins > 3) {
      const boxX = x + LABEL_W + STUB
      for (let i = 0; i < pins; i++) {
        push(nets[String(i + 1)]?.net, boxX, y + 28 + i * ROW, -1)
      }
    } else {
      const glyphX = x + LABEL_W + STUB
      const midY = y + 34
      push(nets['1']?.net, glyphX, midY, -1)
      push(nets['2']?.net, glyphX + 40, midY, 1)
      if (pins === 3) push(nets['3']?.net, glyphX + 20, midY - 12, 1)
    }
  }
  return ends
}

function WireLayer({ ends, selectedNet }: { ends: WireEnd[]; selectedNet: string | null }) {
  const byNet = new Map<string, WireEnd[]>()
  for (const end of ends) {
    const list = byNet.get(end.net) ?? []
    list.push(end)
    byNet.set(end.net, list)
  }
  const paths: React.ReactElement[] = []
  for (const [net, list] of byNet) {
    if (list.length < 2) continue
    const sorted = [...list].sort((a, b) => a.y - b.y || a.x - b.x)
    const active = selectedNet === net
    const color = netColor(net)
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]
      const b = sorted[i + 1]
      const d = `M ${a.x} ${a.y} C ${a.x + a.side * 34} ${a.y}, ${b.x + b.side * 34} ${b.y}, ${b.x} ${b.y}`
      paths.push(
        <path
          key={`${net}-${i}`}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={active ? 1.5 : 0.9}
          opacity={selectedNet ? (active ? 0.95 : 0.14) : 0.32}
        />,
      )
    }
  }
  return <g>{paths}</g>
}

interface PinGlyphProps {
  refName: string
  pin: string
  net: string | null
  derived?: boolean
  x: number
  y: number
  side: 1 | -1
  selected: boolean
  netSelected: boolean
  onPick: (ref: string, pin: string, net: string | null) => void
}

function PinGlyph({ refName, pin, net, derived, x, y, side, selected, netSelected, onPick }: PinGlyphProps) {
  const stubEnd = x + side * STUB
  const color = net ? netColor(net) : '#3a4250'
  const labelW = net ? labelWidthOf(net) : 0
  const flagX = side === 1 ? stubEnd + 1 : stubEnd - 1 - labelW

  return (
    <g
      className="sch-pin"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onPick(refName, pin, net)
      }}
    >
      <rect x={side === 1 ? x : x - STUB - LABEL_W} y={y - 7} width={STUB + LABEL_W} height={14} fill="transparent" />
      <line x1={x} y1={y} x2={stubEnd} y2={y} stroke={selected ? '#ff4fd8' : '#5d6875'} strokeWidth={selected ? 1.6 : 1} />
      {net === 'NC' && (
        <g stroke="#5a6470" strokeWidth={1}>
          <line x1={stubEnd - 3} y1={y - 3} x2={stubEnd + 3} y2={y + 3} />
          <line x1={stubEnd - 3} y1={y + 3} x2={stubEnd + 3} y2={y - 3} />
        </g>
      )}
      {net && net !== 'NC' && (
        <g>
          <rect
            x={flagX}
            y={y - 6.5}
            width={labelW}
            height={13}
            rx={2.5}
            fill={netSelected ? color : '#10141a'}
            stroke={color}
            strokeWidth={netSelected ? 1.4 : 0.8}
            strokeDasharray={derived ? '3 2' : undefined}
            opacity={netSelected ? 0.95 : 0.9}
          />
          <text
            x={flagX + labelW / 2}
            y={y + 0.5}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={7.5}
            fill={netSelected ? '#0b0d10' : color}
          >
            {net.length > 12 ? net.slice(0, 11) + '…' : net}
          </text>
        </g>
      )}
      {selected && <circle cx={stubEnd} cy={y} r={2.6} fill="#ff4fd8" />}
    </g>
  )
}

type DragProps = Pick<React.SVGProps<SVGGElement>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp'>

interface ChipSymbolProps {
  chip: ChipDef
  x: number
  y: number
  sel: { ref: string; pin: string } | null
  selectedNet: string | null
  symSelected: boolean
  dragProps: DragProps
  onPick: (ref: string, pin: string, net: string | null) => void
}

function chipSymbolHeight(chip: ChipDef): number {
  const pins = PARTS[chip.part]?.pins ?? 16
  const perSide = pins <= 3 ? pins : pins / 2
  return perSide * ROW + 34
}

function ChipSymbol({ chip, x, y, sel, selectedNet, symSelected, dragProps, onPick }: ChipSymbolProps) {
  const part = PARTS[chip.part]
  const pins = part?.pins ?? 16
  const small = pins <= 3
  const perSide = small ? pins : pins / 2
  const boxX = x + LABEL_W + STUB
  const boxY = y + 18
  const boxH = perSide * ROW + 8
  const nets = chipNetMap(chip)

  const rows = []
  for (let i = 0; i < perSide; i++) {
    const py = boxY + 10 + i * ROW
    const leftPin = String(i + 1)
    rows.push(
      <g key={`l${i}`}>
        <PinGlyph
          refName={chip.ref}
          pin={leftPin}
          net={nets[leftPin]?.net ?? null}
          derived={nets[leftPin]?.source === 'signal'}
          x={boxX}
          y={py}
          side={-1}
          selected={sel?.ref === chip.ref && sel.pin === leftPin}
          netSelected={selectedNet !== null && nets[leftPin]?.net === selectedNet}
          onPick={onPick}
        />
        <text x={boxX + 4} y={py + 0.5} fontSize={7} fill="#7a8490" dominantBaseline="middle">
          {leftPin}
        </text>
      </g>,
    )
    if (!small) {
      const rightPin = String(pins - i)
      rows.push(
        <g key={`r${i}`}>
          <PinGlyph
            refName={chip.ref}
            pin={rightPin}
            net={nets[rightPin]?.net ?? null}
            derived={nets[rightPin]?.source === 'signal'}
            x={boxX + BOX_W}
            y={py}
            side={1}
            selected={sel?.ref === chip.ref && sel.pin === rightPin}
            netSelected={selectedNet !== null && nets[rightPin]?.net === selectedNet}
            onPick={onPick}
          />
          <text x={boxX + BOX_W - 4} y={py + 0.5} fontSize={7} fill="#7a8490" dominantBaseline="middle" textAnchor="end">
            {rightPin}
          </text>
        </g>,
      )
    }
  }

  return (
    <g>
      <g className="sch-handle" {...dragProps}>
        <text x={boxX} y={y + 10} fontSize={9} fill="#c9d1d9" fontWeight={700}>
          {chip.ref}
        </text>
        <text x={boxX + BOX_W} y={y + 10} fontSize={8} fill="#7a8490" textAnchor="end">
          {part?.value ?? chip.part}
        </text>
        <rect
          x={boxX}
          y={boxY}
          width={BOX_W}
          height={boxH}
          fill="#12161c"
          stroke={symSelected ? '#ff4fd8' : '#3a4250'}
          strokeWidth={symSelected ? 1.4 : 1}
          rx={2}
        />
      </g>
      {rows}
    </g>
  )
}

interface PassiveSymbolProps {
  passive: PassiveDef
  x: number
  y: number
  sel: { ref: string; pin: string } | null
  selectedNet: string | null
  symSelected: boolean
  dragProps: DragProps
  onPick: (ref: string, pin: string, net: string | null) => void
}

function passiveSymbolHeight(passive: PassiveDef): number {
  const pins = passivePinCount(passive.kind, passive.value)
  if (pins <= 3) return 58
  return pins * ROW + 34
}

function PassiveSymbol({ passive, x, y, sel, selectedNet, symSelected, dragProps, onPick }: PassiveSymbolProps) {
  const netEntries = passiveNetMap(passive)
  const nets: Record<string, string> = {}
  for (const [pin, entry] of Object.entries(netEntries)) nets[pin] = entry.net
  const pins = passivePinCount(passive.kind, passive.value)

  if (pins > 3) {
    const boxX = x + LABEL_W + STUB
    const boxH = pins * ROW + 8
    return (
      <g>
        <g className="sch-handle" {...dragProps}>
          <text x={boxX} y={y + 10} fontSize={9} fill="#c9d1d9" fontWeight={700}>
            {passive.ref}
          </text>
          <text x={boxX + 56} y={y + 10} fontSize={8} fill="#7a8490" textAnchor="end">
            {passive.value}
          </text>
          <rect
            x={boxX}
            y={y + 18}
            width={56}
            height={boxH}
            fill="#12161c"
            stroke={symSelected ? '#ff4fd8' : '#3a4250'}
            strokeWidth={symSelected ? 1.4 : 1}
            rx={2}
          />
          {passive.kind === 'ledbar' &&
            Array.from({ length: pins }, (_, i) => (
              <polygon
                key={i}
                points={`${boxX + 30},${y + 24 + i * ROW} ${boxX + 30},${y + 32 + i * ROW} ${boxX + 38},${y + 28 + i * ROW}`}
                fill={passive.color ?? '#ff453a'}
                opacity={0.75}
              />
            ))}
        </g>
        {Array.from({ length: pins }, (_, i) => {
          const pin = String(i + 1)
          const py = y + 28 + i * ROW
          return (
            <g key={pin}>
              <PinGlyph
                refName={passive.ref}
                pin={pin}
                net={nets[pin] ?? null}
                x={boxX}
                y={py}
                side={-1}
                selected={sel?.ref === passive.ref && sel.pin === pin}
                netSelected={selectedNet !== null && nets[pin] === selectedNet}
                onPick={onPick}
              />
              <text x={boxX + 4} y={py + 0.5} fontSize={7} fill="#7a8490" dominantBaseline="middle">
                {pin}
              </text>
            </g>
          )
        })}
      </g>
    )
  }

  const midY = y + 34
  const glyphX = x + LABEL_W + STUB
  const glyphW = 40
  const glyph = (() => {
    switch (passive.kind) {
      case 'res':
        return <rect x={glyphX} y={midY - 5} width={glyphW} height={10} fill="none" stroke="#c9a86b" strokeWidth={1.2} />
      case 'cap':
        return (
          <g stroke="#d98a3d" strokeWidth={1.4}>
            <line x1={glyphX + glyphW / 2 - 3} y1={midY - 8} x2={glyphX + glyphW / 2 - 3} y2={midY + 8} />
            <line x1={glyphX + glyphW / 2 + 3} y1={midY - 8} x2={glyphX + glyphW / 2 + 3} y2={midY + 8} />
            <line x1={glyphX} y1={midY} x2={glyphX + glyphW / 2 - 3} y2={midY} />
            <line x1={glyphX + glyphW / 2 + 3} y1={midY} x2={glyphX + glyphW} y2={midY} />
          </g>
        )
      case 'led':
        return (
          <g stroke={passive.color ?? '#ff453a'} strokeWidth={1.2} fill="none">
            <line x1={glyphX} y1={midY} x2={glyphX + 12} y2={midY} />
            <polygon points={`${glyphX + 12},${midY - 7} ${glyphX + 12},${midY + 7} ${glyphX + 26},${midY}`} />
            <line x1={glyphX + 26} y1={midY - 7} x2={glyphX + 26} y2={midY + 7} />
            <line x1={glyphX + 26} y1={midY} x2={glyphX + glyphW} y2={midY} />
          </g>
        )
      case 'switch':
        return (
          <g stroke="#b8bec8" strokeWidth={1.2} fill="#b8bec8">
            <line x1={glyphX} y1={midY} x2={glyphX + 10} y2={midY} />
            <circle cx={glyphX + 12} cy={midY} r={2} />
            <line x1={glyphX + 12} y1={midY} x2={glyphX + 28} y2={midY - 9} />
            <circle cx={glyphX + 28} cy={midY} r={2} />
            <line x1={glyphX + 30} y1={midY} x2={glyphX + glyphW} y2={midY} />
          </g>
        )
      default:
        return (
          <g stroke="#2f5aa8" strokeWidth={1.2} fill="none">
            <rect x={glyphX + 4} y={midY - 5} width={glyphW - 8} height={10} />
            <line x1={glyphX} y1={midY} x2={glyphX + 4} y2={midY} />
            <line x1={glyphX + glyphW - 4} y1={midY} x2={glyphX + glyphW} y2={midY} />
          </g>
        )
    }
  })()

  return (
    <g>
      <g className="sch-handle" {...dragProps}>
        {symSelected && (
          <rect x={glyphX - 4} y={y + 18} width={glyphW + 8} height={28} fill="none" stroke="#ff4fd8" strokeWidth={1.2} rx={3} />
        )}
        <text x={glyphX} y={y + 14} fontSize={9} fill="#c9d1d9" fontWeight={700}>
          {passive.ref}
        </text>
        <text x={glyphX + glyphW} y={y + 14} fontSize={8} fill="#7a8490" textAnchor="end">
          {passive.value}
        </text>
        {glyph}
      </g>
      <PinGlyph
        refName={passive.ref}
        pin="1"
        net={nets['1'] ?? null}
        x={glyphX}
        y={midY}
        side={-1}
        selected={sel?.ref === passive.ref && sel.pin === '1'}
        netSelected={selectedNet !== null && nets['1'] === selectedNet}
        onPick={onPick}
      />
      <PinGlyph
        refName={passive.ref}
        pin="2"
        net={nets['2'] ?? null}
        x={glyphX + glyphW}
        y={midY}
        side={1}
        selected={sel?.ref === passive.ref && sel.pin === '2'}
        netSelected={selectedNet !== null && nets['2'] === selectedNet}
        onPick={onPick}
      />
      {pins === 3 && (
        <PinGlyph
          refName={passive.ref}
          pin="3"
          net={nets['3'] ?? null}
          x={glyphX + 20}
          y={midY - 12}
          side={1}
          selected={sel?.ref === passive.ref && sel.pin === '3'}
          netSelected={selectedNet !== null && nets['3'] === selectedNet}
          onPick={onPick}
        />
      )}
    </g>
  )
}

export function SchematicPanel() {
  const designVersion = useSim((s) => s.designVersion)
  const design = useSim((s) => s.design)
  const boardId = useSim((s) => s.designerBoard)
  const setDesignerBoard = useSim((s) => s.setDesignerBoard)
  const sel = useSim((s) => s.schematicSel)
  const setSel = useSim((s) => s.setSchematicSel)
  const selectedNet = useSim((s) => s.selectedNet)
  const setSelectedNet = useSim((s) => s.setSelectedNet)
  const setPinNet = useSim((s) => s.setPinNet)
  const removePinNet = useSim((s) => s.removePinNet)
  const maximized = useSim((s) => s.panels.schematic?.maximized === true)
  const schematicView = useSim((s) => s.schematicView)
  const setSchematicView = useSim((s) => s.setSchematicView)
  const setSchematicPos = useSim((s) => s.setSchematicPos)
  const clearSchematicPos = useSim((s) => s.clearSchematicPos)
  const addBoard = useSim((s) => s.addBoard)
  const removeBoard = useSim((s) => s.removeBoard)
  const addChip = useSim((s) => s.addChip)
  const addPassive = useSim((s) => s.addPassive)
  const removeChip = useSim((s) => s.removeChip)
  const removePassive = useSim((s) => s.removePassive)
  const resetDesign = useSim((s) => s.resetDesign)
  const swapChip = useSim((s) => s.swapChip)
  const revertSwap = useSim((s) => s.revertSwap)
  const addConnection = useSim((s) => s.addConnection)
  const removeConnection = useSim((s) => s.removeConnection)
  const removeBaseWire = useSim((s) => s.removeBaseWire)
  const restoreBaseWire = useSim((s) => s.restoreBaseWire)

  const modules = useMemo(() => activeModules(), [designVersion])
  const boards = modules.filter((m) => m.id !== 'bus')
  const board: ModuleDef | undefined = boards.find((m) => m.id === boardId) ?? boards[0]

  const [netDraft, setNetDraft] = useState('')
  const [selectedSym, setSelectedSym] = useState<string | null>(null)
  const [wireTo, setWireTo] = useState('bus')
  const [wireKind, setWireKind] = useState<'bus' | 'ctl' | 'clk'>('bus')
  const [addPart, setAddPart] = useState('74HC161')
  const [addKind, setAddKind] = useState<PassiveKind>('led')
  const [addValue, setAddValue] = useState('red')
  const [addColor, setAddColor] = useState('#ff453a')
  const [boardName, setBoardName] = useState('')
  const [column, setColumn] = useState<'left' | 'right'>('right')
  const [drag, setDrag] = useState<{ ref: string; x: number; y: number } | null>(null)
  const dragInfo = useRef<{ ref: string; dx: number; dy: number; x: number; y: number; moved: boolean } | null>(null)

  useEffect(() => {
    setNetDraft(selectedNet && selectedNet !== 'NC' ? selectedNet : '')
  }, [sel, selectedNet])

  const bodyRef = useRef<HTMLDivElement>(null)
  const boardIdRef = useRef('ram')
  boardIdRef.current = board?.id ?? 'ram'
  const panRef = useRef<{ startX: number; startY: number; left: number; top: number; moved: boolean } | null>(null)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const state = useSim.getState()
      const id = boardIdRef.current
      const current = state.schematicView[id]?.zoom ?? 1
      const next = Math.max(0.6, Math.min(2.6, Math.round((current + (e.deltaY > 0 ? -0.05 : 0.05)) * 100) / 100))
      state.setSchematicView(id, { zoom: next })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const boardView = (board ? schematicView[board.id] : undefined) ?? { zoom: 1, wires: true }
  const zoom = boardView.zoom
  const wiresOn = boardView.wires
  const cols = maximized ? 4 : 2
  const viewW = cols * CELL_W + 8

  const layout = useMemo(() => {
    if (!board)
      return {
        chips: [] as { chip: ChipDef; x: number; y: number }[],
        passives: [] as { passive: PassiveDef; x: number; y: number }[],
        height: 100,
      }
    let y = 8
    const chips: { chip: ChipDef; x: number; y: number }[] = []
    let rowMax = 0
    board.chips.forEach((chip, i) => {
      const col = i % cols
      if (col === 0 && i > 0) {
        y += rowMax + 16
        rowMax = 0
      }
      chips.push({ chip, x: 4 + col * CELL_W, y })
      rowMax = Math.max(rowMax, chipSymbolHeight(chip))
    })
    y += rowMax + 20
    const passives: { passive: PassiveDef; x: number; y: number }[] = []
    rowMax = 0
    board.passives.forEach((passive, i) => {
      const col = i % cols
      if (col === 0 && i > 0) {
        y += rowMax + 8
        rowMax = 0
      }
      passives.push({ passive, x: 4 + col * CELL_W, y })
      rowMax = Math.max(rowMax, passiveSymbolHeight(passive))
    })
    y += rowMax + 12
    return { chips, passives, height: Math.max(y, 120) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, designVersion, cols])

  if (!board) return null

  const effPos = (ref: string, auto: { x: number; y: number }): { x: number; y: number } => {
    if (drag?.ref === ref) return { x: drag.x, y: drag.y }
    return design.schematicPos?.[ref] ?? auto
  }

  const placedChips = layout.chips.map((c) => {
    const p = effPos(c.chip.ref, c)
    return { chip: c.chip, x: p.x, y: p.y }
  })
  const placedPassives = layout.passives.map((c) => {
    const p = effPos(c.passive.ref, c)
    return { passive: c.passive, x: p.x, y: p.y }
  })

  const sheetH = Math.max(
    layout.height,
    ...placedChips.map((c) => c.y + chipSymbolHeight(c.chip) + 16),
    ...placedPassives.map((p) => p.y + passiveSymbolHeight(p.passive) + 16),
  )

  const wireEnds = wiresOn ? collectWireEnds(placedChips, placedPassives) : []

  const svgPoint = (e: React.PointerEvent): { x: number; y: number } => {
    const target = e.target as SVGElement
    const svg = target.ownerSVGElement ?? (target as unknown as SVGSVGElement)
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: pt.x, y: pt.y }
  }

  const dragProps = (ref: string, pos: { x: number; y: number }): DragProps => ({
    onPointerDown: (e) => {
      e.stopPropagation()
      const pt = svgPoint(e)
      dragInfo.current = { ref, dx: pt.x - pos.x, dy: pt.y - pos.y, x: pos.x, y: pos.y, moved: false }
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    },
    onPointerMove: (e) => {
      const info = dragInfo.current
      if (!info || info.ref !== ref) return
      const pt = svgPoint(e)
      const nx = Math.max(0, Math.min(viewW - 120, pt.x - info.dx))
      const ny = Math.max(0, pt.y - info.dy)
      if (!info.moved && Math.hypot(nx - info.x, ny - info.y) > 2) info.moved = true
      if (info.moved) {
        info.x = nx
        info.y = ny
        setDrag({ ref, x: nx, y: ny })
      }
    },
    onPointerUp: () => {
      const info = dragInfo.current
      if (info) {
        if (info.moved) setSchematicPos(info.ref, info.x, info.y)
        else setSelectedSym((prev) => (prev === info.ref ? null : info.ref))
      }
      dragInfo.current = null
      setDrag(null)
    },
  })

  const onPick = (ref: string, pin: string, net: string | null) => {
    setSel({ ref, pin })
    setSelectedNet(net && net !== 'NC' ? net : null)
  }

  const selChip = sel ? board.chips.find((c) => c.ref === sel.ref) : undefined
  const selPassive = sel ? board.passives.find((p) => p.ref === sel.ref) : undefined
  const selCurrentNet = sel
    ? selChip
      ? pinNetOf(selChip, sel.pin)?.net ?? null
      : selPassive
        ? passiveNetMap(selPassive)[sel.pin]?.net ?? null
        : null
    : null
  const selHasOverride = sel ? design.pinNets?.[sel.ref]?.[sel.pin] !== undefined : false

  const symChip = selectedSym ? board.chips.find((c) => c.ref === selectedSym) : undefined
  const symPassive = selectedSym ? board.passives.find((p) => p.ref === selectedSym) : undefined
  const symIsCustomChip = selectedSym ? (design.chips[board.id] ?? []).some((c) => c.ref === selectedSym) : false
  const symIsCustomPassive = selectedSym ? (design.passives[board.id] ?? []).some((p) => p.ref === selectedSym) : false
  const symHasPos = selectedSym ? design.schematicPos?.[selectedSym] !== undefined : false

  const isCustomBoard = design.boards.some((b) => b.id === board.id)
  const members = selectedNet ? netMembers(selectedNet) : []

  return (
    <div className="schematic">
      <div className="designer-row">
        <select value={board.id} onChange={(e) => setDesignerBoard(e.target.value)} aria-label="Board">
          {boards.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {isCustomBoard && (
          <button onClick={() => removeBoard(board.id)} title="Remove this board">
            × board
          </button>
        )}
        <span className="zoom-cluster" title="Zoom (also ctrl/cmd + wheel over the sheet)">
          <button onClick={() => setSchematicView(board.id, { zoom: Math.max(0.6, Math.round((zoom - 0.05) * 100) / 100) })} aria-label="Zoom out">
            −
          </button>
          <button className="zoom-readout" onClick={() => setSchematicView(board.id, { zoom: 1 })} title="Reset zoom">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => setSchematicView(board.id, { zoom: Math.min(2.6, Math.round((zoom + 0.05) * 100) / 100) })} aria-label="Zoom in">
            +
          </button>
        </span>
        <button
          className={wiresOn ? 'toggle on' : 'toggle'}
          onClick={() => setSchematicView(board.id, { wires: !wiresOn })}
          title="Draw same-net connections (power stays as labels)"
        >
          Wires
        </button>
        {selectedNet && (
          <button className="toggle on" onClick={() => setSelectedNet(null)} title="Clear net highlight">
            {selectedNet} ×
          </button>
        )}
      </div>

      <div className="designer-row">
        <select value={addPart} onChange={(e) => setAddPart(e.target.value)} aria-label="Chip to add">
          {partCatalog().map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button onClick={() => addChip(board.id, addPart)}>+ chip</button>
        <select value={addKind} onChange={(e) => setAddKind(e.target.value as PassiveKind)} aria-label="Component kind">
          {PASSIVE_KINDS.map((p) => (
            <option key={p.kind} value={p.kind}>
              {p.label}
            </option>
          ))}
        </select>
        {(addKind === 'led' || addKind === 'ledbar') ? (
          <select
            value={addColor}
            onChange={(e) => {
              setAddColor(e.target.value)
              setAddValue(LED_COLORS.find((c) => c.hex === e.target.value)?.name ?? 'red')
            }}
            aria-label="LED color"
          >
            {LED_COLORS.map((c) => (
              <option key={c.hex} value={c.hex}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <input type="text" value={addValue} onChange={(e) => setAddValue(e.target.value)} aria-label="Value" />
        )}
        <button
          onClick={() =>
            addPassive(board.id, addKind, addValue, addKind === 'led' || addKind === 'ledbar' ? addColor : undefined)
          }
        >
          + part
        </button>
      </div>

      <div
        ref={bodyRef}
        className="schematic-body"
        style={{ overflowX: zoom > 1 ? 'auto' : 'hidden' }}
        onClick={() => {
          if (panRef.current?.moved) {
            panRef.current = null
            return
          }
          panRef.current = null
          setSel(null)
          setSelectedSym(null)
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          const el = bodyRef.current
          if (!el) return
          panRef.current = { startX: e.clientX, startY: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false }
        }}
        onPointerMove={(e) => {
          const pan = panRef.current
          const el = bodyRef.current
          if (!pan || !el) return
          const dx = e.clientX - pan.startX
          const dy = e.clientY - pan.startY
          if (!pan.moved && Math.hypot(dx, dy) > 4) {
            pan.moved = true
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
          }
          if (pan.moved) {
            el.scrollLeft = pan.left - dx
            el.scrollTop = pan.top - dy
          }
        }}
        onPointerUp={() => {
          if (panRef.current && !panRef.current.moved) panRef.current = null
        }}
      >
        <svg viewBox={`0 0 ${viewW} ${sheetH}`} width={`${100 * zoom}%`} style={{ display: 'block' }}>
          {wiresOn && <WireLayer ends={wireEnds} selectedNet={selectedNet} />}
          {placedChips.map(({ chip, x, y }) => (
            <ChipSymbol
              key={chip.ref}
              chip={chip}
              x={x}
              y={y}
              sel={sel}
              selectedNet={selectedNet}
              symSelected={selectedSym === chip.ref}
              dragProps={dragProps(chip.ref, { x, y })}
              onPick={onPick}
            />
          ))}
          {placedPassives.map(({ passive, x, y }) => (
            <PassiveSymbol
              key={passive.ref}
              passive={passive}
              x={x}
              y={y}
              sel={sel}
              selectedNet={selectedNet}
              symSelected={selectedSym === passive.ref}
              dragProps={dragProps(passive.ref, { x, y })}
              onPick={onPick}
            />
          ))}
        </svg>
      </div>

      {selectedSym && (symChip || symPassive) && (
        <div className="schematic-editor">
          <span className="sch-sel-badge">
            {selectedSym} · {symChip ? symChip.part : `${symPassive!.value} ${symPassive!.kind}`}
            {!symIsCustomChip && !symIsCustomPassive ? ' (base)' : ''}
          </span>
          {symChip && (
            <select
              value={symChip.part}
              onChange={(e) => {
                const base = basePartOf(selectedSym, design)
                if (e.target.value === base) revertSwap(selectedSym)
                else swapChip(selectedSym, e.target.value)
              }}
              aria-label="Swap part"
              title="Swap this chip for another part"
            >
              {partCatalog().map((part) => (
                <option key={part} value={part}>
                  {part}
                </option>
              ))}
            </select>
          )}
          {symChip && design.replacements?.[selectedSym] !== undefined && (
            <button onClick={() => revertSwap(selectedSym)} title={`Revert to ${basePartOf(selectedSym, design)}`}>
              ↺ part
            </button>
          )}
          {symHasPos && (
            <button onClick={() => clearSchematicPos(selectedSym)} title="Restore automatic placement">
              auto place
            </button>
          )}
          {(symIsCustomChip || symIsCustomPassive) && (
            <button
              onClick={() => {
                if (symIsCustomChip) removeChip(board.id, selectedSym)
                else removePassive(board.id, selectedSym)
                setSelectedSym(null)
              }}
              title="Remove component"
            >
              × remove
            </button>
          )}
        </div>
      )}

      <div className="net-members">
        <span className="net-members-title">harness</span>
        {(() => {
          const removed = new Set(design.removedWires ?? [])
          const wires = [
            ...CONNECTIONS.filter((conn) => conn.from === board.id || conn.to === board.id).map((conn) => ({
              conn,
              customIndex: -1,
              removed: removed.has(wireKey(conn)),
            })),
            ...design.connections
              .map((conn, customIndex) => ({ conn, customIndex, removed: false }))
              .filter(({ conn }) => conn.from === board.id || conn.to === board.id),
          ]
          return wires.map(({ conn, customIndex, removed: isRemoved }, i) => (
            <span key={i} className={isRemoved ? 'net-member wire-removed' : 'net-member'} style={{ display: 'inline-flex', gap: 4 }}>
              {conn.kind}·{conn.to === 'bus' ? (conn.from === board.id ? 'BUS' : modules.find((m) => m.id === conn.from)?.name) : conn.from === board.id ? modules.find((m) => m.id === conn.to)?.name ?? conn.to : modules.find((m) => m.id === conn.from)?.name ?? conn.from}
              {customIndex >= 0 ? (
                <button className="scope-clear" onClick={() => removeConnection(customIndex)} title="Remove wire">
                  ×
                </button>
              ) : isRemoved ? (
                <button className="scope-clear" onClick={() => restoreBaseWire(wireKey(conn))} title="Restore base wire">
                  ↺
                </button>
              ) : (
                <button className="scope-clear" onClick={() => removeBaseWire(wireKey(conn))} title="Remove base wire">
                  ×
                </button>
              )}
            </span>
          ))
        })()}
        <select value={wireTo} onChange={(e) => setWireTo(e.target.value)} aria-label="Wire target" style={{ flex: '0 1 auto' }}>
          <option value="bus">BUS</option>
          {boards
            .filter((m) => m.id !== board.id)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
        </select>
        <select value={wireKind} onChange={(e) => setWireKind(e.target.value as typeof wireKind)} aria-label="Wire kind" style={{ flex: '0 1 auto' }}>
          <option value="bus">bus</option>
          <option value="ctl">control</option>
          <option value="clk">clock</option>
        </select>
        <button className="scope-clear" onClick={() => addConnection({ from: board.id, to: wireTo, kind: wireKind })} title="Add harness wire">
          + wire
        </button>
      </div>

      {selectedNet && (
        <div className="net-members">
          <span className="net-members-title" style={{ color: netColor(selectedNet) }}>
            {selectedNet} · {members.length} pins
          </span>
          {members.map((node) => (
            <button
              key={`${node.ref}.${node.pin}`}
              className="net-member"
              onClick={() => {
                setDesignerBoard(node.moduleId)
                setSel({ ref: node.ref, pin: node.pin })
              }}
              title={modules.find((m) => m.id === node.moduleId)?.name}
            >
              {node.ref}.{node.pin}
            </button>
          ))}
        </div>
      )}

      {sel && (
        <div className="schematic-editor">
          <span className="sch-sel-badge">
            {sel.ref} pin {sel.pin}
            {selCurrentNet ? ` · ${selCurrentNet}` : ' · unconnected'}
            {selHasOverride ? ' (modified)' : ''}
          </span>
          <input
            type="text"
            list="net-names-sch"
            value={netDraft}
            onChange={(e) => setNetDraft(e.target.value)}
            placeholder="net (existing or new)"
            aria-label="Net name"
          />
          <datalist id="net-names-sch">
            {knownNets().map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <button
            className="primary"
            onClick={() => {
              if (!netDraft.trim()) return
              setPinNet(sel.ref, sel.pin, netDraft)
              setSelectedNet(netDraft.trim())
            }}
          >
            Connect
          </button>
          <button onClick={() => setPinNet(sel.ref, sel.pin, 'NC')} title="Mark no-connect (overrides base wiring)">
            NC
          </button>
          {selHasOverride && (
            <button onClick={() => removePinNet(sel.ref, sel.pin)} title="Remove modification, restore base wiring">
              ↺
            </button>
          )}
        </div>
      )}

      <div className="designer-row reset-row">
        <input
          type="text"
          placeholder="new board name (e.g. MMU)"
          value={boardName}
          onChange={(e) => setBoardName(e.target.value)}
        />
        <select value={column} onChange={(e) => setColumn(e.target.value as 'left' | 'right')} aria-label="Column">
          <option value="left">left</option>
          <option value="right">right</option>
        </select>
        <button
          onClick={() => {
            addBoard(boardName, column)
            setBoardName('')
          }}
        >
          + board
        </button>
        <button
          className="danger"
          onClick={() => {
            if (window.confirm('Discard every modification (boards, parts, swaps, values, wires, pin nets, positions) and return to the stock MSAP-1 rev.B?')) {
              resetDesign()
            }
          }}
        >
          Reset to stock
        </button>
      </div>
    </div>
  )
}
