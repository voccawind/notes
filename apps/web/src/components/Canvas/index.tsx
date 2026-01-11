// Canvas - Main Content Area with Tab System
import React, { useEffect, useState } from 'react'
import { NoteEditor } from '../../editor/NoteEditor'
import { getNote } from '../../db'
import type { UUID, Note } from '@orbit/shared-types'
import './Canvas.css'

export interface CanvasProps {
  activeOrbitId: UUID | null
  activeNoteId: UUID | null
  openTabs: UUID[]
  onTabClose: (noteId: UUID) => void
  onTabSwitch: (noteId: UUID) => void
  onWikiLinkClick?: (title: string) => void
  onTagClick?: (tag: string) => void
}

export const Canvas: React.FC<CanvasProps> = ({
  activeOrbitId,
  activeNoteId,
  openTabs,
  onTabClose,
  onTabSwitch,
  onWikiLinkClick,
  onTagClick,
}) => {
  const [tabNotes, setTabNotes] = useState<Map<UUID, Note>>(new Map())

  // Load note titles for tabs
  useEffect(() => {
    async function loadTabNotes() {
      const newTabNotes = new Map<UUID, Note>()

      for (const tabId of openTabs) {
        const note = await getNote(tabId)
        if (note) {
          newTabNotes.set(tabId, note)
        }
      }

      setTabNotes(newTabNotes)
    }

    loadTabNotes()
  }, [openTabs])

  // Empty state
  if (!activeOrbitId) {
    return (
      <div className="canvas-empty">
        <div className="empty-state">
          <h2>Welcome to ORBIT Notes</h2>
          <p>Select an orbit to get started</p>
        </div>
      </div>
    )
  }

  // No notes open
  if (openTabs.length === 0) {
    return (
      <div className="canvas-empty">
        <div className="empty-state">
          <h2>No notes open</h2>
          <p>Use <kbd>Cmd+Shift+N</kbd> to create a note or <kbd>Cmd+K</kbd> to search</p>
        </div>
      </div>
    )
  }

  return (
    <div className="canvas-container">
      {/* Tab Bar */}
      <div className="canvas-tabs">
        <div className="tab-list">
          {openTabs.map((tabId) => {
            const note = tabNotes.get(tabId)
            const isActive = tabId === activeNoteId

            return (
              <div
                key={tabId}
                className={`tab ${isActive ? 'active' : ''}`}
                onClick={() => onTabSwitch(tabId)}
              >
                <span className="tab-title">{note?.title || 'Loading...'}</span>
                <button
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTabClose(tabId)
                  }}
                  title="Close tab"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>

        {/* Tab Actions */}
        <div className="tab-actions">
          <button className="tab-action" title="Close all tabs">
            ✕ All
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="canvas-editor">
        {activeNoteId ? (
          <NoteEditor
            key={activeNoteId}
            noteId={activeNoteId}
            onWikiLinkClick={onWikiLinkClick}
            onTagClick={onTagClick}
            showToolbar={true}
            autoSave={true}
          />
        ) : (
          <div className="canvas-no-selection">
            <p>Select a tab to view</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Tab component for reusability
interface TabProps {
  noteId: UUID
  title: string
  active: boolean
  onClose: () => void
  onClick: () => void
}

export const Tab: React.FC<TabProps> = ({
  title,
  active,
  onClose,
  onClick,
}) => {
  return (
    <div
      className={`tab ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <span className="tab-title">{title}</span>
      <button
        className="tab-close"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        title="Close tab"
      >
        ×
      </button>
    </div>
  )
}
