// Main Workspace Layout - "Workspace Orbit"
import React, { useState } from 'react'
import { OrbitBar } from './OrbitBar'
import { Canvas } from './Canvas'
import { FocusRail } from './FocusRail'
import { CommandDock } from './CommandDock'
import type { UUID } from '@orbit/shared-types'
import './layout.css'

export interface WorkspaceLayoutProps {
  activeOrbitId: UUID | null
  onOrbitSwitch?: (orbitId: UUID) => void
  onNoteOpen?: (noteId: UUID) => void
  onWikiLinkClick?: (title: string) => void
  onTagClick?: (tag: string) => void
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  activeOrbitId,
  onOrbitSwitch,
  onNoteOpen,
  onWikiLinkClick,
  onTagClick,
}) => {
  const [orbitBarCollapsed, setOrbitBarCollapsed] = useState(false)
  const [focusRailCollapsed, setFocusRailCollapsed] = useState(false)
  const [activeNoteId, setActiveNoteId] = useState<UUID | null>(null)
  const [openTabs, setOpenTabs] = useState<UUID[]>([])

  const handleNoteOpen = (noteId: UUID) => {
    setActiveNoteId(noteId)

    // Add to tabs if not already open
    if (!openTabs.includes(noteId)) {
      setOpenTabs([...openTabs, noteId])
    }

    if (onNoteOpen) {
      onNoteOpen(noteId)
    }
  }

  const handleTabClose = (noteId: UUID) => {
    const newTabs = openTabs.filter((id) => id !== noteId)
    setOpenTabs(newTabs)

    // If closing active tab, switch to previous
    if (noteId === activeNoteId) {
      setActiveNoteId(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null)
    }
  }

  const handleTabSwitch = (noteId: UUID) => {
    setActiveNoteId(noteId)
  }

  return (
    <div className="workspace-layout">
      {/* OrbitBar - Left Sidebar */}
      <aside
        className={`orbit-bar ${orbitBarCollapsed ? 'collapsed' : ''}`}
        data-testid="orbit-bar"
      >
        <OrbitBar
          activeOrbitId={activeOrbitId}
          collapsed={orbitBarCollapsed}
          onToggleCollapse={() => setOrbitBarCollapsed(!orbitBarCollapsed)}
          onOrbitSwitch={onOrbitSwitch}
          onNoteOpen={handleNoteOpen}
        />
      </aside>

      {/* Main Content Area */}
      <div className="workspace-main">
        {/* Canvas - Center */}
        <main className="canvas" data-testid="canvas">
          <Canvas
            activeOrbitId={activeOrbitId}
            activeNoteId={activeNoteId}
            openTabs={openTabs}
            onTabClose={handleTabClose}
            onTabSwitch={handleTabSwitch}
            onWikiLinkClick={onWikiLinkClick}
            onTagClick={onTagClick}
          />
        </main>

        {/* FocusRail - Right Sidebar */}
        <aside
          className={`focus-rail ${focusRailCollapsed ? 'collapsed' : ''}`}
          data-testid="focus-rail"
        >
          <FocusRail
            noteId={activeNoteId}
            collapsed={focusRailCollapsed}
            onToggleCollapse={() => setFocusRailCollapsed(!focusRailCollapsed)}
            onNoteOpen={handleNoteOpen}
          />
        </aside>
      </div>

      {/* CommandDock - Bottom */}
      <footer className="command-dock" data-testid="command-dock">
        <CommandDock
          orbitId={activeOrbitId}
          onNoteOpen={handleNoteOpen}
        />
      </footer>
    </div>
  )
}

// Hook for keyboard shortcuts
export function useWorkspaceKeyboard(handlers: {
  onCapture?: () => void
  onJump?: () => void
  onToggleOrbitBar?: () => void
  onToggleFocusRail?: () => void
}) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + N - Capture
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault()
        handlers.onCapture?.()
      }

      // Cmd/Ctrl + K - Jump
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        handlers.onJump?.()
      }

      // Cmd/Ctrl + \ - Toggle OrbitBar
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        handlers.onToggleOrbitBar?.()
      }

      // Cmd/Ctrl + / - Toggle FocusRail
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        handlers.onToggleFocusRail?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}
