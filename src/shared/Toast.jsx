import { useEffect, useRef, useState } from 'react'

export default function Toast({ message }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Next frame so the CSS transition fires (opacity 0 → 1)
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return <div className={`toast${visible ? ' show' : ''}`}>{message}</div>
}
