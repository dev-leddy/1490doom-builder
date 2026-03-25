import { useState, useRef } from 'react'
import { COMPANY_AVATARS, getAvatarSrc } from '../data/avatars'

export default function AvatarPicker({ value, onChange }) {
  const fileRef = useRef(null)

  function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        const size = 240
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        const min = Math.min(img.width, img.height)
        const sx = (img.width - min) / 2
        const sy = (img.height - min) / 2
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
        onChange(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="avatar-picker">
      <div className="avatar-picker-grid">
        <button
          key="none"
          className={`avatar-option${!value ? ' selected' : ''}`}
          onClick={() => onChange('')}
          title="None"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', opacity: 0.5, letterSpacing: '0.05em' }}
        >
          NONE
        </button>
        {COMPANY_AVATARS.map(a => (
          <button
            key={a.key}
            className={`avatar-option${value === a.key ? ' selected' : ''}`}
            onClick={() => onChange(a.key)}
            title={a.label}
          >
            <img src={a.src} alt={a.label} />
          </button>
        ))}
        <button
          className={`avatar-option avatar-upload-btn${value?.startsWith('data:') ? ' selected' : ''}`}
          onClick={() => fileRef.current?.click()}
          title="Upload custom image"
        >
          {value?.startsWith('data:')
            ? <img src={value} alt="Custom" />
            : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/><path d="M13 9h-2V6H9v3H6v2h3v3h2v-3h3V9z" opacity=".6"/></svg>
          }
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
    </div>
  )
}
