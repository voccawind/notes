# ORBIT Notes — Software-Architektur & Produkt-Spec
**Version:** 1.0 (Initial Architecture)
**Datum:** 2026-01-11
**Status:** Architecture Blueprint

---

## A) PRODUKT-PRINZIPIEN

1. **Local-first ist nicht negotiable** — Alle Funktionen müssen vollständig offline funktionieren; Sync ist Transport, nicht Source of Truth.

2. **User owns the data, literally** — Vollständige Datenportabilität (Markdown Export), Selfhosting als primäres Deployment-Modell, keine Vendor Lock-ins.

3. **Keyboard-first, touch-friendly** — Jede Aktion muss über Tastatur UND touch/mouse erreichbar sein; Command Palette ist Hauptnavigation.

4. **Performance ist Feature** — <100ms UI-Reaktionszeit für Suche, Navigation, Öffnen von Notizen; Lazy Loading für große Datenmengen.

5. **Information finds you, not vice versa** — Kontextuelles Auffinden (Backlinks, Related, Mentions) wichtiger als manuelles Organisieren.

6. **Progressive Complexity** — Grundfunktionen (Quick Capture, Markdown Notes) sofort nutzbar ohne Setup; Advanced Features (DB Views, Relations) opt-in.

7. **No broken windows** — Sync-Konflikte werden transparent angezeigt und auflösbar gemacht, keine stillen Datenverluste.

8. **Modular Sync Architecture** — Sync-Provider sind austauschbare Adapter; User kann zwischen Local/WebDAV/S3 wechseln ohne Datenverlust.

9. **Security by Design** — E2EE ist optional aber architected-in von Anfang; keine nachträglichen Sicherheits-Patches.

10. **Mobile is not an afterthought** — Responsive UI von Tag 1; Touch-Gesten für häufige Aktionen (swipe to complete task, long-press for context menu).

11. **API-first Backend** — Alle Backend-Funktionen über klare REST/GraphQL API; ermöglicht alternative Clients und Integrationen.

12. **Fail gracefully** — Bei Netzwerkfehlern/Sync-Konflikten bleibt App benutzbar; Offline Queue mit visueller Feedback.

---

## B) INFORMATIONSARCHITEKTUR

### Kernentitäten (Hierarchie)

```
Orbit (Workspace)
├── Collections (optional DB-like containers)
├── Notes
│   ├── Blocks (content units)
│   ├── Properties (structured metadata)
│   ├── Relations (links to other notes)
│   └── Tasks (extracted or standalone)
├── Tags (namespaced, hierarchical)
├── Attachments (files, images)
└── Views (saved queries/filters)
```

### Orbit (Workspace)

**Konzept:** Ein "Orbit" ist ein abgeschlossener Kontext (Projekt, Themenbereich, privat/beruflich). Jeder Orbit hat:
- Eigene Sync-Config (Local / WebDAV / S3)
- Eigene E2EE Einstellungen
- Eigene Farbcodierung/Icon
- Eigenes Datenbank-Schema (IndexedDB namespace)

**Use Cases:**
- Orbit "Personal" (lokal only, keine Sync)
- Orbit "Work Project Alpha" (synced via Company WebDAV, E2EE)
- Orbit "Research" (synced via self-hosted S3)

**ANNAHME:** User haben typisch 2-5 Orbits, nicht hunderte.

### Notiztypen (logisch, nicht technisch unterschiedlich)

Alle Notizen sind **Blocks-basiert**, aber logische Typen:

| Typ | Beschreibung | Default Properties |
|-----|--------------|-------------------|
| **Quick Note** | Inbox Capture, unstrukturiert | `created`, `tags` |
| **Document** | Längere strukturierte Notiz | `created`, `updated`, `tags`, `cover` |
| **Database Entry** | Teil einer Collection | Custom Properties je nach Collection |
| **Task** | Standalone Task (nicht nur in-note checkbox) | `status`, `due`, `priority`, `tags` |
| **Canvas Node** | Visuelle Notiz auf Canvas | `position`, `size`, `color` |

**Wichtig:** Jede Notiz kann zu jedem Typ werden durch Properties; keine harten Grenzen.

### Views (gespeicherte Queries)

Views sind **keine eigenen Daten**, sondern Abfragen + Darstellungsformat:

- **List View** — Tabellarisch mit konfigurierbaren Spalten
- **Board View** — Kanban-Style (grouped by property)
- **Graph View** — Link-Visualisierung (Subgraph eines Filters)
- **Calendar View** — Notes mit Date-Properties
- **Gallery View** — Cover-Image-Fokus

Views sind **pro Orbit** gespeichert, können auf Collections oder Globalfilter angewandt werden.

### Tags vs. Properties

**Tags:**
- Lightweight, schnell hinzufügbar (`#projekt/alpha`)
- Hierarchisch (Slash-separated)
- Hauptsächlich für Browsing/Filtering

**Properties:**
- Strukturierte Metadaten (Typ: Text, Number, Date, Select, Multi-Select, Relation)
- Für DB-Views und komplexe Queries
- Können Default-Values haben

**Entscheidung:** Tags sind syntactic sugar für ein spezielles Property `tags: string[]`. Das vereinfacht das Datenmodell.

### Relations (Links)

Drei Typen:

1. **Wikilinks** — `[[Note Title]]` in Text (bidirektional, automatische Backlinks)
2. **Block References** — `[[Note Title#^blockid]]` (Link zu spezifischem Block)
3. **Property Relations** — Property vom Typ "Relation" (typisiert, z.B. "Related Projects")

Alle Relations werden im Index gespeichert für schnelle Backlink-Queries.

---

## C) UI/UX SPEC — "Workspace Orbit" Layout

### Layout-Bereiche (4-Panel System)

```
┌─────────┬──────────────────────────────┬─────────────┐
│ Orbit   │                              │  Focus      │
│ Bar     │       Canvas / Editor        │  Rail       │
│ (Nav)   │       (Main Area)            │  (Context)  │
│         │                              │             │
│ [Icons] │                              │  [Tabs]     │
│         │                              │             │
├─────────┴──────────────────────────────┴─────────────┤
│              Command Dock (Bottom)                    │
│  [ Capture ] [ Jump ] [ Compose ] [ Sync Status ]    │
└──────────────────────────────────────────────────────┘
```

### 1. ORBIT BAR (Links, collapsed/expanded)

**Breite:** 60px (collapsed) / 240px (expanded)

**Inhalt:**
- Liste aller Orbits (Icon + Name)
- Aktueller Orbit highlighted
- `+` Button für neuen Orbit
- Settings Icon (App-weite Settings)

**Interaktion:**
- Click: Switch Orbit (lädt neuen Orbit-Context)
- Right-Click: Orbit-Settings (Sync, E2EE, Color)
- Hover: Tooltip mit Orbit-Name + Sync-Status

**Keyboard:**
- `Ctrl+1..9`: Schnellwechsel zu Orbit 1-9
- `Ctrl+Shift+O`: Orbit Switcher (Command Palette)

### 2. CANVAS / EDITOR (Mitte, Hauptarbeitsbereich)

**Modi:**

#### a) **Note Editor Mode** (Default wenn Notiz geöffnet)
- Block-basierter Editor (ähnlich Notion)
- Markdown Shortcuts unterstützt
- Inline Backlinks-Suggestions bei `[[`
- Properties Panel ausklappbar oben
- Breadcrumbs oben (wenn Notiz in Collection)

#### b) **Canvas Mode** (Spatial Arrangement)
- Infinite Canvas mit Zoom/Pan
- Cards (Notizen) als drag-baren Nodes
- Connections zwischen Cards visualisieren (Links)
- Freeform Text/Drawing Nodes möglich (V1)
- Mini-Map in Corner

#### c) **Database View Mode** (Collection geöffnet)
- List / Board / Gallery / Calendar Toggle oben rechts
- Filter/Sort/Group Controls oben
- Inline Edit in Zellen (für List View)
- Drag-to-Reorder (für Board View)

**Wechsel zwischen Modi:**
- Note öffnen → Editor Mode
- Canvas öffnen → Canvas Mode
- Collection öffnen → Database View Mode

### 3. FOCUS RAIL (Rechts, Tabs)

**Breite:** 300px (collapsible)

**Tabs (immer verfügbar):**

#### Tab: **Context**
- Backlinks (Notizen, die hierher linken)
- Outgoing Links (Links aus dieser Notiz)
- Related (AI-suggested oder Tag-based, V1)
- Mentions (ungefilterte Textsuche nach Titel)

#### Tab: **Action**
- Tasks aus aktueller Notiz
- Overdue Tasks (Orbit-weit)
- Quick Capture für aktuelle Notiz

#### Tab: **Meta**
- Properties Editor (strukturierte Metadaten)
- Version History (Snapshots, V1)
- Sync Status (Conflicts, Last Sync Time)
- Word/Block Count

**Keyboard:**
- `Ctrl+Shift+1..3`: Wechsel zwischen Tabs
- `Ctrl+Shift+E`: Toggle Focus Rail

### 4. COMMAND DOCK (Unten, immer sichtbar)

**Höhe:** 56px

**Buttons (Icons + Labels):**

| Button | Funktion | Keyboard | Beschreibung |
|--------|----------|----------|--------------|
| **Capture** | Quick Note Inbox | `Ctrl+N` | Öffnet minimalen Editor für schnelle Notiz |
| **Jump** | Command Palette | `Ctrl+K` | Fuzzy Search für Notizen, Commands, Actions |
| **Compose** | Neue strukturierte Notiz | `Ctrl+Shift+N` | Template Picker → Editor |
| **Sync Status** | Sync Indicator | Click | Zeigt Sync Queue, Conflicts, Force Sync |

**Zusätzlich rechts:**
- **Search** (Icon): Öffnet globale Suche (Fulltext + Filters)
- **Theme Toggle** (Icon): Dark/Light/Auto
- **User Avatar** (Icon): Account Settings, Logout

### Kernflows (User Journeys)

#### Flow 1: **Capture → Organize → Work**

```
1. CAPTURE:
   User: Ctrl+N → Quick Note Editor
   → Tippen, optional Tags #work
   → Enter: Note wird in Inbox gespeichert

2. ORGANIZE (später):
   User: Öffnet Inbox (via Jump Ctrl+K → "inbox")
   → Sieht Liste ungeprozessierter Notes
   → Drag Note auf Collection / Canvas
   ODER: Fügt Properties hinzu (Status, Project)

3. WORK:
   User: Öffnet Project Collection (DB View)
   → Filter "Status = In Progress"
   → Click auf Note → Editor Mode
   → Bearbeitet, fügt [[Links]] hinzu
   → Focus Rail zeigt Backlinks → Click auf Backlink → Neue Note öffnet
```

#### Flow 2: **Review (Daily/Weekly)**

```
User: Command Palette (Ctrl+K) → "Review: Today"
→ Öffnet View:
   - Notes created today
   - Tasks due today
   - Recently edited
→ User scrollt durch, macht Quick Edits
→ Markiert Tasks als done (Checkbox in List View)
```

#### Flow 3: **Search → Explore**

```
User: Ctrl+K → tippt "migration strategy"
→ Fuzzy Search zeigt:
   - Notes mit Title-Match
   - Notes mit Content-Match (Snippet Preview)
   - Tags mit Match
→ User wählt Note → Editor öffnet
→ Focus Rail "Context" Tab:
   - Zeigt Backlinks → User entdeckt verwandte Notes
   - Graph View (Mini) zeigt lokales Cluster
```

### Responsive Anpassungen

**Tablet (< 1024px):**
- Orbit Bar collapsible (nur Icons)
- Focus Rail collapsible (Swipe from right to open)
- Command Dock bleibt

**Mobile (< 768px):**
- Single Panel: Entweder Canvas ODER Focus Rail
- Orbit Bar → Bottom Tab Bar
- Command Dock → Floating Action Button (+ Menu)
- Editor: Full Screen
- Swipe-Gesten:
  - Swipe right: Back to List
  - Swipe left: Open Context Panel
  - Long-press: Context Menu

---

## D) DATENMODELL

### Entity: **Orbit**

| Feld | Typ | Index | Beschreibung |
|------|-----|-------|--------------|
| `id` | UUID | PK | Eindeutige ID |
| `name` | String | — | Display Name |
| `icon` | String | — | Emoji oder Icon-Key |
| `color` | String | — | Hex Color für UI |
| `syncConfig` | JSON | — | `{provider: "local"|"webdav"|"s3", endpoint, credentials}` |
| `encryptionConfig` | JSON | — | `{enabled: bool, keyId: string}` (V1) |
| `created` | Timestamp | — | |
| `updated` | Timestamp | — | |

**Storage:** Separate IndexedDB Database pro Orbit (z.B. `orbit_{id}`).

### Entity: **Note**

| Feld | Typ | Index | Beschreibung |
|------|-----|-------|--------------|
| `id` | UUID | PK | Eindeutige ID |
| `title` | String | Fulltext | Titel (optional leer bei Quick Notes) |
| `blocks` | JSON[] | — | Array von Block-Objekten (s.u.) |
| `properties` | JSON | — | Key-Value Pairs (flexibel) |
| `collectionId` | UUID? | Index | Zugehörige Collection (optional) |
| `created` | Timestamp | Index | |
| `updated` | Timestamp | Index | |
| `deleted` | Boolean | Index | Soft Delete Flag |
| `version` | Integer | — | Inkrement bei jeder Änderung (für Sync) |
| `lastSyncedVersion` | Integer | — | Version beim letzten erfolgreichen Sync |

**Block Structure (JSON):**
```json
{
  "id": "uuid",
  "type": "paragraph|heading|list|checkbox|code|image|...",
  "content": "string or structured data",
  "properties": {},
  "children": ["block-id-1", "block-id-2"]
}
```

**Indizes (IndexedDB Composite):**
- `[collectionId, updated]` — Für Collection Views
- `[deleted, updated]` — Für Inbox/Archiv
- `updated` — Für "Recent"

### Entity: **Link** (Relation Index)

| Feld | Typ | Index | Beschreibung |
|------|-----|-------|--------------|
| `id` | UUID | PK | |
| `sourceNoteId` | UUID | Index | Ausgangsnotiz |
| `targetNoteId` | UUID | Index | Zielnotiz |
| `sourceBlockId` | UUID? | — | Spezifischer Block (optional) |
| `type` | Enum | — | `wikilink|property_relation|mention` |
| `created` | Timestamp | — | |

**Wichtig:** Links werden beim Speichern einer Notiz extrahiert und hier indexiert für schnelle Backlink-Queries.

**Indizes:**
- `[targetNoteId]` — Backlinks Query
- `[sourceNoteId]` — Outgoing Links

### Entity: **Collection** (DB-like Container)

| Feld | Typ | Index | Beschreibung |
|------|-----|-------|--------------|
| `id` | UUID | PK | |
| `name` | String | — | |
| `icon` | String | — | |
| `schema` | JSON | — | Property Definitions: `{propName: {type, options}}` |
| `defaultView` | JSON | — | View Config (List/Board/etc + Sort/Filter) |
| `created` | Timestamp | — | |

**Example Schema:**
```json
{
  "Status": {"type": "select", "options": ["Todo", "In Progress", "Done"]},
  "Priority": {"type": "select", "options": ["Low", "Medium", "High"]},
  "DueDate": {"type": "date"},
  "Assignee": {"type": "relation", "targetCollection": "people"}
}
```

### Entity: **Tag** (Denormalized)

| Feld | Typ | Index | Beschreibung |
|------|-----|-------|--------------|
| `name` | String | PK | Hierarchical path: `work/project-alpha` |
| `count` | Integer | — | Anzahl Notes mit diesem Tag (gecacht) |
| `color` | String? | — | Optional custom color |

**ANNAHME:** Tags werden on-demand aus Note.properties extrahiert, hier nur für Autocomplete/Übersicht gecacht.

### Entity: **Task** (Extracted View)

Tasks sind **nicht eigenständig gespeichert**, sondern eine View auf:
- Notes mit `type: "task"` Property
- Checkbox-Blocks in beliebigen Notes

**Virtual Schema:**
| Feld | Quelle | Beschreibung |
|------|--------|--------------|
| `id` | Note.id oder Block.id | |
| `title` | Block.content oder Note.title | |
| `status` | Property oder Block.checked | `todo|in_progress|done` |
| `due` | Property `due` | Date |
| `priority` | Property `priority` | Enum |
| `sourceNoteId` | Note.id | Ursprungsnotiz |

**Query:** Tasks werden on-demand via IndexedDB Query + Block-Extraktion geholt.

### Entity: **Attachment**

| Feld | Typ | Index | Beschreibung |
|------|-----|-------|--------------|
| `id` | UUID | PK | |
| `noteId` | UUID | Index | Zugehörige Notiz |
| `filename` | String | — | Original Filename |
| `mimeType` | String | — | |
| `size` | Integer | — | Bytes |
| `data` | Blob | — | File Content (IndexedDB Blob) |
| `uploaded` | Timestamp | — | |
| `syncStatus` | Enum | — | `pending|synced|conflict` |

**ANNAHME:** Attachments <10MB werden direkt in IndexedDB gespeichert; größere Files über FileSystem Access API (V1) mit Referenz.

### Entity: **SyncQueue** (Offline Queue)

| Feld | Typ | Index | Beschreibung |
|------|-----|-------|--------------|
| `id` | UUID | PK | |
| `entityType` | Enum | — | `note|attachment|collection` |
| `entityId` | UUID | Index | |
| `operation` | Enum | — | `create|update|delete` |
| `timestamp` | Timestamp | Index | Wann in Queue gelegt |
| `retries` | Integer | — | Fehlerversuche |
| `error` | String? | — | Letzte Fehlermeldung |

### Fulltext Search Index

**Technologie:** Lunr.js oder MiniSearch (Browser-basiert).

**Indiziert:**
- `Note.title` (Boost: 2x)
- `Note.blocks[].content` (Boost: 1x)
- `Note.properties` (selected fields, Boost: 1x)

**Update-Strategie:** Index wird bei jedem Note-Save aktualisiert (debounced).

---

## E) SYNC-ARCHITEKTUR

### Architektur-Diagramm (Textform)

```
┌─────────────────────────────────────────────────────┐
│                    ORBIT CLIENT                     │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │  UI Layer  │→ │  Data Layer │→ │ Sync Manager │ │
│  └────────────┘  └─────────────┘  └──────┬───────┘ │
│                         ↓                  ↓         │
│                   ┌─────────────┐    ┌────────────┐ │
│                   │  IndexedDB  │    │ SyncQueue  │ │
│                   └─────────────┘    └────┬───────┘ │
└──────────────────────────────────────────┼─────────┘
                                            ↓
                             ┌──────────────────────┐
                             │   Sync Adapter       │
                             │   (Interface)        │
                             └──────┬───────────────┘
                                    ↓
           ┌────────────────┬───────┴──────┬──────────────┐
           ↓                ↓              ↓              ↓
    ┌──────────┐    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  Local   │    │ WebDAV   │   │    S3    │   │  Custom  │
    │ (no-op)  │    │ Adapter  │   │ Adapter  │   │  (V1)    │
    └──────────┘    └────┬─────┘   └────┬─────┘   └──────────┘
                         ↓               ↓
                    ┌─────────────────────────┐
                    │   Remote Storage        │
                    │  (WebDAV Server / S3)   │
                    └─────────────────────────┘
```

### Sync Strategy: **Operation-Based CRDT (Hybrid)**

**Entscheidung:** Wir nutzen **Yjs** (CRDT Library) mit Custom Transport.

**Begründung:**
- **Pro CRDT (Yjs):**
  - Automatische Konfliktauflösung für kollaboratives Editing
  - Offline-first by Design
  - Gut für Realtime Collaboration (V1 Feature)
  - Reife Library mit ProseMirror Binding

- **Contra CRDT:**
  - Overhead (Metadaten-Größe)
  - Komplexität bei strukturierten Properties (nicht nur Text)

- **Alternative (OT):** Zu komplex für serverless/selfhosted Setup.

**Hybrid-Ansatz:**
- **Block Content (Text)** → Yjs CRDT (echtes Collaborative Editing)
- **Structured Data (Properties, Metadata)** → Last-Write-Wins mit Timestamp + Manual Conflict Resolution UI

### Sync-Ablauf (Pseudocode)

```
1. User macht Änderung an Note:
   → Data Layer speichert in IndexedDB
   → Inkrement Note.version
   → Fügt Eintrag in SyncQueue hinzu
   → Triggert Sync Manager (debounced 2s)

2. Sync Manager:
   → Liest SyncQueue
   → Für jeden Entry:
     a) Ruft Sync Adapter.push(entity, operation)
     b) Bei Erfolg: Markiert Entry als synced, entfernt aus Queue
     c) Bei Fehler: Inkrement retries, bleibt in Queue
     d) Bei Konflikt: Schreibt in ConflictLog, zeigt UI Notification

3. Sync Adapter (z.B. WebDAV):
   → Serialisiert Entity zu JSON
   → Berechnet Etag (Version-based)
   → PUT /orbits/{orbitId}/notes/{noteId}.json
   → Prüft Etag-Conflict (Server hat neuere Version)
   → Falls Conflict: Lädt Remote Version, returned Conflict Error

4. Periodic Pull (alle 30s wenn online):
   → Sync Manager ruft Adapter.listUpdates(since: lastSyncTimestamp)
   → Lädt neue/geänderte Entities
   → Merged mit lokalem State:
     - Falls lokal unverändert: Überschreiben
     - Falls lokal geändert: 3-Way Merge (Yjs für Blocks, Conflict UI für Properties)
```

### Conflict Resolution

**Strategie für verschiedene Datentypen:**

| Datentyp | Strategie | Begründung |
|----------|-----------|------------|
| **Block Content (Text)** | Yjs CRDT Auto-Merge | Standard für Text-Editing |
| **Note Title** | Last-Write-Wins (Timestamp) | Selten gleichzeitig geändert |
| **Properties (Single-Value)** | Manual Resolution UI | User muss entscheiden (z.B. Status) |
| **Properties (Multi-Value, Tags)** | Union Merge | Additive Operation, safe |
| **Note Deleted** | Tombstone (Soft Delete) | Nie permanent löschen bei Conflict |

**Conflict UI:**
```
╔═══════════════════════════════════════════════════╗
║  Sync Conflict Detected                           ║
╠═══════════════════════════════════════════════════╣
║  Note: "Project Alpha Kickoff"                    ║
║                                                   ║
║  Property: Status                                 ║
║    Your version:    "In Progress"  [Keep]         ║
║    Remote version:  "Done"         [Keep]         ║
║                                                   ║
║  [ Keep Both (as comment) ] [ Cancel Sync ]       ║
╚═══════════════════════════════════════════════════╝
```

### Offline Queue

**Persistenz:** Eigene IndexedDB Table `SyncQueue`.

**Retry Logic:**
```javascript
retry_delays = [10s, 30s, 1min, 5min, 15min, 30min, STOP]
if (retries > 6) {
  mark_as_failed()
  show_user_notification("Sync failed permanently, manual resolution needed")
}
```

**User Feedback:**
- Icon in Command Dock zeigt Queue-Länge (Badge)
- Click öffnet Sync Status Panel:
  - Pending Operations (mit Timestamp)
  - Failed Operations (mit Error Message + "Retry" Button)
  - Last Successful Sync Time

### Sync Provider Adapter Interface

**TypeScript Interface:**
```typescript
interface SyncAdapter {
  // Initialize connection (credentials, test auth)
  init(config: SyncConfig): Promise<void>

  // Push single entity
  push(entity: Entity, operation: 'create'|'update'|'delete'): Promise<PushResult>

  // Pull updates since timestamp
  pull(since: Timestamp): Promise<Entity[]>

  // List all entities (for initial sync)
  listAll(): Promise<EntityMetadata[]>

  // Upload attachment (separate from Note push)
  uploadAttachment(attachment: Attachment): Promise<string> // returns URL

  // Download attachment
  downloadAttachment(url: string): Promise<Blob>

  // Test connection health
  healthCheck(): Promise<boolean>
}

interface SyncConfig {
  provider: 'local' | 'webdav' | 's3' | 'custom'
  endpoint?: string // URL for WebDAV/S3
  credentials?: {
    accessKey: string
    secretKey: string
  }
}

interface PushResult {
  success: boolean
  conflict?: ConflictData
  error?: string
}
```

**Implementierungen für MVP:**

1. **LocalAdapter** (No-Op):
   - `push()` → return success immediately
   - `pull()` → return empty array

2. **WebDAVAdapter** (MVP Priority):
   - PUT/GET via fetch() to WebDAV endpoints
   - File structure: `/orbits/{orbitId}/notes/{noteId}.json`
   - Etag-based conflict detection

3. **S3Adapter** (V1):
   - AWS SDK for Browser
   - Object key: `{orbitId}/notes/{noteId}.json`
   - Versioning enabled on bucket (optional)

### Data Format (Remote Storage)

**File per Note:**
```
/orbits/orbit-uuid/
  /notes/
    note-uuid-1.json
    note-uuid-2.json
  /collections/
    collection-uuid-1.json
  /attachments/
    attachment-uuid-1.bin
  /meta/
    orbit-config.json
    sync-state.json  # Last sync timestamps, conflict log
```

**Note JSON Format:**
```json
{
  "id": "uuid",
  "version": 42,
  "title": "Meeting Notes",
  "blocks": [...],
  "properties": {...},
  "created": "2026-01-11T10:00:00Z",
  "updated": "2026-01-11T11:30:00Z"
}
```

**sync-state.json:**
```json
{
  "lastPullTimestamp": "2026-01-11T12:00:00Z",
  "entityVersions": {
    "note-uuid-1": 42,
    "note-uuid-2": 15
  }
}
```

### Migration zwischen Sync Providers

**Use Case:** User wechselt von Local zu WebDAV.

**Flow:**
```
1. User: Settings → Orbit → Change Sync Provider → WebDAV
2. App: Zeigt Warning "This will upload all data to new provider"
3. User: Bestätigt + gibt Credentials ein
4. App:
   a) Test connection (healthCheck())
   b) Lädt alle lokalen Entities (listAll())
   c) Für jede Entity: push() mit force=true
   d) Speichert neuen SyncConfig in Orbit
   e) Success Message: "X notes, Y attachments uploaded"
```

**Rollback:** Alte SyncConfig wird in Orbit.syncConfigHistory gespeichert für manuelles Rollback.

---

## F) SECURITY MODEL

### Threat Model (Top Threats)

| Threat | Beschreibung | Wahrscheinlichkeit | Impact |
|--------|--------------|-------------------|--------|
| **T1: Sync-Server Compromise** | Angreifer erhält Zugriff auf WebDAV/S3 Server | Medium | HIGH (alle Daten lesbar) |
| **T2: Man-in-the-Middle** | Netzwerk-Angriff auf Sync-Traffic | Low (bei HTTPS) | High |
| **T3: Client-Device Theft** | Laptop/Phone wird gestohlen | Medium | HIGH (lokale DB lesbar) |
| **T4: Malicious Browser Extension** | Extension liest IndexedDB | Medium | HIGH |
| **T5: XSS in User Content** | User fügt Malicious Markdown/HTML ein | Low (bei Sanitization) | Medium |
| **T6: Shared Device Access** | Anderer User an gleichem Gerät | Medium | Medium |
| **T7: Backup Exposure** | Unverschlüsselte Backups geleakt | Medium | HIGH |

### E2EE Design (Optional pro Orbit)

**Entscheidung:** **Hybrid Encryption** (AES-256-GCM für Daten + RSA-2048 für Key-Wrapping).

**Architektur:**

```
User Passphrase
    ↓ (PBKDF2, 600k iterations)
Master Key (256-bit)
    ↓ (stored encrypted in IndexedDB)
Per-Orbit Data Encryption Key (DEK, 256-bit)
    ↓ (encrypts)
Note Content, Attachments
```

**Verschlüsselt:**
- `Note.blocks` (Block Content)
- `Attachment.data`
- **Nicht verschlüsselt:** `Note.title`, `Note.properties` (für Suche/Filtering nötig)

**ANNAHME:** Title/Properties sind weniger sensibel als Inhalt; User kann sensible Infos in Content packen.

**Alternative (für höhere Security):** Blindindex für Title (Hashed), aber dann keine Fuzzy Search mehr. Entscheidung: MVP ohne Blindindex, V1 als Option.

### Key Management

**Setup Flow (User aktiviert E2EE für Orbit):**

```
1. User: Orbit Settings → Enable Encryption → Enter Passphrase (2x)
2. App:
   a) Generiert random DEK (256-bit)
   b) Derived Master Key aus Passphrase (PBKDF2)
   c) Verschlüsselt DEK mit Master Key → speichert in IndexedDB (als EncryptedDEK)
   d) Speichert Salt für PBKDF2 in Orbit.encryptionConfig
3. Beim App-Start:
   a) User wird nach Passphrase gefragt (für E2EE Orbits)
   b) App deriviert Master Key → entschlüsselt DEK → hält im Memory
4. Auto-Lock:
   - Nach 30min Inaktivität: Löscht DEK aus Memory
   - User muss Passphrase erneut eingeben
```

**Key Recovery:**
- **Kein** Server-seitiges Key Recovery (by Design)
- **Recovery Key** (256-bit Random) wird bei Setup angezeigt:
  ```
  orbit-alpha-recovery-key:
  XF7J-KL9M-PN2Q-WR4T-VB6Y-HC8Z-DG1A-ES3U
  ```
- User muss diesen Key separat speichern (Passwort-Manager, Papier)

**Passphrase Loss = Datenverlust** — klare Warning beim Setup.

### Encryption Implementation

**Crypto API (Browser):**
```javascript
// Encrypt Note Blocks
async function encryptBlocks(blocks, dek) {
  const plaintext = JSON.stringify(blocks)
  const iv = crypto.getRandomValues(new Uint8Array(12)) // GCM nonce
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    dek,
    new TextEncoder().encode(plaintext)
  )
  return {
    iv: base64(iv),
    data: base64(ciphertext)
  }
}
```

**Storage Format (E2EE Note):**
```json
{
  "id": "uuid",
  "title": "Plaintext Title",
  "encrypted": true,
  "encryptedBlocks": {
    "iv": "base64...",
    "data": "base64..."
  },
  "properties": {...}, // plaintext
  "version": 42
}
```

### Authentication (Selfhosted Setup)

**MVP:** HTTP Basic Auth oder JWT.

**V1:** OAuth2 (für externe Clients), Passkeys (WebAuthn).

**Selfhosted Auth Options:**
1. **Standalone Mode:** Keine Auth, App läuft komplett client-side (S3/WebDAV credentials im Client)
2. **Backend Mode:** Node.js Backend mit:
   - User Registration/Login
   - JWT Tokens (7-day expiry, refresh tokens)
   - Multi-User Orbits (Sharing, V1)

**ANNAHME:** MVP fokussiert auf Single-User; Auth ist rudimentär (HTTP Basic für WebDAV).

### Content Sanitization (XSS Prevention)

**Editor Output:** Block-Content wird als Markdown geparst.

**Renderer:** DOMPurify für HTML-Sanitization.

**Verboten:**
- `<script>` Tags
- `onerror`, `onclick` Event Handlers
- `<iframe>` ohne Whitelist

**Erlaubt:**
- Basic Markdown-HTML (Bold, Italic, Links, Images)
- Code Blocks (Syntax Highlighting via Prism.js)

### Audit Log (V1)

Für Compliance/Enterprise:
- Track: Note Created/Updated/Deleted (User, Timestamp)
- Stored in separate `AuditLog` Table
- Optional Export zu externem SIEM

---

## G) API/BACKEND

### MVP: Minimal Backend (Optional für Selfhosted)

**Zweck:**
- Auth (Login/Registration)
- Sync Relay (falls kein direkter WebDAV/S3 Access)
- Attachment Proxy (für große Files)

**Alternative:** Komplett ohne Backend → App nutzt WebDAV/S3 direkt.

**Entscheidung:** MVP mit **optionalem Backend** (Hybrid-Modus).

### Backend Tech Stack

**Sprache:** **Node.js** (TypeScript) mit **Fastify**.

**Begründung:**
- Schnell, niedrige Latency
- Gutes Ecosystem für Auth (JWT, Passport)
- Einfaches Deployment (Docker)
- Shared Types mit Frontend (TypeScript)

**Alternative:** **Go** (schneller, aber mehr Boilerplate). Entscheidung: Node.js für MVP (Developer Velocity).

### API Endpoints (REST)

**Base URL:** `https://orbit.example.com/api/v1`

#### Auth Endpoints

```
POST /auth/register
Body: { email, password, name }
Response: { userId, token }

POST /auth/login
Body: { email, password }
Response: { token, refreshToken }

POST /auth/refresh
Body: { refreshToken }
Response: { token }

GET /auth/me
Headers: Authorization Bearer {token}
Response: { userId, email, name, orbits[] }
```

#### Sync Endpoints (Relay Mode)

```
GET /orbits/:orbitId/sync/changes?since={timestamp}
Response: { notes: [], collections: [], attachments: [] }

PUT /orbits/:orbitId/notes/:noteId
Body: { ...NoteData }
Response: { version, synced: true }

DELETE /orbits/:orbitId/notes/:noteId
Response: { deleted: true }

POST /orbits/:orbitId/attachments
Body: FormData (file upload)
Response: { attachmentId, url }

GET /orbits/:orbitId/attachments/:attachmentId
Response: Binary File (streamed)
```

#### WebDAV Proxy (Optional)

Falls User keinen direkten WebDAV-Zugriff hat (Corporate Firewall):

```
GET /webdav-proxy/*
Headers: X-WebDAV-Endpoint, Authorization
→ Proxy zu User's WebDAV Server
```

### Backend Storage (Selfhosted)

**Option 1: File-based** (wie direkte Sync-Adapter):
- Backend schreibt in lokales Filesystem oder S3
- `/data/orbits/{orbitId}/notes/*.json`

**Option 2: PostgreSQL** (für Multi-User + Query-Performance):
- Tables: `users`, `orbits`, `notes`, `links`, `attachments`
- Vorteil: Komplexe Queries, Transaktionen
- Nachteil: Mehr Overhead, schwerer zu deployen

**MVP-Entscheidung:** **Option 1 (File-based)** für Einfachheit; PostgreSQL in V1 für Multi-User.

### Docker Compose Setup

```yaml
version: '3.8'
services:
  orbit-web:
    image: orbit/web:latest
    ports:
      - "3000:3000"
    environment:
      - API_URL=http://orbit-api:4000

  orbit-api:
    image: orbit/api:latest
    ports:
      - "4000:4000"
    environment:
      - DB_TYPE=file
      - DATA_PATH=/data
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/data

  orbit-nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - orbit-web
      - orbit-api
```

**ENV Variables:**
- `JWT_SECRET`: Random 256-bit Key (für Token Signing)
- `DATA_PATH`: Persistent Volume für Orbits
- `ENABLE_REGISTRATION`: `true`/`false` (für closed instances)

### Rate Limiting & Security

**API Security Headers:**
```
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
```

**Rate Limits:**
- `/auth/login`: 5 req/min pro IP
- `/auth/register`: 3 req/hour pro IP
- Sync Endpoints: 60 req/min pro User

**Implementation:** Redis + `fastify-rate-limit` Plugin.

---

## H) REPO-STRUKTUR (Monorepo)

**Tool:** **Turborepo** (oder Nx, aber Turbo ist einfacher).

**Begründung:**
- Shared Types zwischen Frontend/Backend
- Incremental Builds
- Task Caching

```
orbit-notes/
├── apps/
│   ├── web/                    # React PWA
│   │   ├── src/
│   │   │   ├── components/     # UI Components (Orbit Bar, Editor, ...)
│   │   │   ├── features/       # Feature Modules (Notes, Sync, Tasks)
│   │   │   ├── lib/            # Data Layer, Sync Manager
│   │   │   ├── hooks/          # React Hooks
│   │   │   ├── stores/         # State Management (Zustand)
│   │   │   └── App.tsx
│   │   ├── public/
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── api/                    # Node.js Backend (optional)
│   │   ├── src/
│   │   │   ├── routes/         # Fastify Routes
│   │   │   ├── services/       # Business Logic (Auth, Sync)
│   │   │   ├── adapters/       # Sync Adapters (WebDAV, S3)
│   │   │   └── server.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── cli/                    # CLI Tool (V1, für bulk imports/exports)
│       └── src/
│           └── index.ts
│
├── packages/
│   ├── shared-types/           # TypeScript Types (shared)
│   │   └── src/
│   │       ├── entities.ts     # Note, Orbit, Collection Types
│   │       ├── sync.ts         # Sync Adapter Interface
│   │       └── index.ts
│   │
│   ├── sync-engine/            # Core Sync Logic (shared lib)
│   │   └── src/
│   │       ├── SyncManager.ts
│   │       ├── ConflictResolver.ts
│   │       ├── adapters/
│   │       │   ├── LocalAdapter.ts
│   │       │   ├── WebDAVAdapter.ts
│   │       │   └── S3Adapter.ts
│   │       └── index.ts
│   │
│   ├── editor/                 # Block Editor (ProseMirror/Tiptap wrapper)
│   │   └── src/
│   │       ├── BlockEditor.tsx
│   │       ├── extensions/     # Custom ProseMirror Nodes
│   │       └── index.ts
│   │
│   └── ui-components/          # Shared UI Components (Design System)
│       └── src/
│           ├── Button.tsx
│           ├── Input.tsx
│           ├── CommandPalette.tsx
│           └── index.ts
│
├── docker/
│   ├── docker-compose.yml
│   ├── nginx.conf
│   └── .env.example
│
├── docs/
│   ├── architecture.md         # Dieses Dokument
│   ├── api.md
│   └── deployment.md
│
├── scripts/
│   ├── setup-dev.sh
│   └── build-all.sh
│
├── turbo.json                  # Turborepo Config
├── package.json                # Root package.json (workspaces)
└── README.md
```

### Package Dependencies

```
apps/web:
  - depends on: @orbit/shared-types, @orbit/sync-engine, @orbit/editor, @orbit/ui-components

apps/api:
  - depends on: @orbit/shared-types, @orbit/sync-engine

packages/sync-engine:
  - depends on: @orbit/shared-types
```

### Scripts (Root package.json)

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "docker:up": "docker-compose -f docker/docker-compose.yml up",
    "docker:build": "docker-compose -f docker/docker-compose.yml build"
  }
}
```

---

## I) MVP IMPLEMENTIERUNGSPLAN

**Zeitschätzung Disclaimer:** Keine Zeitschätzungen; Fokus auf Abhängigkeiten und Akzeptanzkriterien.

### Phase 1: Foundation & Setup

#### M1: **Project Setup & Tooling**
- Repo erstellen (Turborepo)
- Apps/Packages Struktur
- CI/CD Pipeline (GitHub Actions): Lint, Test, Build
- **Akzeptanz:** `npm run dev` startet Web + API, Hot Reload funktioniert

#### M2: **Design System (UI Components Package)**
- Button, Input, Select, Modal, Dropdown
- Theming (CSS Variables für Dark/Light)
- Storybook Setup (für Component Docs)
- **Akzeptanz:** Storybook zeigt 10+ Components, beide Themes

#### M3: **Data Layer & IndexedDB Abstraction**
- Dexie.js Wrapper für Orbit/Note/Link/Collection Tables
- CRUD Operations für Notes
- Indizes wie in Datenmodell definiert
- **Akzeptanz:** Test schreibt 1000 Notes, Query nach updated >X dauert <50ms

### Phase 2: Core UI (Offline-first)

#### M4: **Orbit Bar + Navigation**
- Orbit List (collapsed/expanded)
- Create New Orbit Modal
- Switch Orbit → lädt neue IndexedDB
- **Akzeptanz:** 3 Orbits erstellen, zwischen ihnen wechseln, Daten sind isoliert

#### M5: **Note Editor (Markdown-only MVP)**
- Textarea mit Markdown Preview (react-markdown)
- Auto-Save (debounced 2s)
- Title Field
- **Akzeptanz:** Note erstellen, Markdown formatieren, nach Reload ist Inhalt da

#### M6: **Canvas Layout (Main Area)**
- Note List View (einfache Tabelle)
- Click → öffnet Editor
- Breadcrumbs (simple "Inbox" / "Note Title")
- **Akzeptanz:** 10 Notes anzeigen, öffnen, editieren, zurück zu Liste

#### M7: **Command Dock (Bottom Bar)**
- Capture Button → Minimal Editor Modal
- Jump Button → Fuzzy Search (fuse.js) über Note Titles
- Sync Status Icon (dummy, zeigt "Local Only")
- **Akzeptanz:** Capture speichert in Inbox, Jump findet Notes, <50ms Response

### Phase 3: Linking & Context

#### M8: **Wikilinks Parsing & Backlinks**
- `[[Note Title]]` Parser (Regex beim Save)
- Link Entity erstellen/updaten
- Focus Rail: Context Tab zeigt Backlinks
- **Akzeptanz:** Note A linkt zu B, B zeigt A in Backlinks, Click navigiert

#### M9: **Tags System**
- Tags Input Component (Autocomplete)
- Tags extrahieren aus Note.properties
- Filter Notes by Tag
- **Akzeptanz:** Tag hinzufügen, in Tag-Liste sehen, Filter zeigt nur getaggte Notes

#### M10: **Search (Fulltext)**
- Lunr.js Index auf Title + Block Content
- Search UI (Input + Results List)
- Highlight Matches
- **Akzeptanz:** 100 Notes, Suche findet in <100ms, Snippet zeigt Context

### Phase 4: Sync (WebDAV MVP)

#### M11: **Sync Adapter Interface**
- TypeScript Interface (wie in E) beschrieben)
- LocalAdapter Implementation (no-op)
- **Akzeptanz:** LocalAdapter pushAll() funktioniert (Mock Tests)

#### M12: **WebDAV Adapter**
- fetch() zu WebDAV PUT/GET
- Etag-based Conflict Detection
- Connection Test (healthCheck)
- **Akzeptanz:** Push/Pull gegen Test-WebDAV Server (ownCloud/Nextcloud)

#### M13: **Sync Manager & Queue**
- SyncQueue Table
- Background Worker (Web Worker oder Interval)
- Retry Logic
- **Akzeptanz:** Offline → Queue füllt sich → Online → Queue leert sich

#### M14: **Conflict Resolution (Manual)**
- Conflict Detection (Version Mismatch)
- UI Modal zeigt Local vs Remote
- User wählt Version
- **Akzeptanz:** Simulierter Conflict → UI zeigt → User löst → synced

### Phase 5: Advanced Features (Pre-Launch)

#### M15: **Block Editor Upgrade (Tiptap/ProseMirror)**
- Ersetze Textarea durch Tiptap
- Block Types: Paragraph, Heading, List, Checkbox, Code
- Slash Commands (/ → Insert Block)
- **Akzeptanz:** Alle Block-Types funktionieren, Slash Commands reagieren

#### M16: **Properties System**
- Property Panel (Rechts im Editor oder oben)
- Add Property (Text, Date, Select)
- Filter by Property
- **Akzeptanz:** Property hinzufügen, in Note sehen, Filter funktioniert

#### M17: **Collections (Basic DB View)**
- Collection erstellen (mit Schema)
- List View: Notes als Tabelle mit Property-Spalten
- Add Note to Collection
- **Akzeptanz:** Collection mit 3 Properties, 10 Notes, Sort/Filter

#### M18: **Responsive UI (Mobile)**
- Media Queries für <768px
- Orbit Bar → Bottom Tabs
- Editor → Full Screen
- Touch Gestures (Swipe Back)
- **Akzeptanz:** App auf iPhone SE nutzbar, keine Scrolling-Bugs

### Phase 6: Polish & Launch Prep

#### M19: **PWA Setup**
- Service Worker (Workbox)
- Manifest.json
- Offline Fallback Page
- Install Prompt
- **Akzeptanz:** Lighthouse PWA Score >90, Install funktioniert auf Mobile

#### M20: **Docker Deployment**
- Dockerfile für Web + API
- docker-compose.yml
- Nginx Reverse Proxy Config
- .env.example Docs
- **Akzeptanz:** `docker-compose up` startet App, erreichbar auf localhost:3000

#### M21: **Import/Export**
- Export Orbit als ZIP (JSON Files)
- Import von JSON
- Markdown Export (einzelne Notes)
- **Akzeptanz:** Orbit exportieren, in neuer Instanz importieren, Daten identisch

#### M22: **Onboarding Flow**
- Welcome Screen (First Launch)
- Create First Orbit Wizard
- Quick Tour (Tooltips für 4 UI Areas)
- **Akzeptanz:** First-time User sieht Tour, kann Orbit erstellen ohne Docs

### Phase 7: Testing & Hardening

#### M23: **E2E Tests (Playwright)**
- Critical Paths: Capture → Edit → Link → Sync
- 5-10 E2E Tests
- **Akzeptanz:** Tests laufen in CI, decken Hauptflows ab

#### M24: **Performance Profiling**
- Lighthouse Audit (Target: >90 Performance)
- IndexedDB Query Profiling
- Bundle Size Optimization (<500KB initial)
- **Akzeptanz:** Lighthouse >90, Bundle <500KB, 1000 Notes App lädt <2s

#### M25: **Security Audit**
- CSP Headers
- DOMPurify Integration
- HTTPS Enforcement (Docker Setup)
- Dependency Audit (`npm audit`)
- **Akzeptanz:** Keine High/Critical Vulnerabilities, CSP blockiert Inline Scripts

---

## J) RISIKOANALYSE

### Top 10 Risiken + Gegenmaßnahmen

| # | Risiko | Wahrscheinlichkeit | Impact | Gegenmaßnahme |
|---|--------|-------------------|--------|---------------|
| **R1** | **Sync-Konflikte häufiger als erwartet** (CRDT funktioniert nicht wie geplant für Properties) | HIGH | HIGH | 1) Extensive Tests mit simulierten Netzwerk-Partitions. 2) Fallback: Properties immer manuell resolven. 3) User-Feedback-Loop für Conflict-Häufigkeit. |
| **R2** | **IndexedDB Performance bei >10k Notes** (Queries werden langsam) | MEDIUM | HIGH | 1) Pagination/Virtualisierung für Listen. 2) IndexedDB Indizes tunen. 3) Fallback: SQLite WASM (V1) falls nötig. 4) Early Load Testing mit 50k Notes. |
| **R3** | **Editor-Komplexität** (Tiptap/ProseMirror hat Bugs oder ist zu schwer zu customizen) | MEDIUM | MEDIUM | 1) MVP startet mit simplem Markdown Textarea. 2) Tiptap Upgrade erst in M15. 3) Alternative: Lexical.js (Facebook). 4) Budget 2 Wochen für Editor-Prototyping. |
| **R4** | **WebDAV Inkompatibilitäten** (verschiedene Server implementieren Spec unterschiedlich) | HIGH | MEDIUM | 1) Test gegen 3 Server: Nextcloud, ownCloud, Apache mod_dav. 2) Adapter mit Quirks-Modus für bekannte Server. 3) Dokumentation: "Tested with X, Y, Z". |
| **R5** | **PWA iOS Limitations** (Safari Service Worker Bugs, Install Prompt funktioniert nicht) | HIGH | MEDIUM | 1) Explizites Testing auf iOS 16+. 2) Fallback: "Add to Home Screen" Manual. 3) Alternative: Capacitor.js Wrapper (V1). |
| **R6** | **Key Management UX** (User verliert Passphrase → Datenverlust → schlechte Reviews) | MEDIUM | HIGH | 1) Aggressive Warnings beim E2EE Setup. 2) Recovery Key prominent anzeigen. 3) Option: Escrow via Recovery Contact (V1, komplex). 4) Telemetrie: Wie viele User aktivieren E2EE? |
| **R7** | **Browser Compatibility** (Firefox/Safari haben andere IndexedDB Limits) | MEDIUM | MEDIUM | 1) BrowserStack Testing. 2) Feature Detection + Degradation. 3) Dokumentiere Mindestversionen (Chrome 100+, Firefox 110+, Safari 15+). |
| **R8** | **Scope Creep** (Feature-Requests explodieren nach Launch) | HIGH | MEDIUM | 1) Klare MVP-Scope Definition (dieses Dokument). 2) Public Roadmap (Transparenz). 3) "V1 oder später" Label für Requests. 4) Community Vote für nächste Features. |
| **R9** | **Dependency Vulnerabilities** (Critical CVE in Yjs/Tiptap) | LOW | HIGH | 1) Dependabot Alerts (GitHub). 2) Monatliches `npm audit`. 3) Pin Versions (renovate.json für kontrollierte Updates). 4) Alternative Libraries recherchiert (siehe Entscheidungslog). |
| **R10** | **Onboarding zu komplex** (User verstehen Orbit/Sync Konzept nicht) | MEDIUM | HIGH | 1) User Testing mit 5+ Nicht-Tech-Usern. 2) Interaktive Tour (M22). 3) Video-Tutorial (Post-Launch). 4) Default Orbit "Personal" ist pre-configured (Local-only, keine Setup-Fragen). |

### Zusätzliche Risiken (lower priority)

- **R11: Mobile Performance** — React Overhead auf älteren Android Phones → Mitigation: Lighthouse Testing, Code Splitting
- **R12: Attachment Sync** — Große Files (>100MB) blocken Queue → Mitigation: Separate Attachment Queue mit niedrigerer Priority
- **R13: Regulatory Compliance** — GDPR/Data Residency für Enterprise → Mitigation: Selfhosted löst das, aber Docs nötig

---

## K) DEFINITION OF DONE (MVP)

Ein MVP gilt als "Done" und launch-ready wenn **ALLE** folgenden Kriterien erfüllt sind:

### Funktionale Anforderungen

1. ✅ **Capture:** User kann Quick Note erstellen in <3 Sekunden (Ctrl+N → Type → Enter).
2. ✅ **Edit:** Note öffnen, Markdown editieren, Auto-Save funktioniert (kein manuelles Save nötig).
3. ✅ **Link:** Wikilinks `[[Title]]` erstellen, Backlinks werden angezeigt, Click navigiert.
4. ✅ **Search:** Fulltext-Suche findet Notes in <100ms bei 100 Notes, Snippet mit Highlight.
5. ✅ **Sync:** WebDAV Sync funktioniert (Push/Pull), Konflikte werden erkannt + UI zeigt Manual Resolution.
6. ✅ **Offline:** App funktioniert vollständig ohne Internet (nach initialem Load).
7. ✅ **Multi-Orbit:** User kann 3 Orbits erstellen, zwischen ihnen wechseln, Daten sind isoliert.
8. ✅ **Responsive:** App ist nutzbar auf Desktop (1920x1080), Tablet (768x1024), Mobile (375x667).
9. ✅ **PWA:** Installierbar als PWA (Add to Home Screen), Service Worker cached Assets, Offline Page funktioniert.
10. ✅ **Export:** Orbit exportieren als JSON ZIP, Import funktioniert ohne Datenverlust.

### Qualitätsanforderungen

11. ✅ **Performance:** Lighthouse Score >90 (Performance, Accessibility, Best Practices, PWA).
12. ✅ **Bundle Size:** Initial Bundle <500KB gzipped.
13. ✅ **Accessibility:** Keyboard Navigation funktioniert für alle Haupt-Features, ARIA Labels vorhanden.
14. ✅ **Security:** CSP Header gesetzt, DOMPurify sanitized User Content, HTTPS in Docker Setup.
15. ✅ **Browser Compat:** Funktioniert auf Chrome 100+, Firefox 110+, Safari 15+, Edge 100+.

### Deployment & Dokumentation

16. ✅ **Docker Deploy:** `docker-compose up` startet App + API, erreichbar auf `http://localhost:3000`.
17. ✅ **ENV Config:** `.env.example` dokumentiert alle nötigen Variablen, README hat Setup-Anleitung.
18. ✅ **API Docs:** OpenAPI/Swagger Spec für Backend Endpoints (für V1 externe Clients).
19. ✅ **User Docs:** README mit:
    - Quick Start (3 Schritte: Docker up, Open Browser, Create Orbit)
    - Sync Setup (WebDAV Config Beispiel)
    - Keyboard Shortcuts Liste
20. ✅ **Changelog:** `CHANGELOG.md` mit MVP Features gelistet.

### Testing

21. ✅ **Unit Tests:** >70% Coverage für Core Logic (Sync Manager, Data Layer).
22. ✅ **E2E Tests:** 5 kritische Flows getestet (Playwright):
    - Capture → Edit → Save → Reload → Verify
    - Create Link → Check Backlinks
    - Offline → Edit → Online → Sync → Verify Remote
    - Conflict → Manual Resolution → Verify Resolved
    - Export → Import → Verify Data Integrity
23. ✅ **Load Test:** 1000 Notes in einem Orbit, App bleibt responsive (<2s für Search).

### User Experience

24. ✅ **First Launch:** Welcome Screen zeigt Orbit-Konzept, User erstellt ersten Orbit ohne Docs lesen zu müssen.
25. ✅ **Error Handling:** Alle Error States haben User-friendly Messages (nicht: "Error 500", sondern "Sync failed, check connection").
26. ✅ **No Data Loss:** Bei Browser Crash/Force Quit sind alle seit letztem Auto-Save getippten Daten da (max 2s Verlust).

### "Launch Ready" Final Checks

27. ✅ **Dogfooding:** 3 Team-Mitglieder nutzen App 1 Woche produktiv, keine Blocker-Bugs.
28. ✅ **Security Audit:** Externe Code Review oder `npm audit` zeigt keine High/Critical.
29. ✅ **License:** Open Source Lizenz gewählt (z.B. MIT oder AGPL-3.0), in Repo dokumentiert.
30. ✅ **Feedback Channel:** GitHub Issues Template, Discord/Forum Link in App (für Early Adopters).

---

## TECH-ENTSCHEIDUNGEN (Zusammenfassung)

### Frontend: **React 18 + Vite**
- **Begründung:**
  - React Ecosystem für Editor-Libraries (Tiptap hat React Bindings)
  - Vite: Schnellster Build-Tool, HMR <50ms
  - PWA Plugin (vite-plugin-pwa) ist mature
- **Alternative:** SvelteKit (kleinere Bundle, aber weniger Editor-Libraries)

### Editor: **Tiptap (ProseMirror Wrapper)**
- **Begründung:**
  - ProseMirror ist Industry Standard für kollaborative Editoren
  - Tiptap abstrahiert Komplexität, gute Docs
  - Yjs Integration out-of-the-box
- **Alternative:** Lexical.js (Facebook, aber weniger mature)

### Storage Local: **Dexie.js (IndexedDB)**
- **Begründung:**
  - Robuste Abstraktion über IndexedDB
  - Indizes, Compound Keys, Transactions
  - Observable Queries (Live-Updates für UI)
- **Alternative:** SQLite WASM (besser für komplexe Queries, aber 800KB Overhead; V1 Option)

### Sync: **Yjs (CRDT) für Block Content + Manual Merge für Properties**
- **Begründung:**
  - CRDT für Text ist Goldstandard
  - Properties brauchen User-Entscheidungen (keine automatische Konfliktauflösung sinnvoll)
- **Alternative:** Automerge (reines CRDT auch für Structs, aber größere Payloads)

### Backend: **Node.js (TypeScript) + Fastify**
- **Begründung:**
  - Shared Types mit Frontend
  - Fastify ist schnellst mögliches Node-Framework (2x schneller als Express)
  - Gutes Plugin-Ecosystem
- **Alternative:** Go (schneller, aber separate Types; Deno (moderne Runtime, aber weniger Libraries)

### State Management: **Zustand**
- **Begründung:**
  - Minimal Boilerplate (vs Redux)
  - React 18 Concurrent Mode compatible
  - Persistence Middleware für Orbit Config
- **Alternative:** Jotai (ähnlich, aber Zustand hat mehr Momentum)

### Deployment: **Docker Compose**
- **Begründung:**
  - Einfachstes Multi-Container Setup
  - Kein Kubernetes-Overhead für Single-Server Deployments
  - Portabilität (läuft auf jedem Docker Host)

---

## NEXT STEPS

1. **Review dieser Spec** mit Team/Stakeholder
2. **Prototyping:** M1-M3 (2 Wochen?) für Technical Validation
3. **Design Mockups:** Figma Designs für 4 UI Areas (parallel zu M1-M3)
4. **Repo Setup:** Turborepo + CI/CD
5. **Sprint Planning:** M4-M7 als erster Sprint

---

**END OF ARCHITECTURE DOCUMENT**

**Fragen/Unklarheiten?** Alle ANNAHMEN sind markiert und können challenged werden.

**Trade-offs transparent gemacht?** Ja (siehe Entscheidungs-Begründungen).

**Baubar?** Ja, mit klarem MVP Scope und Risiko-Mitigation.

**Visionär aber realistisch?** Das ist der Anspruch. 🚀
