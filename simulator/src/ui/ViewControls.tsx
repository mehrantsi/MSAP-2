import { viewApi } from '../scene/viewApi'
import { useSim } from '../state/store'

export function ViewControls() {
  const dragMode = useSim((s) => s.dragMode)
  const setDragMode = useSim((s) => s.setDragMode)
  const view = useSim((s) => s.view)

  return (
    <div className="view-controls">
      <button onClick={() => viewApi.zoom(0.82)} title="Zoom in" aria-label="Zoom in">
        +
      </button>
      <button onClick={() => viewApi.zoom(1.22)} title="Zoom out" aria-label="Zoom out">
        −
      </button>
      <button onClick={() => viewApi.reset()} title="Fit view" aria-label="Fit view">
        ⌂
      </button>
      <div className="view-divider" />
      <button
        className={dragMode === 'orbit' ? 'on' : ''}
        onClick={() => setDragMode('orbit')}
        disabled={view === '2d'}
        title="Drag rotates (3D only)"
        aria-label="Rotate mode"
      >
        ⟳
      </button>
      <button
        className={dragMode === 'pan' ? 'on' : ''}
        onClick={() => setDragMode('pan')}
        title="Drag moves the view"
        aria-label="Pan mode"
      >
        ✥
      </button>
    </div>
  )
}
