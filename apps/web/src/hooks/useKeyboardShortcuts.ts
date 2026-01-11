// Keyboard Shortcut Hook
import { useEffect } from 'react'

export interface KeyboardShortcuts {
  onCapture?: () => void
  onJump?: () => void
  onToggleOrbitBar?: () => void
  onToggleFocusRail?: () => void
  onCloseTab?: () => void
  onNewNote?: () => void
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? event.metaKey : event.ctrlKey

      // Cmd/Ctrl + Shift + N: Capture
      if (modifier && event.shiftKey && event.key === 'N') {
        event.preventDefault()
        shortcuts.onCapture?.()
        return
      }

      // Cmd/Ctrl + K: Jump (Search)
      if (modifier && event.key === 'k') {
        event.preventDefault()
        shortcuts.onJump?.()
        return
      }

      // Cmd/Ctrl + N: New Note
      if (modifier && !event.shiftKey && event.key === 'n') {
        event.preventDefault()
        shortcuts.onNewNote?.()
        return
      }

      // Cmd/Ctrl + W: Close Tab
      if (modifier && event.key === 'w') {
        event.preventDefault()
        shortcuts.onCloseTab?.()
        return
      }

      // Cmd/Ctrl + /: Toggle Orbit Bar
      if (modifier && event.key === '/') {
        event.preventDefault()
        shortcuts.onToggleOrbitBar?.()
        return
      }

      // Cmd/Ctrl + \: Toggle Focus Rail
      if (modifier && event.key === '\\') {
        event.preventDefault()
        shortcuts.onToggleFocusRail?.()
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
