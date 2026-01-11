// Orbit CRUD Operations
import { db } from './schema'
import type { Orbit, UUID, SyncProviderType } from '@orbit/shared-types'

// ====================
// Create
// ====================

export async function createOrbit(data: {
  name: string
  syncProvider?: SyncProviderType
  syncConfig?: Record<string, unknown> | null
  encryptionEnabled?: boolean
}): Promise<Orbit> {
  const orbit: Orbit = {
    id: crypto.randomUUID(),
    name: data.name,
    createdAt: Date.now(),
    syncProvider: data.syncProvider || 'local',
    syncConfig: data.syncConfig || null,
    encryptionEnabled: data.encryptionEnabled || false,
    encryptionKey: null,
    lastSyncAt: null,
  }

  await db.orbits.add(orbit)
  console.log('✅ Orbit created:', orbit.id)
  return orbit
}

// ====================
// Read
// ====================

export async function getOrbit(id: UUID): Promise<Orbit | undefined> {
  return db.orbits.get(id)
}

export async function getAllOrbits(): Promise<Orbit[]> {
  return db.orbits.orderBy('createdAt').toArray()
}

export async function getOrbitWithStats(id: UUID) {
  const orbit = await db.orbits.get(id)
  if (!orbit) return undefined

  const noteCount = await db.notes.where('orbitId').equals(id).count()
  const notes = await db.notes.where('orbitId').equals(id).toArray()
  const lastModified = Math.max(...notes.map((n) => n.modifiedAt), 0)

  return {
    ...orbit,
    noteCount,
    lastModified,
  }
}

// ====================
// Update
// ====================

export async function updateOrbit(
  id: UUID,
  updates: Partial<Omit<Orbit, 'id' | 'createdAt'>>
): Promise<void> {
  const existing = await db.orbits.get(id)
  if (!existing) {
    throw new Error(`Orbit not found: ${id}`)
  }

  await db.orbits.update(id, updates)
  console.log('✅ Orbit updated:', id)
}

export async function setOrbitSyncProvider(
  id: UUID,
  provider: SyncProviderType,
  config: Record<string, unknown> | null
): Promise<void> {
  await updateOrbit(id, {
    syncProvider: provider,
    syncConfig: config,
  })
}

export async function enableOrbitEncryption(
  id: UUID,
  encryptionKey: string
): Promise<void> {
  await updateOrbit(id, {
    encryptionEnabled: true,
    encryptionKey,
  })
}

export async function disableOrbitEncryption(id: UUID): Promise<void> {
  await updateOrbit(id, {
    encryptionEnabled: false,
    encryptionKey: null,
  })
}

export async function updateLastSyncTime(id: UUID): Promise<void> {
  await updateOrbit(id, {
    lastSyncAt: Date.now(),
  })
}

// ====================
// Delete
// ====================

/**
 * Delete orbit and all associated data (notes, links, assets)
 * WARNING: This is destructive and cannot be undone!
 */
export async function deleteOrbit(id: UUID): Promise<void> {
  // Delete in transaction to ensure atomicity
  await db.transaction('rw', db.orbits, db.notes, db.links, db.assets, db.syncLogs, async () => {
    // Get all notes in this orbit
    const notes = await db.notes.where('orbitId').equals(id).toArray()
    const noteIds = notes.map((n) => n.id)

    // Delete all links related to these notes
    await db.links
      .where('sourceNoteId')
      .anyOf(noteIds)
      .or('targetNoteId')
      .anyOf(noteIds)
      .delete()

    // Delete all notes
    await db.notes.where('orbitId').equals(id).delete()

    // Delete all assets
    await db.assets.where('orbitId').equals(id).delete()

    // Delete sync logs
    await db.syncLogs.where('orbitId').equals(id).delete()

    // Finally, delete the orbit itself
    await db.orbits.delete(id)
  })

  console.log('🗑️  Orbit deleted:', id)
}

// ====================
// Utilities
// ====================

export async function getActiveOrbit(): Promise<Orbit | undefined> {
  // For now, return the first orbit
  // In V1, we'll implement orbit switching and persistence
  const orbits = await db.orbits.toArray()
  return orbits[0]
}

export async function setActiveOrbit(id: UUID): Promise<void> {
  // Store in localStorage for persistence
  localStorage.setItem('orbit:active', id)
}

export function getActiveOrbitId(): UUID | null {
  return localStorage.getItem('orbit:active')
}

export async function orbitExists(id: UUID): Promise<boolean> {
  const count = await db.orbits.where('id').equals(id).count()
  return count > 0
}

export async function countOrbits(): Promise<number> {
  return db.orbits.count()
}

// ====================
// Migration/Import
// ====================

export async function duplicateOrbit(sourceId: UUID, newName: string): Promise<Orbit> {
  const source = await db.orbits.get(sourceId)
  if (!source) {
    throw new Error(`Source orbit not found: ${sourceId}`)
  }

  // Create new orbit
  const newOrbit = await createOrbit({
    name: newName,
    syncProvider: 'local', // Always local for duplicates
    encryptionEnabled: false,
  })

  // Copy all notes
  const notes = await db.notes.where('orbitId').equals(sourceId).toArray()
  const noteIdMap = new Map<UUID, UUID>() // old -> new

  await db.transaction('rw', db.notes, db.links, async () => {
    // Copy notes
    for (const note of notes) {
      const newNoteId = crypto.randomUUID()
      noteIdMap.set(note.id, newNoteId)

      await db.notes.add({
        ...note,
        id: newNoteId,
        orbitId: newOrbit.id,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      })
    }

    // Copy links with updated IDs
    const links = await db.links
      .where('sourceNoteId')
      .anyOf(notes.map((n) => n.id))
      .toArray()

    for (const link of links) {
      const newSourceId = noteIdMap.get(link.sourceNoteId)
      const newTargetId = noteIdMap.get(link.targetNoteId)

      if (newSourceId && newTargetId) {
        await db.links.add({
          ...link,
          id: crypto.randomUUID(),
          sourceNoteId: newSourceId,
          targetNoteId: newTargetId,
        })
      }
    }
  })

  console.log('✅ Orbit duplicated:', newOrbit.id)
  return newOrbit
}
