import { useState, useEffect, useRef } from 'react'
import { Howl } from 'howler'

// audioState: 'loading' | 'playing' | 'paused' | 'hidden'
// While 'loading', the button is hidden (not shown as spinner)
export function useAudio(src) {
  const [audioState, setAudioState] = useState('loading')
  const howlRef = useRef(null)

  useEffect(() => {
    let mounted = true

    const howl = new Howl({
      src: [src],
      loop: true,
      autoplay: true,
      volume: 0.45,
      html5: true, // required for iOS background playback + streaming

      onload: () => {
        if (!mounted) return
        if (!howl.playing()) setAudioState('paused')
      },
      onloaderror: () => {
        if (!mounted) return
        setAudioState('hidden')
      },
      onplay: () => {
        if (!mounted) return
        setAudioState('playing')
      },
      onpause: () => {
        if (!mounted) return
        setAudioState('paused')
      },
      onplayerror: () => {
        if (!mounted) return
        setAudioState('paused')
        howl.once('unlock', () => { if (mounted) howl.play() })
      },
    })

    howlRef.current = howl

    let pausedByVisibility = false
    const handleVisibility = () => {
      if (!howlRef.current) return
      if (document.hidden) {
        if (howlRef.current.playing()) {
          howlRef.current.pause()
          pausedByVisibility = true
        }
      } else {
        if (pausedByVisibility) {
          howlRef.current.play()
          pausedByVisibility = false
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      mounted = false
      document.removeEventListener('visibilitychange', handleVisibility)
      howl.unload()
      howlRef.current = null
    }
  }, [src])

  const toggle = () => {
    const h = howlRef.current
    if (!h || audioState === 'loading') return
    h.playing() ? h.pause() : h.play()
  }

  return { audioState, toggle }
}
