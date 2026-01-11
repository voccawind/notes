// Asset CRUD Operations (File Attachments)
import { db } from './schema'
import type { Asset, UUID } from '@orbit/shared-types'
import { hash } from '@orbit/crypto'

// ====================
// Create
// ====================

export interface CreateAssetData {
  orbitId: UUID
  noteId?: UUID
  file: File
  storageLocation?: string
}

export async function createAsset(data: CreateAssetData): Promise<Asset> {
  // Read file data for hashing
  const arrayBuffer = await data.file.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  const hashValue = await hash(uint8Array)
  const hashStr = Array.from(hashValue)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Check if asset with same hash already exists (deduplication)
  const existing = await db.assets.where('hash').equals(hashStr).first()
  if (existing) {
    console.log('♻️  Asset already exists (deduplicated):', existing.id)
    return existing
  }

  const asset: Asset = {
    id: crypto.randomUUID(),
    orbitId: data.orbitId,
    noteId: data.noteId || null,
    filename: data.file.name,
    mimeType: data.file.type,
    sizeBytes: data.file.size,
    storageLocation: data.storageLocation || `local://${crypto.randomUUID()}`,
    uploadedAt: Date.now(),
    hash: hashStr,
  }

  await db.assets.add(asset)
  console.log('✅ Asset created:', asset.id)
  return asset
}

// ====================
// Read
// ====================

export async function getAsset(id: UUID): Promise<Asset | undefined> {
  return db.assets.get(id)
}

export async function getAssetsByNote(noteId: UUID): Promise<Asset[]> {
  return db.assets.where('noteId').equals(noteId).toArray()
}

export async function getAssetsByOrbit(orbitId: UUID): Promise<Asset[]> {
  return db.assets.where('orbitId').equals(orbitId).toArray()
}

export async function getAssetByHash(hash: string): Promise<Asset | undefined> {
  return db.assets.where('hash').equals(hash).first()
}

export async function getAllAssets(): Promise<Asset[]> {
  return db.assets.toArray()
}

// ====================
// Update
// ====================

export async function updateAsset(
  id: UUID,
  updates: Partial<Omit<Asset, 'id' | 'hash' | 'uploadedAt'>>
): Promise<void> {
  await db.assets.update(id, updates)
  console.log('✅ Asset updated:', id)
}

export async function attachAssetToNote(assetId: UUID, noteId: UUID): Promise<void> {
  await updateAsset(assetId, { noteId })
}

export async function detachAssetFromNote(assetId: UUID): Promise<void> {
  await updateAsset(assetId, { noteId: null })
}

// ====================
// Delete
// ====================

export async function deleteAsset(id: UUID): Promise<void> {
  await db.assets.delete(id)
  console.log('🗑️  Asset deleted:', id)
  // Note: Actual file cleanup would happen in storage layer
}

export async function deleteAssetsByNote(noteId: UUID): Promise<void> {
  await db.assets.where('noteId').equals(noteId).delete()
  console.log('🗑️  All assets deleted for note:', noteId)
}

export async function deleteAssetsByOrbit(orbitId: UUID): Promise<void> {
  await db.assets.where('orbitId').equals(orbitId).delete()
  console.log('🗑️  All assets deleted for orbit:', orbitId)
}

// ====================
// Statistics
// ====================

export async function getAssetStatistics(orbitId: UUID) {
  const assets = await getAssetsByOrbit(orbitId)

  const totalSize = assets.reduce((sum, asset) => sum + asset.sizeBytes, 0)
  const byMimeType = assets.reduce(
    (acc, asset) => {
      const type = asset.mimeType.split('/')[0] || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return {
    totalAssets: assets.length,
    totalSizeBytes: totalSize,
    totalSizeMB: Math.round(totalSize / 1024 / 1024),
    byMimeType,
    withoutNote: assets.filter((a) => !a.noteId).length,
  }
}

export async function getStorageUsage(): Promise<number> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    return estimate.usage || 0
  }
  return 0
}

export async function getStorageQuota(): Promise<number> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    return estimate.quota || 0
  }
  return 0
}

// ====================
// Utilities
// ====================

export async function assetExists(id: UUID): Promise<boolean> {
  const count = await db.assets.where('id').equals(id).count()
  return count > 0
}

export async function countAssets(orbitId: UUID): Promise<number> {
  return db.assets.where('orbitId').equals(orbitId).count()
}

/**
 * Find duplicate assets by hash
 */
export async function findDuplicateAssets(): Promise<Map<string, Asset[]>> {
  const allAssets = await db.assets.toArray()
  const byHash = new Map<string, Asset[]>()

  for (const asset of allAssets) {
    const existing = byHash.get(asset.hash) || []
    existing.push(asset)
    byHash.set(asset.hash, existing)
  }

  // Filter only duplicates (more than 1)
  const duplicates = new Map<string, Asset[]>()
  for (const [hash, assets] of byHash) {
    if (assets.length > 1) {
      duplicates.set(hash, assets)
    }
  }

  return duplicates
}

/**
 * Clean up unused assets (not attached to any note)
 */
export async function cleanupUnusedAssets(orbitId: UUID): Promise<number> {
  const unused = await db.assets
    .where('orbitId')
    .equals(orbitId)
    .and((asset) => asset.noteId === null)
    .toArray()

  for (const asset of unused) {
    await deleteAsset(asset.id)
  }

  console.log(`🧹 Cleaned up ${unused.length} unused assets`)
  return unused.length
}
