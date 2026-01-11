// Orbit CRUD Tests
import { describe, it, expect, beforeEach } from 'vitest'
import { clearDatabase, initDatabase } from '../schema'
import {
  createOrbit,
  getOrbit,
  getAllOrbits,
  updateOrbit,
  deleteOrbit,
  getOrbitWithStats,
  enableOrbitEncryption,
  disableOrbitEncryption,
  setOrbitSyncProvider,
  duplicateOrbit,
  countOrbits,
  orbitExists,
} from '../orbits'
import { createNote } from '../notes'

describe('Orbit CRUD Operations', () => {
  beforeEach(async () => {
    await clearDatabase()
    await initDatabase()
  })

  describe('Create', () => {
    it('should create a new orbit', async () => {
      const orbit = await createOrbit({
        name: 'Test Orbit',
        syncProvider: 'local',
      })

      expect(orbit.id).toBeDefined()
      expect(orbit.name).toBe('Test Orbit')
      expect(orbit.syncProvider).toBe('local')
      expect(orbit.encryptionEnabled).toBe(false)
      expect(orbit.createdAt).toBeGreaterThan(0)
    })

    it('should create orbit with encryption enabled', async () => {
      const orbit = await createOrbit({
        name: 'Encrypted Orbit',
        encryptionEnabled: true,
      })

      expect(orbit.encryptionEnabled).toBe(true)
    })

    it('should create orbit with sync config', async () => {
      const config = { url: 'https://webdav.example.com', username: 'user' }
      const orbit = await createOrbit({
        name: 'Synced Orbit',
        syncProvider: 'webdav',
        syncConfig: config,
      })

      expect(orbit.syncProvider).toBe('webdav')
      expect(orbit.syncConfig).toEqual(config)
    })
  })

  describe('Read', () => {
    it('should get orbit by id', async () => {
      const created = await createOrbit({ name: 'Test' })
      const fetched = await getOrbit(created.id)

      expect(fetched).toBeDefined()
      expect(fetched?.id).toBe(created.id)
      expect(fetched?.name).toBe('Test')
    })

    it('should return undefined for non-existent orbit', async () => {
      const fetched = await getOrbit('non-existent-id')
      expect(fetched).toBeUndefined()
    })

    it('should get all orbits', async () => {
      await createOrbit({ name: 'Orbit 1' })
      await createOrbit({ name: 'Orbit 2' })
      await createOrbit({ name: 'Orbit 3' })

      const orbits = await getAllOrbits()
      expect(orbits.length).toBeGreaterThanOrEqual(3)
    })

    it('should get orbit with stats', async () => {
      const orbit = await createOrbit({ name: 'Test' })
      await createNote({ orbitId: orbit.id, title: 'Note 1' })
      await createNote({ orbitId: orbit.id, title: 'Note 2' })

      const withStats = await getOrbitWithStats(orbit.id)
      expect(withStats?.noteCount).toBe(2)
      expect(withStats?.lastModified).toBeGreaterThan(0)
    })

    it('should return undefined for non-existent orbit stats', async () => {
      const stats = await getOrbitWithStats('non-existent')
      expect(stats).toBeUndefined()
    })
  })

  describe('Update', () => {
    it('should update orbit name', async () => {
      const orbit = await createOrbit({ name: 'Old Name' })
      await updateOrbit(orbit.id, { name: 'New Name' })

      const updated = await getOrbit(orbit.id)
      expect(updated?.name).toBe('New Name')
    })

    it('should throw error when updating non-existent orbit', async () => {
      await expect(updateOrbit('non-existent', { name: 'Test' })).rejects.toThrow()
    })

    it('should enable encryption', async () => {
      const orbit = await createOrbit({ name: 'Test' })
      await enableOrbitEncryption(orbit.id, 'secret-key')

      const updated = await getOrbit(orbit.id)
      expect(updated?.encryptionEnabled).toBe(true)
      expect(updated?.encryptionKey).toBe('secret-key')
    })

    it('should disable encryption', async () => {
      const orbit = await createOrbit({ name: 'Test', encryptionEnabled: true })
      await disableOrbitEncryption(orbit.id)

      const updated = await getOrbit(orbit.id)
      expect(updated?.encryptionEnabled).toBe(false)
      expect(updated?.encryptionKey).toBeUndefined()
    })

    it('should set sync provider', async () => {
      const orbit = await createOrbit({ name: 'Test' })
      const config = { url: 'https://example.com' }
      await setOrbitSyncProvider(orbit.id, 'webdav', config)

      const updated = await getOrbit(orbit.id)
      expect(updated?.syncProvider).toBe('webdav')
      expect(updated?.syncConfig).toEqual(config)
    })
  })

  describe('Delete', () => {
    it('should delete orbit', async () => {
      const orbit = await createOrbit({ name: 'To Delete' })
      await deleteOrbit(orbit.id)

      const fetched = await getOrbit(orbit.id)
      expect(fetched).toBeUndefined()
    })

    it('should delete orbit with notes', async () => {
      const orbit = await createOrbit({ name: 'Test' })
      await createNote({ orbitId: orbit.id, title: 'Note 1' })
      await createNote({ orbitId: orbit.id, title: 'Note 2' })

      await deleteOrbit(orbit.id)

      const fetched = await getOrbit(orbit.id)
      expect(fetched).toBeUndefined()
    })
  })

  describe('Utilities', () => {
    it('should check if orbit exists', async () => {
      const orbit = await createOrbit({ name: 'Test' })
      expect(await orbitExists(orbit.id)).toBe(true)
      expect(await orbitExists('non-existent')).toBe(false)
    })

    it('should count orbits', async () => {
      const initialCount = await countOrbits()
      await createOrbit({ name: 'Test 1' })
      await createOrbit({ name: 'Test 2' })

      const finalCount = await countOrbits()
      expect(finalCount).toBe(initialCount + 2)
    })

    it('should duplicate orbit', async () => {
      const source = await createOrbit({ name: 'Source' })
      await createNote({ orbitId: source.id, title: 'Note 1' })
      await createNote({ orbitId: source.id, title: 'Note 2' })

      const duplicate = await duplicateOrbit(source.id, 'Duplicate')

      expect(duplicate.name).toBe('Duplicate')
      expect(duplicate.id).not.toBe(source.id)

      const duplicateStats = await getOrbitWithStats(duplicate.id)
      expect(duplicateStats?.noteCount).toBe(2)
    })
  })
})
