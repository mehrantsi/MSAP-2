import { ReactNode, useRef } from 'react'
import { PanelId, useSim } from '../state/store'

interface FloatingPanelProps {
  id: PanelId
  title: string
  width: number
  maximizable?: boolean
  children: ReactNode
}

export function FloatingPanel({ id, title, width, maximizable, children }: FloatingPanelProps) {
  const panel = useSim((s) => s.panels[id])
  const setPanel = useSim((s) => s.setPanel)
  const dragState = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)

  if (!panel.visible) return null

  const resolve = (v: number, axis: 'x' | 'y'): number => {
    if (v >= 0) return v
    const total = axis === 'x' ? window.innerWidth : window.innerHeight
    return total + v
  }

  const left = resolve(panel.x, 'x')
  const top = resolve(panel.y, 'y')
  const maximized = maximizable === true && panel.maximized === true

  const onPointerDown = (e: React.PointerEvent) => {
    if (maximized) return
    if ((e.target as HTMLElement).closest('button')) return
    dragState.current = { startX: e.clientX, startY: e.clientY, baseX: left, baseY: top }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragState.current
    if (!drag) return
    const x = Math.max(0, Math.min(window.innerWidth - 60, drag.baseX + e.clientX - drag.startX))
    const y = Math.max(0, Math.min(window.innerHeight - 40, drag.baseY + e.clientY - drag.startY))
    setPanel(id, { x, y })
  }

  const onPointerUp = () => {
    dragState.current = null
  }

  const style = maximized
    ? { left: 10, top: 46, width: 'calc(100vw - 20px)' as const }
    : { left, top, width }

  return (
    <section className={maximized ? 'panel floating maximized' : 'panel floating'} style={style}>
      <header
        className="floating-header"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span>{title}</span>
        <span className="floating-controls">
          {maximizable && (
            <button
              onClick={() => setPanel(id, { maximized: !maximized, collapsed: false })}
              aria-label={maximized ? 'Restore panel size' : 'Maximize panel'}
            >
              {maximized ? '❐' : '□'}
            </button>
          )}
          <button
            onClick={() => setPanel(id, { collapsed: !panel.collapsed })}
            aria-label={panel.collapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {panel.collapsed ? '+' : '−'}
          </button>
          <button onClick={() => setPanel(id, { visible: false })} aria-label="Close panel">
            ×
          </button>
        </span>
      </header>
      {!panel.collapsed && <div className="floating-body">{children}</div>}
    </section>
  )
}
