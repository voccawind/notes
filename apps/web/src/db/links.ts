// Link CRUD Operations (Backlinks, Graph)
import { db } from './schema'
import type { Link, UUID, Note } from '@orbit/shared-types'

// ====================
// Create
// ====================

export async function createLink(
  sourceNoteId: UUID,
  targetNoteId: UUID,
  type: 'link' | 'embed' | 'relation' = 'link'
): Promise<Link> {
  // Check if link already exists
  const existing = await db.links
    .where('[sourceNoteId+targetNoteId]')
    .equals([sourceNoteId, targetNoteId])
    .first()

  if (existing) {
    console.log('⚠️  Link already exists:', existing.id)
    return existing
  }

  const link: Link = {
    id: crypto.randomUUID(),
    sourceNoteId,
    targetNoteId,
    type,
    createdAt: Date.now(),
  }

  await db.links.add(link)

  // Update source note's linkedNoteIds
  const sourceNote = await db.notes.get(sourceNoteId)
  if (sourceNote) {
    const linkedNoteIds = [...sourceNote.linkedNoteIds, targetNoteId]
    await db.notes.update(sourceNoteId, { linkedNoteIds })
  }

  console.log('✅ Link created:', link.id)
  return link
}

export async function createBidirectionalLink(noteId1: UUID, noteId2: UUID): Promise<void> {
  await Promise.all([createLink(noteId1, noteId2), createLink(noteId2, noteId1)])
}

// ====================
// Read
// ====================

export async function getLink(id: UUID): Promise<Link | undefined> {
  return db.links.get(id)
}

/**
 * Get all outbound links from a note
 */
export async function getOutboundLinks(noteId: UUID): Promise<Link[]> {
  return db.links.where('sourceNoteId').equals(noteId).toArray()
}

/**
 * Get all backlinks to a note
 */
export async function getBacklinks(noteId: UUID): Promise<Link[]> {
  return db.links.where('targetNoteId').equals(noteId).toArray()
}

/**
 * Get notes that link to this note (backlink notes)
 */
export async function getBacklinkNotes(noteId: UUID): Promise<Note[]> {
  const backlinks = await getBacklinks(noteId)
  const sourceIds = backlinks.map((link) => link.sourceNoteId)

  if (sourceIds.length === 0) return []

  const notes = await db.notes.bulkGet(sourceIds)
  return notes.filter((note): note is Note => note !== undefined && !note.deletedAt)
}

/**
 * Get notes that this note links to (outbound linked notes)
 */
export async function getLinkedNotes(noteId: UUID): Promise<Note[]> {
  const outbound = await getOutboundLinks(noteId)
  const targetIds = outbound.map((link) => link.targetNoteId)

  if (targetIds.length === 0) return []

  const notes = await db.notes.bulkGet(targetIds)
  return notes.filter((note): note is Note => note !== undefined && !note.deletedAt)
}

/**
 * Get all links in both directions for a note
 */
export async function getAllLinksForNote(noteId: UUID): Promise<{
  outbound: Link[]
  inbound: Link[]
}> {
  const [outbound, inbound] = await Promise.all([
    getOutboundLinks(noteId),
    getBacklinks(noteId),
  ])

  return { outbound, inbound }
}

/**
 * Check if two notes are linked (in either direction)
 */
export async function areNotesLinked(noteId1: UUID, noteId2: UUID): Promise<boolean> {
  const link = await db.links
    .where('[sourceNoteId+targetNoteId]')
    .equals([noteId1, noteId2])
    .or('[sourceNoteId+targetNoteId]')
    .equals([noteId2, noteId1])
    .first()

  return link !== undefined
}

// ====================
// Update
// ====================

export async function updateLinkType(id: UUID, type: 'link' | 'embed' | 'relation'): Promise<void> {
  await db.links.update(id, { type })
}

// ====================
// Delete
// ====================

export async function deleteLink(id: UUID): Promise<void> {
  const link = await db.links.get(id)
  if (!link) return

  await db.links.delete(id)

  // Update source note's linkedNoteIds
  const sourceNote = await db.notes.get(link.sourceNoteId)
  if (sourceNote) {
    const linkedNoteIds = sourceNote.linkedNoteIds.filter((nid) => nid !== link.targetNoteId)
    await db.notes.update(link.sourceNoteId, { linkedNoteIds })
  }

  console.log('🗑️  Link deleted:', id)
}

export async function deleteLinkBetween(sourceId: UUID, targetId: UUID): Promise<void> {
  const link = await db.links
    .where('[sourceNoteId+targetNoteId]')
    .equals([sourceId, targetId])
    .first()

  if (link) {
    await deleteLink(link.id)
  }
}

export async function deleteAllLinksForNote(noteId: UUID): Promise<void> {
  await db.links.where('sourceNoteId').equals(noteId).or('targetNoteId').equals(noteId).delete()
  console.log('🗑️  All links deleted for note:', noteId)
}

// ====================
// Graph Utilities
// ====================

export interface GraphNode {
  id: UUID
  title: string
  type: 'note' | 'daily' | 'task'
  linkCount: number
}

export interface GraphEdge {
  source: UUID
  target: UUID
  type: 'link' | 'embed' | 'relation'
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/**
 * Get graph data for visualization (1-hop neighborhood)
 */
export async function getGraphDataForNote(noteId: UUID): Promise<GraphData> {
  const centerNote = await db.notes.get(noteId)
  if (!centerNote) {
    return { nodes: [], edges: [] }
  }

  // Get all connected notes (1-hop)
  const { outbound, inbound } = await getAllLinksForNote(noteId)
  const connectedIds = new Set([
    noteId,
    ...outbound.map((l) => l.targetNoteId),
    ...inbound.map((l) => l.sourceNoteId),
  ])

  // Fetch all notes
  const notes = await db.notes.bulkGet(Array.from(connectedIds))
  const validNotes = notes.filter((n): n is Note => n !== undefined && !n.deletedAt)

  // Build nodes
  const nodes: GraphNode[] = await Promise.all(
    validNotes.map(async (note) => {
      const links = await getAllLinksForNote(note.id)
      return {
        id: note.id,
        title: note.title,
        type: note.type,
        linkCount: links.outbound.length + links.inbound.length,
      }
    })
  )

  // Build edges (only between visible nodes)
  const nodeIds = new Set(nodes.map((n) => n.id))
  const edges: GraphEdge[] = [...outbound, ...inbound]
    .filter((link) => nodeIds.has(link.sourceNoteId) && nodeIds.has(link.targetNoteId))
    .map((link) => ({
      source: link.sourceNoteId,
      target: link.targetNoteId,
      type: link.type,
    }))

  return { nodes, edges }
}

/**
 * Get full graph data for entire orbit
 */
export async function getFullGraphData(orbitId: UUID): Promise<GraphData> {
  const notes = await db.notes.where('orbitId').equals(orbitId).and((n) => !n.deletedAt).toArray()

  const nodes: GraphNode[] = await Promise.all(
    notes.map(async (note) => {
      const links = await getAllLinksForNote(note.id)
      return {
        id: note.id,
        title: note.title,
        type: note.type,
        linkCount: links.outbound.length + links.inbound.length,
      }
    })
  )

  const noteIds = new Set(notes.map((n) => n.id))
  const allLinks = await db.links
    .where('sourceNoteId')
    .anyOf(Array.from(noteIds))
    .or('targetNoteId')
    .anyOf(Array.from(noteIds))
    .toArray()

  const edges: GraphEdge[] = allLinks
    .filter((link) => noteIds.has(link.sourceNoteId) && noteIds.has(link.targetNoteId))
    .map((link) => ({
      source: link.sourceNoteId,
      target: link.targetNoteId,
      type: link.type,
    }))

  return { nodes, edges }
}

/**
 * Find orphan notes (notes with no links)
 */
export async function getOrphanNotes(orbitId: UUID): Promise<Note[]> {
  const notes = await db.notes.where('orbitId').equals(orbitId).and((n) => !n.deletedAt).toArray()

  const orphans: Note[] = []
  for (const note of notes) {
    const { outbound, inbound } = await getAllLinksForNote(note.id)
    if (outbound.length === 0 && inbound.length === 0) {
      orphans.push(note)
    }
  }

  return orphans
}

/**
 * Find most connected notes (by link count)
 */
export async function getMostConnectedNotes(orbitId: UUID, limit = 10): Promise<GraphNode[]> {
  const graph = await getFullGraphData(orbitId)
  return graph.nodes.sort((a, b) => b.linkCount - a.linkCount).slice(0, limit)
}

/**
 * Get shortest path between two notes (breadth-first search)
 */
export async function getShortestPath(fromId: UUID, toId: UUID): Promise<UUID[] | null> {
  if (fromId === toId) return [fromId]

  const visited = new Set<UUID>()
  const queue: { nodeId: UUID; path: UUID[] }[] = [{ nodeId: fromId, path: [fromId] }]

  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!

    if (visited.has(nodeId)) continue
    visited.add(nodeId)

    const outbound = await getOutboundLinks(nodeId)
    for (const link of outbound) {
      if (link.targetNoteId === toId) {
        return [...path, toId]
      }

      if (!visited.has(link.targetNoteId)) {
        queue.push({
          nodeId: link.targetNoteId,
          path: [...path, link.targetNoteId],
        })
      }
    }
  }

  return null // No path found
}

// ====================
// Statistics
// ====================

export async function getLinkStatistics(orbitId: UUID) {
  const notes = await db.notes.where('orbitId').equals(orbitId).and((n) => !n.deletedAt).toArray()
  const noteIds = notes.map((n) => n.id)

  const allLinks = await db.links
    .where('sourceNoteId')
    .anyOf(noteIds)
    .or('targetNoteId')
    .anyOf(noteIds)
    .toArray()

  const linksByType = {
    link: allLinks.filter((l) => l.type === 'link').length,
    embed: allLinks.filter((l) => l.type === 'embed').length,
    relation: allLinks.filter((l) => l.type === 'relation').length,
  }

  const orphanCount = (await getOrphanNotes(orbitId)).length

  return {
    totalNotes: notes.length,
    totalLinks: allLinks.length,
    linksByType,
    orphanNotes: orphanCount,
    avgLinksPerNote: notes.length > 0 ? allLinks.length / notes.length : 0,
  }
}
