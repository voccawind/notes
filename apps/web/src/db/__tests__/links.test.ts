// Link and Graph Tests
import { describe, it, expect, beforeEach } from 'vitest'
import { clearDatabase, initDatabase } from '../schema'
import { createOrbit } from '../orbits'
import { createNote } from '../notes'
import {
  createLink,
  createBidirectionalLink,
  getOutboundLinks,
  getBacklinks,
  getBacklinkNotes,
  getLinkedNotes,
  getAllLinksForNote,
  areNotesLinked,
  deleteLink,
  deleteLinkBetween,
  getGraphDataForNote,
  getFullGraphData,
  getOrphanNotes,
  getMostConnectedNotes,
  getShortestPath,
  getLinkStatistics,
} from '../links'

describe('Link and Graph Operations', () => {
  let orbitId: string
  let note1Id: string
  let note2Id: string
  let note3Id: string

  beforeEach(async () => {
    await clearDatabase()
    await initDatabase()
    const orbit = await createOrbit({ name: 'Test Orbit' })
    orbitId = orbit.id

    const n1 = await createNote({ orbitId, title: 'Note 1' })
    const n2 = await createNote({ orbitId, title: 'Note 2' })
    const n3 = await createNote({ orbitId, title: 'Note 3' })
    note1Id = n1.id
    note2Id = n2.id
    note3Id = n3.id
  })

  describe('Create Links', () => {
    it('should create a link between two notes', async () => {
      const link = await createLink(note1Id, note2Id)

      expect(link.id).toBeDefined()
      expect(link.sourceNoteId).toBe(note1Id)
      expect(link.targetNoteId).toBe(note2Id)
      expect(link.type).toBe('link')
    })

    it('should not create duplicate links', async () => {
      const link1 = await createLink(note1Id, note2Id)
      const link2 = await createLink(note1Id, note2Id)

      expect(link1.id).toBe(link2.id)
    })

    it('should create bidirectional link', async () => {
      await createBidirectionalLink(note1Id, note2Id)

      const outbound = await getOutboundLinks(note1Id)
      const backlinks = await getBacklinks(note1Id)

      expect(outbound.length).toBe(1)
      expect(backlinks.length).toBe(1)
    })

    it('should create embed type link', async () => {
      const link = await createLink(note1Id, note2Id, 'embed')
      expect(link.type).toBe('embed')
    })
  })

  describe('Read Links', () => {
    beforeEach(async () => {
      await createLink(note1Id, note2Id)
      await createLink(note2Id, note3Id)
      await createLink(note3Id, note1Id)
    })

    it('should get outbound links', async () => {
      const outbound = await getOutboundLinks(note1Id)
      expect(outbound.length).toBe(1)
      expect(outbound[0].targetNoteId).toBe(note2Id)
    })

    it('should get backlinks', async () => {
      const backlinks = await getBacklinks(note2Id)
      expect(backlinks.length).toBe(1)
      expect(backlinks[0].sourceNoteId).toBe(note1Id)
    })

    it('should get backlink notes', async () => {
      const backlinkNotes = await getBacklinkNotes(note2Id)
      expect(backlinkNotes.length).toBe(1)
      expect(backlinkNotes[0].id).toBe(note1Id)
    })

    it('should get linked notes', async () => {
      const linkedNotes = await getLinkedNotes(note1Id)
      expect(linkedNotes.length).toBe(1)
      expect(linkedNotes[0].id).toBe(note2Id)
    })

    it('should get all links for note', async () => {
      const links = await getAllLinksForNote(note2Id)
      expect(links.outbound.length).toBe(1)
      expect(links.inbound.length).toBe(1)
    })

    it('should check if notes are linked', async () => {
      expect(await areNotesLinked(note1Id, note2Id)).toBe(true)
      expect(await areNotesLinked(note1Id, note3Id)).toBe(true) // via backlink
      expect(await areNotesLinked(note2Id, note1Id)).toBe(true) // bidirectional check
    })
  })

  describe('Delete Links', () => {
    it('should delete link', async () => {
      const link = await createLink(note1Id, note2Id)
      await deleteLink(link.id)

      const outbound = await getOutboundLinks(note1Id)
      expect(outbound.length).toBe(0)
    })

    it('should delete link between notes', async () => {
      await createLink(note1Id, note2Id)
      await deleteLinkBetween(note1Id, note2Id)

      const linked = await areNotesLinked(note1Id, note2Id)
      expect(linked).toBe(false)
    })
  })

  describe('Graph Data', () => {
    beforeEach(async () => {
      // Create a graph: 1 -> 2 -> 3
      //                  1 -> 3
      await createLink(note1Id, note2Id)
      await createLink(note2Id, note3Id)
      await createLink(note1Id, note3Id)
    })

    it('should get graph data for note (1-hop)', async () => {
      const graph = await getGraphDataForNote(note1Id)

      expect(graph.nodes.length).toBe(3)
      expect(graph.edges.length).toBe(2)
      expect(graph.nodes.find((n) => n.id === note1Id)).toBeDefined()
    })

    it('should get full graph data for orbit', async () => {
      const graph = await getFullGraphData(orbitId)

      expect(graph.nodes.length).toBe(3)
      expect(graph.edges.length).toBe(3)
    })

    it('should find orphan notes', async () => {
      const orphan = await createNote({ orbitId, title: 'Orphan' })
      const orphans = await getOrphanNotes(orbitId)

      expect(orphans.find((n) => n.id === orphan.id)).toBeDefined()
      expect(orphans.find((n) => n.id === note1Id)).toBeUndefined()
    })

    it('should find most connected notes', async () => {
      const mostConnected = await getMostConnectedNotes(orbitId)

      expect(mostConnected.length).toBeGreaterThan(0)
      expect(mostConnected[0].linkCount).toBeGreaterThanOrEqual(mostConnected[1]?.linkCount || 0)
    })
  })

  describe('Shortest Path', () => {
    beforeEach(async () => {
      // Create a chain: 1 -> 2 -> 3
      await createLink(note1Id, note2Id)
      await createLink(note2Id, note3Id)
    })

    it('should find shortest path between connected notes', async () => {
      const path = await getShortestPath(note1Id, note3Id)

      expect(path).toBeDefined()
      expect(path?.length).toBe(3)
      expect(path?.[0]).toBe(note1Id)
      expect(path?.[2]).toBe(note3Id)
    })

    it('should return null for disconnected notes', async () => {
      const orphan = await createNote({ orbitId, title: 'Orphan' })
      const path = await getShortestPath(note1Id, orphan.id)

      expect(path).toBeNull()
    })

    it('should return single node for same note', async () => {
      const path = await getShortestPath(note1Id, note1Id)
      expect(path).toEqual([note1Id])
    })
  })

  describe('Statistics', () => {
    beforeEach(async () => {
      await createLink(note1Id, note2Id, 'link')
      await createLink(note2Id, note3Id, 'embed')
      await createNote({ orbitId, title: 'Orphan' })
    })

    it('should get link statistics', async () => {
      const stats = await getLinkStatistics(orbitId)

      expect(stats.totalNotes).toBe(4)
      expect(stats.totalLinks).toBe(2)
      expect(stats.linksByType.link).toBe(1)
      expect(stats.linksByType.embed).toBe(1)
      expect(stats.orphanNotes).toBe(1)
      expect(stats.avgLinksPerNote).toBeGreaterThan(0)
    })
  })
})
