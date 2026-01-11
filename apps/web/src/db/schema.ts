// IndexedDB Schema for ORBIT Notes
import Dexie, { Table } from 'dexie'
import type {
  UUID,
  Orbit,
  Note,
  Link,
  Asset,
  SyncLog,
} from '@orbit/shared-types'

// ====================
// Database Schema
// ====================

export class OrbitDatabase extends Dexie {
  // Tables
  orbits!: Table<Orbit, UUID>
  notes!: Table<Note, UUID>
  links!: Table<Link, UUID>
  assets!: Table<Asset, UUID>
  syncLogs!: Table<SyncLog, UUID>

  constructor() {
    super('OrbitNotesDB')

    // Schema version 1
    this.version(1).stores({
      // Orbits: indexed by id (primary key)
      orbits: 'id, createdAt, lastSyncAt',

      // Notes: full-text search via contentText, indexed by orbitId, timestamps, tags
      notes: `
        id,
        orbitId,
        title,
        createdAt,
        modifiedAt,
        deletedAt,
        type,
        *tags,
        *linkedNoteIds
      `,

      // Links: indexed by source and target for fast backlink queries
      links: 'id, sourceNoteId, targetNoteId, type, [sourceNoteId+targetNoteId]',

      // Assets: indexed by orbitId and noteId
      assets: 'id, orbitId, noteId, hash, uploadedAt',

      // SyncLog: indexed for sync operations
      syncLogs: 'id, orbitId, entityId, timestamp, synced, conflicted',
    })
  }
}

// ====================
// Database Instance
// ====================

export const db = new OrbitDatabase()

// ====================
// Helper Types
// ====================

export interface NoteWithBacklinks extends Note {
  backlinks?: Link[]
  outboundLinks?: Link[]
}

export interface OrbitWithStats extends Orbit {
  noteCount?: number
  lastModified?: number
}

// ====================
// Initialization
// ====================

/**
 * Initialize database - call on app startup
 */
export async function initDatabase(): Promise<void> {
  try {
    // Open database
    await db.open()
    console.log('✅ IndexedDB initialized successfully')

    // Check if we have any orbits
    const orbitCount = await db.orbits.count()
    if (orbitCount === 0) {
      console.log('📝 No orbits found, creating default orbit...')
      await createDefaultOrbit()
    }
  } catch (error) {
    console.error('❌ Failed to initialize database:', error)
    throw error
  }
}

/**
 * Create default orbit for first-time users
 */
async function createDefaultOrbit(): Promise<Orbit> {
  const defaultOrbit: Orbit = {
    id: crypto.randomUUID(),
    name: 'Personal',
    createdAt: Date.now(),
    syncProvider: 'local',
    syncConfig: {},
    encryptionEnabled: false,
  }

  await db.orbits.add(defaultOrbit)
  console.log('✅ Default orbit created:', defaultOrbit.id)
  return defaultOrbit
}

/**
 * Clear all data (for testing/reset)
 */
export async function clearDatabase(): Promise<void> {
  await db.delete()
  await db.open()
  console.log('🗑️  Database cleared')
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  const [orbits, notes, links, assets, syncLogs] = await Promise.all([
    db.orbits.count(),
    db.notes.count(),
    db.links.count(),
    db.assets.count(),
    db.syncLogs.count(),
  ])

  return {
    orbits,
    notes,
    links,
    assets,
    syncLogs,
    totalSize: await estimateDatabaseSize(),
  }
}

/**
 * Estimate database size (rough approximation)
 */
async function estimateDatabaseSize(): Promise<number> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    return estimate.usage || 0
  }
  return 0
}

// ====================
// Migration Utilities
// ====================

/**
 * Export all data as JSON (for backup/migration)
 */
export async function exportAllData() {
  const [orbits, notes, links, assets, syncLogs] = await Promise.all([
    db.orbits.toArray(),
    db.notes.toArray(),
    db.links.toArray(),
    db.assets.toArray(),
    db.syncLogs.toArray(),
  ])

  return {
    version: 1,
    exportedAt: Date.now(),
    data: {
      orbits,
      notes,
      links,
      assets,
      syncLogs,
    },
  }
}

/**
 * Import data from JSON backup
 */
export async function importAllData(backup: Awaited<ReturnType<typeof exportAllData>>) {
  // Clear existing data
  await db.transaction('rw', db.orbits, db.notes, db.links, db.assets, db.syncLogs, async () => {
    await Promise.all([
      db.orbits.clear(),
      db.notes.clear(),
      db.links.clear(),
      db.assets.clear(),
      db.syncLogs.clear(),
    ])

    // Import new data
    await Promise.all([
      db.orbits.bulkAdd(backup.data.orbits),
      db.notes.bulkAdd(backup.data.notes),
      db.links.bulkAdd(backup.data.links),
      db.assets.bulkAdd(backup.data.assets),
      db.syncLogs.bulkAdd(backup.data.syncLogs),
    ])
  })

  console.log('✅ Data imported successfully')
}
