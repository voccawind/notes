// Shared TypeScript types for ORBIT Notes

export type UUID = string

// ====================
// Orbit (Workspace)
// ====================

export type SyncProvider = 'local' | 'webdav' | 's3' | 'drive'

export interface Orbit {
  id: UUID
  name: string
  createdAt: number
  syncProvider: SyncProvider
  syncConfig: Record<string, unknown>
  encryptionEnabled: boolean
  encryptionKey?: string
  lastSyncAt?: number
}

// ====================
// Note
// ====================

export type NoteType = 'note' | 'daily' | 'task'

export interface Note {
  id: UUID
  orbitId: UUID
  title: string
  content: Uint8Array // Serialized Yjs Y.Doc
  contentText: string // Denormalized plaintext for search
  createdAt: number
  modifiedAt: number
  deletedAt?: number
  properties: Record<string, PropertyValue>
  tags: string[]
  linkedNoteIds: UUID[]
  type: NoteType
}

// ====================
// Properties
// ====================

export type PropertyType =
  | 'text'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'multiselect'
  | 'relation'
  | 'url'
  | 'email'

export type PropertyValue =
  | string
  | number
  | boolean
  | string[]
  | { type: PropertyType; value: unknown }

// ====================
// Link
// ====================

export type LinkType = 'link' | 'embed' | 'relation'

export interface Link {
  id: UUID
  sourceNoteId: UUID
  targetNoteId: UUID
  type: LinkType
  createdAt: number
}

// ====================
// Asset
// ====================

export interface Asset {
  id: UUID
  orbitId: UUID
  noteId?: UUID
  filename: string
  mimeType: string
  sizeBytes: number
  storageLocation: string
  uploadedAt: number
  hash: string
}

// ====================
// Sync
// ====================

export type SyncOperation = 'create' | 'update' | 'delete'
export type EntityType = 'note' | 'asset' | 'orbit'

export interface SyncLog {
  id: UUID
  orbitId: UUID
  entityType: EntityType
  entityId: UUID
  operation: SyncOperation
  timestamp: number
  synced: boolean
  conflicted: boolean
}

export interface Conflict {
  id: UUID
  noteId: UUID
  localVersion: Uint8Array
  remoteVersion: Uint8Array
  mergedVersion?: Uint8Array
  resolvedAt?: number
}

// ====================
// Block (Editor)
// ====================

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'list'
  | 'checkbox'
  | 'code'
  | 'embed'
  | 'image'
  | 'divider'

export interface Block {
  id: UUID
  type: BlockType
  content: string
  properties: Record<string, unknown>
}

// ====================
// Collection (Views)
// ====================

export type ViewType = 'table' | 'board' | 'calendar' | 'graph' | 'list'

export interface Collection {
  id: UUID
  orbitId: UUID
  name: string
  viewType: ViewType
  query: CollectionQuery
  template?: UUID // Template note ID for new entries
  createdAt: number
}

export interface CollectionQuery {
  filters: QueryFilter[]
  sort?: QuerySort
  groupBy?: string
}

export interface QueryFilter {
  property: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'startsWith' | 'endsWith'
  value: PropertyValue
}

export interface QuerySort {
  property: string
  direction: 'asc' | 'desc'
}

// ====================
// User (Auth)
// ====================

export interface User {
  id: UUID
  email: string
  passwordHash: string
  createdAt: number
  lastLoginAt?: number
}

export interface AuthToken {
  userId: UUID
  token: string
  refreshToken: string
  expiresAt: number
}

// ====================
// API Types
// ====================

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ApiResponse<T> {
  data?: T
  error?: ApiError
}

// ====================
// Sync Provider Interface
// ====================

export interface SyncProviderConfig {
  type: SyncProvider
  [key: string]: unknown
}

export interface RemoteBlob {
  blobId: string
  timestamp: number
  size: number
}

export interface SyncSession {
  orbitId: UUID
  connected: boolean
  lastSync?: number
}
