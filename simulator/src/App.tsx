import { useEffect } from 'react'
import { Scene } from './scene/Scene'
import { startRunner, useSim } from './state/store'
import { EditorPanel } from './ui/EditorPanel'
import { FloatingPanel } from './ui/FloatingPanel'
import { InspectorPanel } from './ui/InspectorPanel'
import { MicrocodePanel } from './ui/MicrocodePanel'
import { PsuPanel } from './ui/PsuPanel'
import { TerminalPanel } from './ui/TerminalPanel'
import { SchematicPanel } from './ui/SchematicPanel'
import { Scope } from './ui/Scope'
import { Sniffer } from './ui/Sniffer'
import { TopBar } from './ui/TopBar'
import { Transport } from './ui/Transport'
import { ViewControls } from './ui/ViewControls'

function SchematicFloating() {
  return (
    <FloatingPanel id="schematic" title="Schematic" width={680} maximizable>
      <SchematicPanel />
    </FloatingPanel>
  )
}

function Tooltip() {
  const tooltip = useSim((s) => s.tooltip)
  if (!tooltip) return null
  const left = Math.min(tooltip.x + 14, window.innerWidth - 260)
  const top = Math.min(tooltip.y + 14, window.innerHeight - 40)
  return (
    <div className="tooltip" style={{ left, top }}>
      {tooltip.text}
    </div>
  )
}

export default function App() {
  const loadExample = useSim((s) => s.loadExample)

  useEffect(() => {
    loadExample('Hello')
    return startRunner()
  }, [loadExample])

  return (
    <>
      <Scene />
      <TopBar />
      <FloatingPanel id="program" title="Program" width={302}>
        <EditorPanel />
      </FloatingPanel>
      <FloatingPanel id="inspector" title="Inspector" width={330}>
        <InspectorPanel />
      </FloatingPanel>
      <FloatingPanel id="sniffer" title="Logic analyzer" width={560}>
        <Sniffer />
      </FloatingPanel>
      <FloatingPanel id="scope" title="Oscilloscope" width={470}>
        <Scope />
      </FloatingPanel>
      <FloatingPanel id="psu" title="Bench power supply" width={280}>
        <PsuPanel />
      </FloatingPanel>
      <SchematicFloating />
      <FloatingPanel id="terminal" title="Terminal" width={540} maximizable>
        <TerminalPanel />
      </FloatingPanel>
      <FloatingPanel id="microcode" title="Microcode" width={430}>
        <MicrocodePanel />
      </FloatingPanel>
      <Transport />
      <ViewControls />
      <Tooltip />
    </>
  )
}
