// FocusRail - Right Sidebar (Context / Action / Meta)
import React, { useEffect, useState } from 'react'
import {
  getNote,
  getBacklinkNotes,
  getLinkedNotes,
} from '../../db'
import type { UUID, Note } from '@orbit/shared-types'
import './FocusRail.css'

export interface FocusRailProps {
  noteId: UUID | null
  collapsed: boolean
  onToggleCollapse: () => void
  onNoteOpen?: (noteId: UUID) => void
}

type FocusTab = 'context' | 'action' | 'meta'

export const FocusRail: React.FC<FocusRailProps> = ({
  noteId,
  collapsed,
  onToggleCollapse,
  onNoteOpen,
}) => {
  const [activeTab, setActiveTab] = useState<FocusTab>('context')
  const [note, setNote] = useState<Note | null>(null)
  const [backlinks, setBacklinks] = useState<Note[]>([])
  const [linkedNotes, setLinkedNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)

  // Load note data
  useEffect(() => {
    if (!noteId) {
      setNote(null)
      setBacklinks([])
      setLinkedNotes([])
      return
    }

    // Capture noteId for type safety
    const currentNoteId: UUID = noteId

    async function loadNoteData() {
      setLoading(true)
      try {
        const [noteData, backlinksData, linkedData] = await Promise.all([
          getNote(currentNoteId),
          getBacklinkNotes(currentNoteId),
          getLinkedNotes(currentNoteId),
        ])

        setNote(noteData || null)
        setBacklinks(backlinksData)
        setLinkedNotes(linkedData)
      } catch (error) {
        console.error('Failed to load note data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadNoteData()
  }, [noteId])

  if (collapsed) {
    return (
      <div className="focus-rail-collapsed">
        <button
          className="focus-rail-toggle"
          onClick={onToggleCollapse}
          title="Expand FocusRail"
        >
          →
        </button>
      </div>
    )
  }

  if (!noteId) {
    return (
      <div className="focus-rail-content">
        <div className="focus-rail-header">
          <h2>Focus</h2>
          <button
            className="focus-rail-toggle"
            onClick={onToggleCollapse}
            title="Collapse FocusRail (Cmd+/)"
          >
            →
          </button>
        </div>
        <div className="focus-rail-empty">
          <p>Open a note to see details</p>
        </div>
      </div>
    )
  }

  return (
    <div className="focus-rail-content">
      {/* Header */}
      <div className="focus-rail-header">
        <h2>Focus</h2>
        <button
          className="focus-rail-toggle"
          onClick={onToggleCollapse}
          title="Collapse FocusRail (Cmd+/)"
        >
          →
        </button>
      </div>

      {/* Tabs */}
      <div className="focus-tabs">
        <button
          className={`focus-tab ${activeTab === 'context' ? 'active' : ''}`}
          onClick={() => setActiveTab('context')}
        >
          Context
        </button>
        <button
          className={`focus-tab ${activeTab === 'action' ? 'active' : ''}`}
          onClick={() => setActiveTab('action')}
        >
          Action
        </button>
        <button
          className={`focus-tab ${activeTab === 'meta' ? 'active' : ''}`}
          onClick={() => setActiveTab('meta')}
        >
          Meta
        </button>
      </div>

      {/* Tab Content */}
      <div className="focus-content">
        {loading ? (
          <div className="focus-loading">Loading...</div>
        ) : (
          <>
            {activeTab === 'context' && (
              <ContextTab
                backlinks={backlinks}
                linkedNotes={linkedNotes}
                onNoteOpen={onNoteOpen}
              />
            )}
            {activeTab === 'action' && (
              <ActionTab note={note} />
            )}
            {activeTab === 'meta' && (
              <MetaTab note={note} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Context Tab: Backlinks + Outbound Links + Mini Graph
const ContextTab: React.FC<{
  backlinks: Note[]
  linkedNotes: Note[]
  onNoteOpen?: (noteId: UUID) => void
}> = ({ backlinks, linkedNotes, onNoteOpen }) => {
  return (
    <div className="context-tab">
      {/* Backlinks */}
      <div className="context-section">
        <h3 className="context-section-title">
          Backlinks ({backlinks.length})
        </h3>
        {backlinks.length === 0 ? (
          <p className="context-empty">No backlinks yet</p>
        ) : (
          <ul className="context-list">
            {backlinks.map((note) => (
              <li key={note.id} className="context-item">
                <button
                  className="context-link"
                  onClick={() => onNoteOpen?.(note.id)}
                >
                  {note.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Outbound Links */}
      <div className="context-section">
        <h3 className="context-section-title">
          Links ({linkedNotes.length})
        </h3>
        {linkedNotes.length === 0 ? (
          <p className="context-empty">No outbound links</p>
        ) : (
          <ul className="context-list">
            {linkedNotes.map((note) => (
              <li key={note.id} className="context-item">
                <button
                  className="context-link"
                  onClick={() => onNoteOpen?.(note.id)}
                >
                  {note.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mini Graph */}
      <div className="context-section">
        <h3 className="context-section-title">Graph</h3>
        <div className="mini-graph">
          <p className="mini-graph-placeholder">
            Graph visualization (V1 feature)
          </p>
        </div>
      </div>
    </div>
  )
}

// Action Tab: Tasks + Quick Properties + Share
const ActionTab: React.FC<{
  note: Note | null
}> = ({ note }) => {
  if (!note) return <p>No note selected</p>

  // Extract tasks from note (simplified)
  const hasTasks = note.contentText.includes('- [ ]') || note.contentText.includes('- [x]')

  return (
    <div className="action-tab">
      {/* Embedded Tasks */}
      <div className="action-section">
        <h3 className="action-section-title">Tasks</h3>
        {!hasTasks ? (
          <p className="action-empty">No tasks in this note</p>
        ) : (
          <div className="action-tasks">
            <p>Tasks extracted from note (TODO: implement)</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="action-section">
        <h3 className="action-section-title">Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-button">Share</button>
          <button className="action-button">Duplicate</button>
          <button className="action-button">Export</button>
          <button className="action-button">Delete</button>
        </div>
      </div>
    </div>
  )
}

// Meta Tab: Properties + Tags + Stats
const MetaTab: React.FC<{
  note: Note | null
}> = ({ note }) => {
  if (!note) return <p>No note selected</p>

  return (
    <div className="meta-tab">
      {/* Properties */}
      <div className="meta-section">
        <h3 className="meta-section-title">Properties</h3>
        {Object.keys(note.properties).length === 0 ? (
          <p className="meta-empty">No properties</p>
        ) : (
          <dl className="meta-properties">
            {Object.entries(note.properties).map(([key, value]) => (
              <React.Fragment key={key}>
                <dt className="meta-key">{key}</dt>
                <dd className="meta-value">{String(value)}</dd>
              </React.Fragment>
            ))}
          </dl>
        )}
      </div>

      {/* Tags */}
      <div className="meta-section">
        <h3 className="meta-section-title">Tags</h3>
        {note.tags.length === 0 ? (
          <p className="meta-empty">No tags</p>
        ) : (
          <div className="meta-tags">
            {note.tags.map((tag) => (
              <span key={tag} className="meta-tag">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="meta-section">
        <h3 className="meta-section-title">Metadata</h3>
        <dl className="meta-info">
          <dt>Created</dt>
          <dd>{new Date(note.createdAt).toLocaleString()}</dd>
          <dt>Modified</dt>
          <dd>{new Date(note.modifiedAt).toLocaleString()}</dd>
          <dt>Type</dt>
          <dd>{note.type}</dd>
          <dt>Words</dt>
          <dd>{note.contentText.split(/\s+/).length}</dd>
        </dl>
      </div>
    </div>
  )
}
