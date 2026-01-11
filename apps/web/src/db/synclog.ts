// SyncLog Operations (Audit Trail for Sync)
import { db } from './schema'
import type { SyncLog, UUID } from '@orbit/shared-types'

// ====================
// Create
// ====================

export interface CreateSyncLogData {
  orbitId: UUID
  entityType: 'note' | 'asset' | 'orbit'
  entityId: UUID
  operation: 'create' | 'update' | 'delete'
}

export async function createSyncLog(data: CreateSyncLogData): Promise<SyncLog> {
  const log: SyncLog = {
    id: crypto.randomUUID(),
    orbitId: data.orbitId,
    entityType: data.entityType,
    entityId: data.entityId,
    operation: data.operation,
    timestamp: Date.now(), // Using simple timestamp for MVP, HLC in V1
    synced: false,
    conflicted: false,
  }

  await db.syncLogs.add(log)
  return log
}

// ====================
// Read
// ====================

export async function getSyncLog(id: UUID): Promise<SyncLog | undefined> {
  return db.syncLogs.get(id)
}

export async function getSyncLogsByOrbit(orbitId: UUID, limit = 100): Promise<SyncLog[]> {
  return db.syncLogs
    .where('orbitId')
    .equals(orbitId)
    .reverse()
    .sortBy('timestamp')
    .then((logs) => logs.slice(0, limit))
}

export async function getSyncLogsByEntity(entityId: UUID): Promise<SyncLog[]> {
  return db.syncLogs.where('entityId').equals(entityId).sortBy('timestamp')
}

export async function getUnsyncedLogs(orbitId: UUID): Promise<SyncLog[]> {
  return db.syncLogs
    .where('orbitId')
    .equals(orbitId)
    .and((log) => !log.synced)
    .sortBy('timestamp')
}

export async function getConflictedLogs(orbitId: UUID): Promise<SyncLog[]> {
  return db.syncLogs
    .where('orbitId')
    .equals(orbitId)
    .and((log) => log.conflicted)
    .sortBy('timestamp')
}

export async function getRecentSyncActivity(orbitId: UUID, limit = 20): Promise<SyncLog[]> {
  return db.syncLogs
    .where('orbitId')
    .equals(orbitId)
    .reverse()
    .sortBy('timestamp')
    .then((logs) => logs.slice(0, limit))
}

// ====================
// Update
// ====================

export async function markLogAsSynced(id: UUID): Promise<void> {
  await db.syncLogs.update(id, { synced: true })
}

export async function markLogAsConflicted(id: UUID): Promise<void> {
  await db.syncLogs.update(id, { conflicted: true })
}

export async function markLogAsResolved(id: UUID): Promise<void> {
  await db.syncLogs.update(id, { conflicted: false })
}

export async function markMultipleLogsAsSynced(ids: UUID[]): Promise<void> {
  await Promise.all(ids.map((id) => markLogAsSynced(id)))
}

// ====================
// Delete
// ====================

export async function deleteSyncLog(id: UUID): Promise<void> {
  await db.syncLogs.delete(id)
}

export async function deleteOldSyncLogs(orbitId: UUID, olderThanMs: number): Promise<number> {
  const cutoff = Date.now() - olderThanMs
  const oldLogs = await db.syncLogs
    .where('orbitId')
    .equals(orbitId)
    .and((log) => log.timestamp < cutoff && log.synced && !log.conflicted)
    .toArray()

  for (const log of oldLogs) {
    await deleteSyncLog(log.id)
  }

  console.log(`🧹 Deleted ${oldLogs.length} old sync logs`)
  return oldLogs.length
}

/**
 * Clear all sync logs for an orbit (use with caution!)
 */
export async function clearSyncLogs(orbitId: UUID): Promise<void> {
  await db.syncLogs.where('orbitId').equals(orbitId).delete()
  console.log('🗑️  Sync logs cleared for orbit:', orbitId)
}

// ====================
// Statistics
// ====================

export async function getSyncStatistics(orbitId: UUID) {
  const logs = await db.syncLogs.where('orbitId').equals(orbitId).toArray()

  const byOperation = {
    create: logs.filter((l) => l.operation === 'create').length,
    update: logs.filter((l) => l.operation === 'update').length,
    delete: logs.filter((l) => l.operation === 'delete').length,
  }

  const byEntityType = {
    note: logs.filter((l) => l.entityType === 'note').length,
    asset: logs.filter((l) => l.entityType === 'asset').length,
    orbit: logs.filter((l) => l.entityType === 'orbit').length,
  }

  const synced = logs.filter((l) => l.synced).length
  const unsynced = logs.filter((l) => !l.synced).length
  const conflicted = logs.filter((l) => l.conflicted).length

  return {
    total: logs.length,
    byOperation,
    byEntityType,
    synced,
    unsynced,
    conflicted,
    syncPercentage: logs.length > 0 ? Math.round((synced / logs.length) * 100) : 100,
  }
}

// ====================
// Utilities
// ====================

export async function getLastSyncTime(orbitId: UUID): Promise<number | null> {
  const lastSynced = await db.syncLogs
    .where('orbitId')
    .equals(orbitId)
    .and((log) => log.synced)
    .reverse()
    .sortBy('timestamp')
    .then((logs) => logs[0])

  return lastSynced ? lastSynced.timestamp : null
}

export async function hasUnsyncedChanges(orbitId: UUID): Promise<boolean> {
  const count = await db.syncLogs
    .where('orbitId')
    .equals(orbitId)
    .and((log) => !log.synced)
    .count()

  return count > 0
}

export async function hasConflicts(orbitId: UUID): Promise<boolean> {
  const count = await db.syncLogs
    .where('orbitId')
    .equals(orbitId)
    .and((log) => log.conflicted)
    .count()

  return count > 0
}

export async function getConflictCount(orbitId: UUID): Promise<number> {
  return db.syncLogs
    .where('orbitId')
    .equals(orbitId)
    .and((log) => log.conflicted)
    .count()
}

/**
 * Get sync queue (unsynced logs ordered by timestamp)
 */
export async function getSyncQueue(orbitId: UUID): Promise<SyncLog[]> {
  return db.syncLogs
    .where('orbitId')
    .equals(orbitId)
    .and((log) => !log.synced && !log.conflicted)
    .sortBy('timestamp')
}

/**
 * Create automatic sync log when entity changes
 * This should be called by CRUD operations
 */
export async function logEntityChange(
  orbitId: UUID,
  entityType: 'note' | 'asset' | 'orbit',
  entityId: UUID,
  operation: 'create' | 'update' | 'delete'
): Promise<void> {
  await createSyncLog({
    orbitId,
    entityType,
    entityId,
    operation,
  })
}
