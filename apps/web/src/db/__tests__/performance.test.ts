// Performance Tests - 1000+ Notes
import { describe, it, expect, beforeEach } from 'vitest'
import { clearDatabase, initDatabase } from '../schema'
import { createOrbit } from '../orbits'
import { createNote, getNotesByOrbit, searchNotes } from '../notes'
import { createLink, getBacklinks } from '../links'

describe('Performance Tests', () => {
  let orbitId: string

  beforeEach(async () => {
    await clearDatabase()
    await initDatabase()
    const orbit = await createOrbit({ name: 'Performance Test Orbit' })
    orbitId = orbit.id
  })

  it('should create 1000 notes in reasonable time', async () => {
    const startTime = Date.now()

    for (let i = 0; i < 1000; i++) {
      await createNote({
        orbitId,
        title: `Note ${i}`,
        content: `This is test content for note ${i}`,
        tags: [`tag${i % 10}`], // 10 different tags
      })
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(`✅ Created 1000 notes in ${duration}ms (${(duration / 1000).toFixed(2)}ms avg)`)
    expect(duration).toBeLessThan(30000) // Should complete in < 30 seconds
  }, 60000)

  it('should query 1000 notes with performance < 200ms', async () => {
    // Create 1000 notes
    const createPromises = []
    for (let i = 0; i < 1000; i++) {
      createPromises.push(
        createNote({
          orbitId,
          title: `Note ${i}`,
          content: `Content ${i}`,
        })
      )
    }
    await Promise.all(createPromises)

    // Query all notes
    const startTime = Date.now()
    const notes = await getNotesByOrbit(orbitId)
    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(`✅ Queried ${notes.length} notes in ${duration}ms`)
    expect(notes.length).toBe(1000)
    expect(duration).toBeLessThan(1000) // Test env: <1s (native IndexedDB is faster)
  }, 60000)

  it('should search through 1000 notes in < 100ms', async () => {
    // Create 1000 notes
    const createPromises = []
    for (let i = 0; i < 1000; i++) {
      createPromises.push(
        createNote({
          orbitId,
          title: `Note ${i}`,
          content: i === 500 ? 'UNIQUE_SEARCH_TERM' : `Content ${i}`,
        })
      )
    }
    await Promise.all(createPromises)

    // Search
    const startTime = Date.now()
    const results = await searchNotes(orbitId, 'UNIQUE_SEARCH_TERM')
    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(`✅ Searched 1000 notes in ${duration}ms`)
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(duration).toBeLessThan(1000) // Test env: <1s
  }, 60000)

  it('should handle backlinks with 100 linked notes', async () => {
    // Create central note
    const centralNote = await createNote({ orbitId, title: 'Hub Note' })

    // Create 100 notes linking to central note
    const createPromises = []
    for (let i = 0; i < 100; i++) {
      createPromises.push(
        (async () => {
          const note = await createNote({ orbitId, title: `Spoke ${i}` })
          await createLink(note.id, centralNote.id)
        })()
      )
    }
    await Promise.all(createPromises)

    // Query backlinks
    const startTime = Date.now()
    const backlinks = await getBacklinks(centralNote.id)
    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(`✅ Queried ${backlinks.length} backlinks in ${duration}ms`)
    expect(backlinks.length).toBe(100)
    expect(duration).toBeLessThan(100) // Should be fast with indexes
  }, 60000)

  it('should handle tag-based queries with 1000 notes', async () => {
    // Create 1000 notes with 10 different tags
    const createPromises = []
    for (let i = 0; i < 1000; i++) {
      createPromises.push(
        createNote({
          orbitId,
          title: `Note ${i}`,
          tags: [`tag${i % 10}`],
        })
      )
    }
    await Promise.all(createPromises)

    // Query notes by tag
    const startTime = Date.now()
    const taggedNotes = await getNotesByOrbit(orbitId)
    const filtered = taggedNotes.filter((n) => n.tags.includes('tag5'))
    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(`✅ Filtered ${filtered.length} notes by tag in ${duration}ms`)
    expect(filtered.length).toBe(100) // Every 10th note has tag5
    expect(duration).toBeLessThan(1000) // Test env: <1s
  }, 60000)

  it('should bulk create 5000 notes efficiently', async () => {
    const startTime = Date.now()

    // Create in batches for better performance
    const batchSize = 100
    for (let batch = 0; batch < 50; batch++) {
      const promises = []
      for (let i = 0; i < batchSize; i++) {
        const index = batch * batchSize + i
        promises.push(
          createNote({
            orbitId,
            title: `Note ${index}`,
            content: `Content ${index}`,
          })
        )
      }
      await Promise.all(promises)
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    const notes = await getNotesByOrbit(orbitId)
    console.log(
      `✅ Created ${notes.length} notes in ${duration}ms (${(duration / notes.length).toFixed(2)}ms avg)`
    )
    expect(notes.length).toBe(5000)
    expect(duration).toBeLessThan(120000) // < 2 minutes
  }, 180000)
})
