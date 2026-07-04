import { useState, useRef, useCallback } from 'react'

export default function WatermarkEditor({ watermark, onChange }) {
  const canvasRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const dragStart = useRef(null)

  const { x_percent = 75, y_percent = 85, width_percent = 15 } = watermark

  const CANVAS_W = 270
  const CANVAS_H = 480

  const wm_w = (width_percent / 100) * CANVAS_W
  const wm_h = wm_w * 0.4
  const wm_x = (x_percent / 100) * CANVAS_W - wm_w / 2
  const wm_y = (y_percent / 100) * CANVAS_H

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val))
  }

  const onMouseDownDrag = useCallback((e) => {
    e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      ox: wm_x,
      oy: wm_y
    }
    setDragging(true)

    function onMove(me) {
      const dx = me.clientX - dragStart.current.mx
      const dy = me.clientY - dragStart.current.my
      const newX = clamp(dragStart.current.ox + dx, 0, CANVAS_W - wm_w)
      const newY = clamp(dragStart.current.oy + dy, 0, CANVAS_H - wm_h)
      onChange({
        x_percent: Math.round(((newX + wm_w / 2) / CANVAS_W) * 100),
        y_percent: Math.round((newY / CANVAS_H) * 100),
        width_percent
      })
    }

    function onUp() {
      setDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [wm_x, wm_y, wm_w, wm_h, width_percent, onChange])

  const onMouseDownResize = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragStart.current = { mx: e.clientX, ow: wm_w }
    setResizing(true)

    function onMove(me) {
      const dx = me.clientX - dragStart.current.mx
      const newW = clamp(dragStart.current.ow + dx, 30, CANVAS_W * 0.6)
      onChange({
        x_percent,
        y_percent,
        width_percent: Math.round((newW / CANVAS_W) * 100)
      })
    }

    function onUp() {
      setResizing(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [wm_w, x_percent, y_percent, onChange])

  const onTouchStartDrag = useCallback((e) => {
    e.preventDefault()
    const touch = e.touches[0]
    dragStart.current = { mx: touch.clientX, my: touch.clientY, ox: wm_x, oy: wm_y }
    setDragging(true)

    function onMove(te) {
      const t = te.touches[0]
      const dx = t.clientX - dragStart.current.mx
      const dy = t.clientY - dragStart.current.my
      const newX = clamp(dragStart.current.ox + dx, 0, CANVAS_W - wm_w)
      const newY = clamp(dragStart.current.oy + dy, 0, CANVAS_H - wm_h)
      onChange({
        x_percent: Math.round(((newX + wm_w / 2) / CANVAS_W) * 100),
        y_percent: Math.round((newY / CANVAS_H) * 100),
        width_percent
      })
    }

    function onEnd() {
      setDragging(false)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }

    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
  }, [wm_x, wm_y, wm_w, wm_h, width_percent, onChange])

  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
          Drag the watermark to position it. Drag the ↔ handle to resize.
        </p>
        <div
          ref={canvasRef}
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            border: '2px solid var(--border)',
            borderRadius: 8,
            position: 'relative',
            overflow: 'hidden',
            userSelect: 'none',
            touchAction: 'none'
          }}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.1)',
            fontSize: 13,
            pointerEvents: 'none',
            flexDirection: 'column',
            gap: 8
          }}>
            <span style={{ fontSize: 32 }}>▶</span>
            <span>9:16 Preview</span>
          </div>

          <div
            onMouseDown={onMouseDownDrag}
            onTouchStart={onTouchStartDrag}
            style={{
              position: 'absolute',
              left: wm_x,
              top: wm_y,
              width: wm_w,
              height: wm_h,
              cursor: dragging ? 'grabbing' : 'grab',
              border: '2px solid rgba(230,60,60,0.8)',
              borderRadius: 4,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(2px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: dragging ? '0 0 0 2px var(--accent)' : 'none',
              transition: dragging ? 'none' : 'box-shadow 0.1s'
            }}
          >
            <img
              src="/watermark-preview.png"
              alt="watermark"
              style={{ width: '90%', height: '90%', objectFit: 'contain', pointerEvents: 'none', opacity: 0.85 }}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              fontSize: 10,
              color: 'white',
              fontWeight: 700,
              letterSpacing: '0.05em',
              pointerEvents: 'none',
              whiteSpace: 'nowrap'
            }}>
              WATERMARK
            </div>

            <div
              onMouseDown={onMouseDownResize}
              style={{
                position: 'absolute',
                right: -8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 24,
                background: 'var(--accent)',
                borderRadius: 3,
                cursor: resizing ? 'ew-resize' : 'ew-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: 'white',
                zIndex: 10
              }}
            >↔</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 200 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-muted)' }}>Position Values</h4>

        <div className="form-group">
          <label>Horizontal Center (X%)</label>
          <input
            type="range" min="5" max="95" value={x_percent}
            onChange={e => onChange({ x_percent: +e.target.value, y_percent, width_percent })}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>Left</span><span><strong style={{ color: 'var(--text)' }}>{x_percent}%</strong></span><span>Right</span>
          </div>
        </div>

        <div className="form-group">
          <label>Vertical Position (Y%)</label>
          <input
            type="range" min="0" max="95" value={y_percent}
            onChange={e => onChange({ x_percent, y_percent: +e.target.value, width_percent })}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>Top</span><span><strong style={{ color: 'var(--text)' }}>{y_percent}%</strong></span><span>Bottom</span>
          </div>
        </div>

        <div className="form-group">
          <label>Width (%)</label>
          <input
            type="range" min="5" max="50" value={width_percent}
            onChange={e => onChange({ x_percent, y_percent, width_percent: +e.target.value })}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>Smaller</span><span><strong style={{ color: 'var(--text)' }}>{width_percent}%</strong></span><span>Larger</span>
          </div>
        </div>

        <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: 12, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          <pre>{JSON.stringify({ x_percent, y_percent, width_percent }, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}
