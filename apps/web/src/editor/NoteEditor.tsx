// NoteEditor - Integration of BlockEditor with Database
import React, { useEffect, useState, useCallback } from 'react'
import { BlockEditor, Toolbar } from './index'
import { getNoteWithYjs, updateNoteContent } from '../db'
import type { Note, UUID } from '@orbit/shared-types'
import type { Editor as TiptapEditor } from '@tiptap/react'
import * as Y from 'yjs'
import './editor.css'

export interface NoteEditorProps {
  noteId: UUID
  onWikiLinkClick?: (title: string) => void
  onTagClick?: (tag: string) => void
  onSave?: (noteId: UUID) => void
  readOnly?: boolean
  showToolbar?: boolean
  autoSave?: boolean
  autoSaveDelay?: number
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  noteId,
  onWikiLinkClick,
  onTagClick,
  onSave,
  readOnly = false,
  showToolbar = true,
  autoSave = true,
  autoSaveDelay = 2000,
}) => {
  const [note, setNote] = useState<Note | null>(null)
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null)
  const [editor, setEditor] = useState<TiptapEditor | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Load note and Yjs document
  useEffect(() => {
    let mounted = true

    async function loadNote() {
      try {
        setLoading(true)
        const result = await getNoteWithYjs(noteId)

        if (mounted && result) {
          setNote(result.note)
          setYdoc(result.ydoc)
        }
      } catch (error) {
        console.error('Failed to load note:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadNote()

    return () => {
      mounted = false
    }
  }, [noteId])

  // Auto-save handler
  const saveNote = useCallback(
    async (_currentEditor: TiptapEditor) => {
      if (!ydoc || !autoSave || readOnly) return

      try {
        setSaving(true)

        // Update note content in database
        await updateNoteContent(noteId, ydoc)

        // Extract plain text for search (TODO: update contentText field)
        // const contentText = getEditorText(currentEditor)

        setLastSaved(new Date())

        if (onSave) {
          onSave(noteId)
        }
      } catch (error) {
        console.error('Failed to save note:', error)
      } finally {
        setSaving(false)
      }
    },
    [noteId, ydoc, autoSave, readOnly, onSave]
  )

  // Debounced save on editor update
  useEffect(() => {
    if (!editor || !autoSave) return

    const timeout = setTimeout(() => {
      saveNote(editor)
    }, autoSaveDelay)

    return () => clearTimeout(timeout)
  }, [editor, autoSave, autoSaveDelay, saveNote])

  // Handle editor update
  const handleUpdate = useCallback(
    (currentEditor: TiptapEditor) => {
      setEditor(currentEditor)
    },
    []
  )

  if (loading) {
    return (
      <div className="note-editor-loading">
        <div className="spinner" />
        <p>Loading note...</p>
      </div>
    )
  }

  if (!note || !ydoc) {
    return (
      <div className="note-editor-error">
        <p>Failed to load note</p>
      </div>
    )
  }

  return (
    <div className="note-editor-container">
      {/* Toolbar */}
      {showToolbar && editor && (
        <div className="note-editor-header">
          <Toolbar editor={editor} />
          <div className="note-editor-status">
            {saving && <span className="status-saving">Saving...</span>}
            {!saving && lastSaved && (
              <span className="status-saved">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="note-editor-content">
        <BlockEditor
          noteId={noteId}
          ydoc={ydoc}
          placeholder="Start writing..."
          onUpdate={handleUpdate}
          onWikiLinkClick={onWikiLinkClick}
          onTagClick={onTagClick}
          editable={!readOnly}
          autoFocus={true}
        />
      </div>
    </div>
  )
}

// Standalone save button (if auto-save is disabled)
export const SaveButton: React.FC<{
  onClick: () => void
  saving?: boolean
  disabled?: boolean
}> = ({ onClick, saving = false, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || saving}
      className="save-button"
    >
      {saving ? 'Saving...' : 'Save'}
    </button>
  )
}
