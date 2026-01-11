// OrbitBar - Left Sidebar (Workspace Switcher + Quick Access)
import React, { useEffect, useState } from 'react'
import { getAllOrbits, getRecentNotes } from '../../db'
import type { UUID, Orbit, Note } from '@orbit/shared-types'
import './OrbitBar.css'

export interface OrbitBarProps {
  activeOrbitId: UUID | null
  collapsed: boolean
  onToggleCollapse: () => void
  onOrbitSwitch?: (orbitId: UUID) => void
  onNoteOpen?: (noteId: UUID) => void
}

export const OrbitBar: React.FC<OrbitBarProps> = ({
  activeOrbitId,
  collapsed,
  onToggleCollapse,
  onOrbitSwitch,
  onNoteOpen,
}) => {
  const [orbits, setOrbits] = useState<Orbit[]>([])
  const [recentNotes, setRecentNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  // Load orbits
  useEffect(() => {
    async function loadOrbits() {
      try {
        const allOrbits = await getAllOrbits()
        setOrbits(allOrbits)
      } catch (error) {
        console.error('Failed to load orbits:', error)
      } finally {
        setLoading(false)
      }
    }

    loadOrbits()
  }, [])

  // Load recent notes for active orbit
  useEffect(() => {
    if (!activeOrbitId) return

    // Capture activeOrbitId for type safety
    const currentOrbitId: UUID = activeOrbitId

    async function loadRecent() {
      try {
        const notes = await getRecentNotes(currentOrbitId, 5)
        setRecentNotes(notes)
      } catch (error) {
        console.error('Failed to load recent notes:', error)
      }
    }

    loadRecent()
  }, [activeOrbitId])

  if (collapsed) {
    return (
      <div className="orbit-bar-collapsed">
        <button
          className="orbit-bar-toggle"
          onClick={onToggleCollapse}
          title="Expand OrbitBar"
        >
          ☰
        </button>
      </div>
    )
  }

  return (
    <div className="orbit-bar-content">
      {/* Header */}
      <div className="orbit-bar-header">
        <h2 className="orbit-bar-title">Orbits</h2>
        <button
          className="orbit-bar-toggle"
          onClick={onToggleCollapse}
          title="Collapse OrbitBar (Cmd+\)"
        >
          ←
        </button>
      </div>

      {/* Orbit List */}
      <div className="orbit-list">
        {loading ? (
          <div className="orbit-bar-loading">Loading...</div>
        ) : orbits.length === 0 ? (
          <div className="orbit-bar-empty">No orbits yet</div>
        ) : (
          orbits.map((orbit) => (
            <button
              key={orbit.id}
              className={`orbit-item ${orbit.id === activeOrbitId ? 'active' : ''}`}
              onClick={() => onOrbitSwitch?.(orbit.id)}
              title={orbit.name}
            >
              <div className="orbit-icon">
                {orbit.name.charAt(0).toUpperCase()}
              </div>
              <div className="orbit-info">
                <div className="orbit-name">{orbit.name}</div>
                {orbit.lastSyncAt && (
                  <div className="orbit-sync">
                    Synced {new Date(orbit.lastSyncAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Recent Notes */}
      {activeOrbitId && recentNotes.length > 0 && (
        <div className="orbit-recent">
          <h3 className="recent-title">Recent</h3>
          <div className="recent-list">
            {recentNotes.map((note) => (
              <button
                key={note.id}
                className="recent-item"
                onClick={() => onNoteOpen?.(note.id)}
                title={note.title}
              >
                <span className="recent-icon">📄</span>
                <span className="recent-name">{note.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="orbit-bar-footer">
        <button className="orbit-action" title="Settings">
          ⚙️
        </button>
        <button className="orbit-action" title="New Orbit">
          +
        </button>
      </div>
    </div>
  )
}
