// WikiLink Integration Tests
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../schema'
import { createOrbit } from '../orbits'
import { createNote, findOrCreateNoteByTitle } from '../notes'
import type { UUID } from '@orbit/shared-types'

describe('WikiLink Integration', () => {
  let orbitId: UUID

  beforeEach(async () => {
    await db.delete()
    await db.open()
    const orbit = await createOrbit({ name: 'Test Orbit' })
    orbitId = orbit.id
  })

  describe('findOrCreateNoteByTitle', () => {
    it('should find existing note by exact title', async () => {
      const existing = await createNote({
        orbitId,
        title: 'Test Note',
        content: 'Content',
      })

      const found = await findOrCreateNoteByTitle(orbitId, 'Test Note')

      expect(found.id).toBe(existing.id)
      expect(found.title).toBe('Test Note')
    })

    it('should find existing note by case-insensitive title', async () => {
      const existing = await createNote({
        orbitId,
        title: 'Test Note',
        content: 'Content',
      })

      const found = await findOrCreateNoteByTitle(orbitId, 'test note')

      expect(found.id).toBe(existing.id)
      expect(found.title).toBe('Test Note')
    })

    it('should create new note if not found', async () => {
      const note = await findOrCreateNoteByTitle(orbitId, 'New Note')

      expect(note.title).toBe('New Note')
      expect(note.content).toBeDefined()

      // Verify it was actually created in DB
      const notes = await db.notes.where('orbitId').equals(orbitId).toArray()
      expect(notes.length).toBe(1)
      expect(notes[0].title).toBe('New Note')
    })

    it('should not find deleted notes', async () => {
      const existing = await createNote({
        orbitId,
        title: 'Deleted Note',
        content: 'Content',
      })

      // Soft delete
      await db.notes.update(existing.id, { deletedAt: Date.now() })

      const note = await findOrCreateNoteByTitle(orbitId, 'Deleted Note')

      // Should create new note, not return deleted one
      expect(note.id).not.toBe(existing.id)
      expect(note.title).toBe('Deleted Note')
      expect(note.deletedAt).toBeUndefined()
    })

    it('should create note with empty content', async () => {
      const note = await findOrCreateNoteByTitle(orbitId, 'Empty Note')

      expect(note.contentText).toBe('')
      expect(note.tags).toEqual([])
      expect(note.linkedNoteIds).toEqual([])
    })

    it('should work with special characters in title', async () => {
      const note = await findOrCreateNoteByTitle(orbitId, 'Note with [[brackets]] and #tags')

      expect(note.title).toBe('Note with [[brackets]] and #tags')
    })
  })

  describe('WikiLink workflow', () => {
    it('should create linked note chain', async () => {
      // Create first note with wiki link
      const note1 = await createNote({
        orbitId,
        title: 'First Note',
        content: 'This links to [[Second Note]]',
      })

      // Simulate clicking wiki link - finds or creates Second Note
      const note2 = await findOrCreateNoteByTitle(orbitId, 'Second Note')

      expect(note2.title).toBe('Second Note')

      // Add content to second note with another wiki link
      await db.notes.update(note2.id, {
        contentText: 'This links to [[Third Note]]',
      })

      // Simulate clicking second wiki link
      const note3 = await findOrCreateNoteByTitle(orbitId, 'Third Note')

      expect(note3.title).toBe('Third Note')

      // Verify all three notes exist
      const allNotes = await db.notes.where('orbitId').equals(orbitId).toArray()
      expect(allNotes.length).toBe(3)
      expect(allNotes.map((n) => n.title).sort()).toEqual([
        'First Note',
        'Second Note',
        'Third Note',
      ])
    })
  })
})
