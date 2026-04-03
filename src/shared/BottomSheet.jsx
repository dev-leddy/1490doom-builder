import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function BottomSheet({ title, onClose, children, footer, bodyClass, className, zIndex = 1000 }) {
  const startY = useRef(0)
  const [dragOffset, setDragOffset] = useState(0)

  function onHandleTouchStart(e) { startY.current = e.touches[0].clientY }
  function onHandleTouchMove(e) {
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) setDragOffset(dy)
  }
  function onHandleTouchEnd() {
    if (dragOffset > 80) onClose()
    else setDragOffset(0)
  }

  return createPortal(
    <>
      <div
        className="co-sheet-backdrop"
        style={{ zIndex: zIndex - 1 }}
        onClick={onClose}
      />
      <div
        className={`co-settings-sheet${className ? ` ${className}` : ''}`}
        style={{ zIndex, ...(dragOffset ? { transform: `translateY(${dragOffset}px)`, transition: 'none' } : {}) }}
      >
        <div
          className="co-sheet-handle"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        />
        <div className="co-sheet-header">
          <span className="co-sheet-title">{title}</span>
          <button className="co-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={`co-sheet-body${bodyClass ? ` ${bodyClass}` : ''}`}>
          {children}
        </div>
        {footer && <div className="co-sheet-footer">{footer}</div>}
      </div>
    </>,
    document.body
  )
}
