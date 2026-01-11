// CommandDock - Bottom Bar (Capture / Jump / Compose / Sync)
import React, { useState } from 'react'
import { createNote, searchNotes, createDailyNote } from '../../db'
import type { UUID } from '@orbit/shared-types'
import './CommandDock.css'

export interface CommandDockProps {
  orbitId: UUID | null
  onNoteOpen?: (noteId: UUID) => void
}

export const CommandDock: React.FC<CommandDockProps> = ({
  orbitId,
  onNoteOpen,
}) => {
  const [captureOpen, setCaptureOpen] = useState(false)
  const [jumpOpen, setJumpOpen] = useState(false)
  const [captureText, setCaptureText] = useState('')
  const [jumpQuery, setJumpQuery] = useState('')
  const [jumpResults, setJumpResults] = useState<any[]>([])

  // Capture: Quick Note
  const handleCapture = async () => {
    if (!orbitId || !captureText.trim()) return

    try {
      const note = await createNote({
        orbitId,
        title: 'Quick Note',
        content: captureText,
      })

      setCaptureText('')
      setCaptureOpen(false)

      if (onNoteOpen) {
        onNoteOpen(note.id)
      }
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  // Jump: Search
  const handleJump = async () => {
    if (!orbitId || !jumpQuery.trim()) return

    try {
      const results = await searchNotes(orbitId, jumpQuery)
      setJumpResults(results)
    } catch (error) {
      console.error('Failed to search:', error)
    }
  }

  // Compose: Create Note
  const handleCompose = async (template?: 'blank' | 'daily') => {
    if (!orbitId) return

    try {
      let note

      if (template === 'daily') {
        note = await createDailyNote(orbitId, new Date())
      } else {
        note = await createNote({
          orbitId,
          title: 'Untitled',
          content: '',
        })
      }

      if (onNoteOpen) {
        onNoteOpen(note.id)
      }
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  return (
    <div className="command-dock-container">
      {/* Capture Modal */}
      {captureOpen && (
        <div className="command-modal capture-modal">
          <input
            type="text"
            className="capture-input"
            placeholder="Quick note... (supports #tags and [[links]])"
            value={captureText}
            onChange={(e) => setCaptureText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCapture()
              } else if (e.key === 'Escape') {
                setCaptureOpen(false)
              }
            }}
            autoFocus
          />
        </div>
      )}

      {/* Jump Modal */}
      {jumpOpen && (
        <div className="command-modal jump-modal">
          <input
            type="text"
            className="jump-input"
            placeholder="Search notes..."
            value={jumpQuery}
            onChange={(e) => {
              setJumpQuery(e.target.value)
              // Debounce search in real implementation
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleJump()
              } else if (e.key === 'Escape') {
                setJumpOpen(false)
              }
            }}
            autoFocus
          />

          {jumpResults.length > 0 && (
            <ul className="jump-results">
              {jumpResults.slice(0, 10).map((note) => (
                <li key={note.id} className="jump-result">
                  <button
                    onClick={() => {
                      onNoteOpen?.(note.id)
                      setJumpOpen(false)
                      setJumpQuery('')
                    }}
                  >
                    <span className="result-title">{note.title}</span>
                    {note.tags.length > 0 && (
                      <span className="result-tags">
                        {note.tags.slice(0, 3).map((tag: string) => `#${tag}`).join(' ')}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Command Buttons */}
      <div className="command-buttons">
        {/* Capture */}
        <button
          className={`command-button ${captureOpen ? 'active' : ''}`}
          onClick={() => setCaptureOpen(!captureOpen)}
          title="Capture (Cmd+Shift+N)"
          disabled={!orbitId}
        >
          <span className="command-icon">✏️</span>
          <span className="command-label">Capture</span>
        </button>

        {/* Jump */}
        <button
          className={`command-button ${jumpOpen ? 'active' : ''}`}
          onClick={() => setJumpOpen(!jumpOpen)}
          title="Jump (Cmd+K)"
          disabled={!orbitId}
        >
          <span className="command-icon">🔍</span>
          <span className="command-label">Jump</span>
        </button>

        {/* Compose */}
        <div className="command-compose">
          <button
            className="command-button"
            onClick={() => handleCompose('blank')}
            title="Compose new note"
            disabled={!orbitId}
          >
            <span className="command-icon">➕</span>
            <span className="command-label">Compose</span>
          </button>

          {/* Compose Menu (Simple version) */}
          <div className="compose-menu">
            <button onClick={() => handleCompose('blank')}>Blank Note</button>
            <button onClick={() => handleCompose('daily')}>Daily Note</button>
          </div>
        </div>

        {/* Sync */}
        <button
          className="command-button"
          onClick={() => console.log('Sync clicked')}
          title="Sync status"
          disabled={!orbitId}
        >
          <span className="command-icon sync-icon">🔄</span>
          <span className="command-label">Sync</span>
        </button>
      </div>

      {/* Status Bar */}
      <div className="command-status">
        {orbitId ? (
          <span className="status-ready">Ready</span>
        ) : (
          <span className="status-no-orbit">No orbit selected</span>
        )}
      </div>
    </div>
  )
}

// Sync Status Indicator
export const SyncStatus: React.FC<{
  syncing?: boolean
  lastSync?: Date
  hasConflicts?: boolean
}> = ({ syncing = false, lastSync, hasConflicts = false }) => {
  if (syncing) {
    return <span className="sync-status syncing">⏳ Syncing...</span>
  }

  if (hasConflicts) {
    return <span className="sync-status conflict">⚠️ Conflicts</span>
  }

  if (lastSync) {
    return (
      <span className="sync-status synced">
        ✓ Synced {lastSync.toLocaleTimeString()}
      </span>
    )
  }

  return <span className="sync-status offline">⊗ Offline</span>
}
