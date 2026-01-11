// Note CRUD Operations with Yjs Integration
import { db } from './schema'
import type { Note, UUID, PropertyValue } from '@orbit/shared-types'
import * as Y from 'yjs'
import { extractLinks, extractTags } from '@orbit/markdown-parser'

// ====================
// Create
// ====================

export interface CreateNoteData {
  orbitId: UUID
  title?: string
  content?: string // Plain text or markdown
  properties?: Record<string, PropertyValue>
  tags?: string[]
  type?: 'note' | 'daily' | 'task'
}

export async function createNote(data: CreateNoteData): Promise<Note> {
  const now = Date.now()

  // Create Yjs document
  const ydoc = new Y.Doc()
  const ytext = ydoc.getText('content')

  // Initialize content if provided
  if (data.content) {
    ytext.insert(0, data.content)
  }

  // Extract links and tags from content
  const contentText = data.content || ''
  const links = extractLinks(contentText)
  const tags = [...new Set([...(data.tags || []), ...extractTags(contentText)])]

  const note: Note = {
    id: crypto.randomUUID(),
    orbitId: data.orbitId,
    title: data.title || 'Untitled',
    content: Y.encodeStateAsUpdate(ydoc), // Serialize Yjs doc
    contentText: contentText, // For full-text search
    createdAt: now,
    modifiedAt: now,
    properties: data.properties || {},
    tags,
    linkedNoteIds: [], // Will be populated by createLinks
    type: data.type || 'note',
  }

  await db.transaction('rw', db.notes, db.links, async () => {
    await db.notes.add(note)

    // Create links if any were found
    if (links.length > 0) {
      await createLinksFromTitles(note.id, links)
    }
  })

  console.log('✅ Note created:', note.id)
  return note
}

/**
 * Create a daily note (special type with date property)
 */
export async function createDailyNote(orbitId: UUID, date: Date): Promise<Note> {
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD

  return createNote({
    orbitId,
    title: `Daily Note - ${dateStr}`,
    type: 'daily',
    properties: {
      date: dateStr,
    },
  })
}

// ====================
// Read
// ====================

export async function getNote(id: UUID): Promise<Note | undefined> {
  return db.notes.get(id)
}

export async function getNoteWithYjs(id: UUID): Promise<{ note: Note; ydoc: Y.Doc } | undefined> {
  const note = await db.notes.get(id)
  if (!note) return undefined

  // Deserialize Yjs doc
  const ydoc = new Y.Doc()
  Y.applyUpdate(ydoc, note.content)

  return { note, ydoc }
}

export async function getNotesByOrbit(orbitId: UUID): Promise<Note[]> {
  return db.notes.where('orbitId').equals(orbitId).and((note) => !note.deletedAt).toArray()
}

export async function getRecentNotes(orbitId: UUID, limit = 10): Promise<Note[]> {
  return db.notes
    .where('orbitId')
    .equals(orbitId)
    .and((note) => !note.deletedAt)
    .reverse()
    .sortBy('modifiedAt')
    .then((notes) => notes.slice(0, limit))
}

export async function getNotesByTag(orbitId: UUID, tag: string): Promise<Note[]> {
  return db.notes
    .where('orbitId')
    .equals(orbitId)
    .and((note) => !note.deletedAt && note.tags.includes(tag))
    .toArray()
}

export async function getNotesByType(
  orbitId: UUID,
  type: 'note' | 'daily' | 'task'
): Promise<Note[]> {
  return db.notes
    .where('[orbitId+type]')
    .equals([orbitId, type])
    .and((note) => !note.deletedAt)
    .toArray()
}

export async function getDailyNote(orbitId: UUID, date: Date): Promise<Note | undefined> {
  const dateStr = date.toISOString().split('T')[0]
  const notes = await db.notes
    .where('orbitId')
    .equals(orbitId)
    .and((note) => note.type === 'daily' && note.properties.date === dateStr)
    .toArray()

  return notes[0]
}

// ====================
// Search
// ====================

export async function searchNotes(orbitId: UUID, query: string): Promise<Note[]> {
  const lowerQuery = query.toLowerCase()

  return db.notes
    .where('orbitId')
    .equals(orbitId)
    .and(
      (note) =>
        !note.deletedAt &&
        (note.title.toLowerCase().includes(lowerQuery) ||
          note.contentText.toLowerCase().includes(lowerQuery) ||
          note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)))
    )
    .toArray()
}

export async function searchNotesByProperty(
  orbitId: UUID,
  propertyKey: string,
  propertyValue: PropertyValue
): Promise<Note[]> {
  return db.notes
    .where('orbitId')
    .equals(orbitId)
    .and((note) => !note.deletedAt && note.properties[propertyKey] === propertyValue)
    .toArray()
}

// ====================
// Update
// ====================

export interface UpdateNoteData {
  title?: string
  content?: Uint8Array // Yjs update
  contentText?: string // For search
  properties?: Record<string, PropertyValue>
  tags?: string[]
  type?: 'note' | 'daily' | 'task'
}

export async function updateNote(id: UUID, updates: UpdateNoteData): Promise<void> {
  const existing = await db.notes.get(id)
  if (!existing) {
    throw new Error(`Note not found: ${id}`)
  }

  // Extract links from new content if contentText provided
  let linkedNoteIds = existing.linkedNoteIds
  if (updates.contentText) {
    const links = extractLinks(updates.contentText)
    if (links.length > 0) {
      await updateLinksFromTitles(id, links)
      linkedNoteIds = await getLinkedNoteIds(id)
    }

    // Extract tags
    const extractedTags = extractTags(updates.contentText)
    if (extractedTags.length > 0) {
      updates.tags = [...new Set([...(updates.tags || existing.tags), ...extractedTags])]
    }
  }

  await db.notes.update(id, {
    ...updates,
    modifiedAt: Date.now(),
    linkedNoteIds,
  })

  console.log('✅ Note updated:', id)
}

export async function updateNoteContent(id: UUID, ydoc: Y.Doc): Promise<void> {
  const content = Y.encodeStateAsUpdate(ydoc)
  const contentText = ydoc.getText('content').toString()

  await updateNote(id, { content, contentText })
}

export async function addPropertyToNote(
  id: UUID,
  key: string,
  value: PropertyValue
): Promise<void> {
  const note = await db.notes.get(id)
  if (!note) throw new Error(`Note not found: ${id}`)

  const properties = { ...note.properties, [key]: value }
  await updateNote(id, { properties })
}

export async function removePropertyFromNote(id: UUID, key: string): Promise<void> {
  const note = await db.notes.get(id)
  if (!note) throw new Error(`Note not found: ${id}`)

  const properties = { ...note.properties }
  delete properties[key]
  await updateNote(id, { properties })
}

export async function addTagToNote(id: UUID, tag: string): Promise<void> {
  const note = await db.notes.get(id)
  if (!note) throw new Error(`Note not found: ${id}`)

  if (!note.tags.includes(tag)) {
    const tags = [...note.tags, tag]
    await updateNote(id, { tags })
  }
}

export async function removeTagFromNote(id: UUID, tag: string): Promise<void> {
  const note = await db.notes.get(id)
  if (!note) throw new Error(`Note not found: ${id}`)

  const tags = note.tags.filter((t) => t !== tag)
  await updateNote(id, { tags })
}

// ====================
// Delete
// ====================

/**
 * Soft delete - marks note as deleted but keeps data
 */
export async function deleteNote(id: UUID): Promise<void> {
  await db.notes.update(id, {
    deletedAt: Date.now(),
  })
  console.log('🗑️  Note soft-deleted:', id)
}

/**
 * Permanently delete note and all associated data
 */
export async function permanentlyDeleteNote(id: UUID): Promise<void> {
  await db.transaction('rw', db.notes, db.links, db.assets, async () => {
    // Delete all links
    await db.links.where('sourceNoteId').equals(id).or('targetNoteId').equals(id).delete()

    // Delete assets (Note: actual file cleanup would happen separately)
    await db.assets.where('noteId').equals(id).delete()

    // Delete note
    await db.notes.delete(id)
  })

  console.log('🗑️  Note permanently deleted:', id)
}

/**
 * Restore soft-deleted note
 */
export async function restoreNote(id: UUID): Promise<void> {
  await db.notes.update(id, {
    deletedAt: null,
  })
  console.log('♻️  Note restored:', id)
}

/**
 * Get all deleted notes (for trash view)
 */
export async function getDeletedNotes(orbitId: UUID): Promise<Note[]> {
  return db.notes.where('orbitId').equals(orbitId).and((note) => note.deletedAt !== null).toArray()
}

/**
 * Empty trash (permanently delete all soft-deleted notes)
 */
export async function emptyTrash(orbitId: UUID): Promise<void> {
  const deleted = await getDeletedNotes(orbitId)
  for (const note of deleted) {
    await permanentlyDeleteNote(note.id)
  }
  console.log('🗑️  Trash emptied')
}

// ====================
// Utilities
// ====================

export async function countNotes(orbitId: UUID): Promise<number> {
  return db.notes.where('orbitId').equals(orbitId).and((note) => !note.deletedAt).count()
}

export async function getAllTags(orbitId: UUID): Promise<string[]> {
  const notes = await db.notes.where('orbitId').equals(orbitId).toArray()
  const tagSet = new Set<string>()
  notes.forEach((note) => note.tags.forEach((tag) => tagSet.add(tag)))
  return Array.from(tagSet).sort()
}

export async function noteExists(id: UUID): Promise<boolean> {
  const note = await db.notes.get(id)
  return note !== undefined && note.deletedAt === null
}

// ====================
// Link Helpers
// ====================

async function createLinksFromTitles(sourceId: UUID, titles: string[]): Promise<void> {
  for (const title of titles) {
    const target = await findNoteByTitle(title, sourceId)
    if (target) {
      await createLink(sourceId, target.id, 'link')
    }
  }
}

async function updateLinksFromTitles(sourceId: UUID, titles: string[]): Promise<void> {
  // Remove old links
  await db.links.where('sourceNoteId').equals(sourceId).and((link) => link.type === 'link').delete()

  // Create new links
  await createLinksFromTitles(sourceId, titles)
}

async function findNoteByTitle(title: string, excludeId?: UUID): Promise<Note | undefined> {
  const notes = await db.notes.where('title').equalsIgnoreCase(title).toArray()
  return notes.find((n) => n.id !== excludeId && !n.deletedAt)
}

async function getLinkedNoteIds(sourceId: UUID): Promise<UUID[]> {
  const links = await db.links.where('sourceNoteId').equals(sourceId).toArray()
  return links.map((link) => link.targetNoteId)
}

async function createLink(sourceId: UUID, targetId: UUID, type: 'link' | 'embed'): Promise<void> {
  // Check if link already exists
  const existing = await db.links
    .where('[sourceNoteId+targetNoteId]')
    .equals([sourceId, targetId])
    .first()

  if (!existing) {
    await db.links.add({
      id: crypto.randomUUID(),
      sourceNoteId: sourceId,
      targetNoteId: targetId,
      type,
      createdAt: Date.now(),
    })
  }
}
