import { useEffect, useRef } from 'react'
import { machine, useSim } from '../state/store'

export function TerminalPanel() {
  const traceVersion = useSim((s) => s.traceVersion)
  const running = useSim((s) => s.running)
  const setRunning = useSim((s) => s.setRunning)
  const scrollRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const terminal = machine.devices.terminal

  useEffect(() => {
    if (running) boxRef.current?.focus()
  }, [running])

  const programmatic = useRef(false)

  useEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current && el.scrollTop + el.clientHeight < el.scrollHeight) {
      programmatic.current = true
      el.scrollTop = el.scrollHeight
    }
  }, [traceVersion])

  const onScroll = () => {
    if (programmatic.current) {
      programmatic.current = false
      return
    }
    const el = scrollRef.current
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 4
  }

  const onWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) stickToBottom.current = false
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) return
    e.preventDefault()
    if (e.key === 'Enter') terminal.typeByte(13)
    else if (e.key === 'Backspace') terminal.typeByte(8)
    else if (e.key === 'Escape') terminal.typeByte(27)
    else if (e.key.length === 1) terminal.typeByte(e.key.charCodeAt(0))
    if (!running && !machine.halted) setRunning(true)
  }

  return (
    <div ref={boxRef} className="terminal" tabIndex={0} onKeyDown={onKeyDown} title="Click and type - keys go to the MSAP-2 console port">
      <div ref={scrollRef} className="terminal-screen" onScroll={onScroll} onWheel={onWheel}>
        <pre>
          {terminal.output}
          <span className="terminal-cursor">▉</span>
        </pre>
      </div>
      <div className="terminal-hint">
        {running ? 'live - keys feed port 0' : machine.halted ? 'machine halted - press Reset' : 'click here and press any key to start the clock'}
      </div>
    </div>
  )
}
