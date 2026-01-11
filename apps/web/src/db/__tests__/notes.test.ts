// Note CRUD Tests with Yjs
import { describe, it, expect, beforeEach } from 'vitest'
import { clearDatabase, initDatabase } from '../schema'
import { createOrbit } from '../orbits'
import {
  createNote,
  getNote,
  getNoteWithYjs,
  getNotesByOrbit,
  getRecentNotes,
  getNotesByTag,
  searchNotes,
  updateNote,
  updateNoteContent,
  addPropertyToNote,
  removePropertyFromNote,
  addTagToNote,
  removeTagFromNote,
  deleteNote,
  restoreNote,
  permanentlyDeleteNote,
  getDeletedNotes,
  countNotes,
  getAllTags,
  createDailyNote,
  getDailyNote,
} from '../notes'
import * as Y from 'yjs'

describe('Note CRUD Operations', () => {
  let orbitId: string

  beforeEach(async () => {
    await clearDatabase()
    await initDatabase()
    const orbit = await createOrbit({ name: 'Test Orbit' })
    orbitId = orbit.id
  })

  describe('Create', () => {
    it('should create a basic note', async () => {
      const note = await createNote({
        orbitId,
        title: 'Test Note',
        content: 'This is test content',
      })

      expect(note.id).toBeDefined()
      expect(note.title).toBe('Test Note')
      expect(note.contentText).toBe('This is test content')
      expect(note.orbitId).toBe(orbitId)
      expect(note.type).toBe('note')
    })

    it('should create note with tags', async () => {
      const note = await createNote({
        orbitId,
        title: 'Tagged Note',
        content: 'Content with #tag1 and #tag2',
      })

      expect(note.tags).toContain('tag1')
      expect(note.tags).toContain('tag2')
    })

    it('should create note with properties', async () => {
      const note = await createNote({
        orbitId,
        title: 'Note with Props',
        properties: {
          status: 'active',
          priority: 'high',
        },
      })

      expect(note.properties.status).toBe('active')
      expect(note.properties.priority).toBe('high')
    })

    it('should create daily note', async () => {
      const date = new Date('2024-01-15')
      const note = await createDailyNote(orbitId, date)

      expect(note.type).toBe('daily')
      expect(note.properties.date).toBe('2024-01-15')
      expect(note.title).toContain('2024-01-15')
    })

    it('should extract links from content', async () => {
      // First create a target note
      await createNote({ orbitId, title: 'Target Note' })

      // Create note with link
      const note = await createNote({
        orbitId,
        title: 'Source Note',
        content: 'This links to [[Target Note]]',
      })

      expect(note.contentText).toContain('[[Target Note]]')
    })
  })

  describe('Read', () => {
    it('should get note by id', async () => {
      const created = await createNote({ orbitId, title: 'Test' })
      const fetched = await getNote(created.id)

      expect(fetched).toBeDefined()
      expect(fetched?.id).toBe(created.id)
    })

    it('should get note with Yjs document', async () => {
      const created = await createNote({
        orbitId,
        title: 'Test',
        content: 'Initial content',
      })

      const result = await getNoteWithYjs(created.id)
      expect(result).toBeDefined()
      expect(result?.note.id).toBe(created.id)
      expect(result?.ydoc).toBeInstanceOf(Y.Doc)

      const ytext = result?.ydoc.getText('content')
      expect(ytext?.toString()).toBe('Initial content')
    })

    it('should get notes by orbit', async () => {
      await createNote({ orbitId, title: 'Note 1' })
      await createNote({ orbitId, title: 'Note 2' })
      await createNote({ orbitId, title: 'Note 3' })

      const notes = await getNotesByOrbit(orbitId)
      expect(notes.length).toBe(3)
    })

    it('should get recent notes', async () => {
      await createNote({ orbitId, title: 'Old' })
      await new Promise((resolve) => setTimeout(resolve, 10))
      await createNote({ orbitId, title: 'Recent' })

      const recent = await getRecentNotes(orbitId, 1)
      expect(recent.length).toBe(1)
      expect(recent[0].title).toBe('Recent')
    })

    it('should get notes by tag', async () => {
      await createNote({ orbitId, title: 'Note 1', tags: ['project'] })
      await createNote({ orbitId, title: 'Note 2', tags: ['project', 'urgent'] })
      await createNote({ orbitId, title: 'Note 3', tags: ['personal'] })

      const projectNotes = await getNotesByTag(orbitId, 'project')
      expect(projectNotes.length).toBe(2)
    })

    it('should get daily note', async () => {
      const date = new Date('2024-01-15')
      await createDailyNote(orbitId, date)

      const fetched = await getDailyNote(orbitId, date)
      expect(fetched).toBeDefined()
      expect(fetched?.type).toBe('daily')
    })
  })

  describe('Search', () => {
    beforeEach(async () => {
      await createNote({ orbitId, title: 'JavaScript Guide', content: 'Learn JS' })
      await createNote({ orbitId, title: 'Python Tutorial', content: 'Learn Python' })
      await createNote({
        orbitId,
        title: 'React Basics',
        content: 'Build with React and JavaScript',
      })
    })

    it('should search by title', async () => {
      const results = await searchNotes(orbitId, 'JavaScript')
      expect(results.length).toBeGreaterThanOrEqual(1)
      // Check that at least one result has JavaScript in title
      expect(results.some((r) => r.title.includes('JavaScript'))).toBe(true)
    })

    it('should search by content', async () => {
      const results = await searchNotes(orbitId, 'Python')
      expect(results.length).toBeGreaterThanOrEqual(1)
    })

    it('should be case insensitive', async () => {
      const results = await searchNotes(orbitId, 'javascript')
      expect(results.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Update', () => {
    it('should update note title', async () => {
      const note = await createNote({ orbitId, title: 'Old Title' })
      await updateNote(note.id, { title: 'New Title' })

      const updated = await getNote(note.id)
      expect(updated?.title).toBe('New Title')
    })

    it('should update note content with Yjs', async () => {
      const note = await createNote({ orbitId, title: 'Test' })

      const ydoc = new Y.Doc()
      const ytext = ydoc.getText('content')
      ytext.insert(0, 'Updated content via Yjs')

      await updateNoteContent(note.id, ydoc)

      const result = await getNoteWithYjs(note.id)
      expect(result?.ydoc.getText('content').toString()).toBe('Updated content via Yjs')
    })

    it('should add property', async () => {
      const note = await createNote({ orbitId, title: 'Test' })
      await addPropertyToNote(note.id, 'status', 'done')

      const updated = await getNote(note.id)
      expect(updated?.properties.status).toBe('done')
    })

    it('should remove property', async () => {
      const note = await createNote({
        orbitId,
        title: 'Test',
        properties: { status: 'active' },
      })
      await removePropertyFromNote(note.id, 'status')

      const updated = await getNote(note.id)
      expect(updated?.properties.status).toBeUndefined()
    })

    it('should add tag', async () => {
      const note = await createNote({ orbitId, title: 'Test' })
      await addTagToNote(note.id, 'important')

      const updated = await getNote(note.id)
      expect(updated?.tags).toContain('important')
    })

    it('should remove tag', async () => {
      const note = await createNote({ orbitId, title: 'Test', tags: ['temp'] })
      await removeTagFromNote(note.id, 'temp')

      const updated = await getNote(note.id)
      expect(updated?.tags).not.toContain('temp')
    })

    it('should update modifiedAt timestamp', async () => {
      const note = await createNote({ orbitId, title: 'Test' })
      const originalModified = note.modifiedAt

      await new Promise((resolve) => setTimeout(resolve, 10))
      await updateNote(note.id, { title: 'Updated' })

      const updated = await getNote(note.id)
      expect(updated?.modifiedAt).toBeGreaterThan(originalModified)
    })
  })

  describe('Delete', () => {
    it('should soft delete note', async () => {
      const note = await createNote({ orbitId, title: 'Test' })
      await deleteNote(note.id)

      const deleted = await getNote(note.id)
      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('should exclude soft-deleted notes from queries', async () => {
      const note = await createNote({ orbitId, title: 'Test' })
      await deleteNote(note.id)

      const notes = await getNotesByOrbit(orbitId)
      expect(notes.find((n) => n.id === note.id)).toBeUndefined()
    })

    it('should get deleted notes', async () => {
      const note = await createNote({ orbitId, title: 'Test' })
      await deleteNote(note.id)

      const deleted = await getDeletedNotes(orbitId)
      expect(deleted.length).toBe(1)
      expect(deleted[0].id).toBe(note.id)
    })

    it('should restore deleted note', async () => {
      const note = await createNote({ orbitId, title: 'Test' })
      await deleteNote(note.id)
      await restoreNote(note.id)

      const restored = await getNote(note.id)
      expect(restored?.deletedAt).toBeNull()
    })

    it('should permanently delete note', async () => {
      const note = await createNote({ orbitId, title: 'Test' })
      await permanentlyDeleteNote(note.id)

      const deleted = await getNote(note.id)
      expect(deleted).toBeUndefined()
    })
  })

  describe('Utilities', () => {
    it('should count notes', async () => {
      await createNote({ orbitId, title: 'Note 1' })
      await createNote({ orbitId, title: 'Note 2' })

      const count = await countNotes(orbitId)
      expect(count).toBe(2)
    })

    it('should get all tags', async () => {
      await createNote({ orbitId, title: 'N1', tags: ['tag1', 'tag2'] })
      await createNote({ orbitId, title: 'N2', tags: ['tag2', 'tag3'] })

      const tags = await getAllTags(orbitId)
      expect(tags).toContain('tag1')
      expect(tags).toContain('tag2')
      expect(tags).toContain('tag3')
      expect(tags.length).toBe(3)
    })
  })
})
