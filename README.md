# ORBIT Notes

> A revolutionary local-first notes app combining the best of Obsidian, Notion, Superlist, and UpNote.

[![CI](https://github.com/orbit-notes/orbit/workflows/CI/badge.svg)](https://github.com/orbit-notes/orbit/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Vision

ORBIT Notes is designed from the ground up as **ONE cohesive system** that unifies:

- **Obsidian's** powerful linking and local-first architecture
- **Notion's** flexible blocks and database capabilities
- **Superlist's** task management and speed
- **UpNote's** beautiful, simple interface

### Core Principles

- 🏠 **Local-First**: Works completely offline. Sync is transport, not source of truth
- 🔗 **Linking > Hierarchy**: Connections between ideas are first-class citizens
- ⚡ **Performance**: Search <50ms, open note <100ms, resolve conflicts <1s
- 🔒 **Privacy by Architecture**: Optional E2EE, self-hosted by default
- 📤 **Data Portability**: Full Markdown export, no lock-in
- ⌨️ **Keyboard-First**: Every action has a shortcut (but touch-friendly too)

## Features

### MVP (Current Development)

- ✅ **Rich Text Editor**: Markdown + blocks hybrid (powered by Tiptap/ProseMirror)
- ✅ **Linking System**: `[[wiki-links]]`, automatic backlinks, mini-graph
- ✅ **Task Management**: Extract tasks from notes, unified task view
- ✅ **Full-Text Search**: Fuzzy finder with <50ms response time
- ✅ **Offline-First Sync**: CRDT-based (Yjs) with WebDAV support
- ✅ **Self-Hosted**: One-command Docker Compose deployment
- ✅ **PWA**: Install on any device, works offline

### V1 (Planned)

- 🔄 **Database Collections**: Notion-like views (table, board, calendar)
- 🔐 **End-to-End Encryption**: Optional per-workspace with key management
- 🌐 **Multiple Sync Providers**: S3, Google Drive, Dropbox
- 📋 **Templates & Properties**: Structured content with custom fields
- 🔌 **Web Clipper**: Browser extension for capturing content
- 📊 **Advanced Graph View**: Interactive knowledge graph

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORBIT Workspace                          │
├───┬────────────────────────────────────────────────────────┬────┤
│ O │                                                        │ F  │
│ R │                    CANVAS                              │ O  │
│ B │              (Notes / Cards / Graph)                   │ C  │
│ I │                                                        │ U  │
│ T │                                                        │ S  │
│   │                                                        │    │
│ B │                                                        │ R  │
│ A │                                                        │ A  │
│ R │                                                        │ I  │
│   │                                                        │ L  │
├───┴────────────────────────────────────────────────────────┴────┤
│             COMMAND DOCK (Capture/Jump/Compose/Sync)            │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Editor**: Tiptap (ProseMirror)
- **Local Storage**: IndexedDB (via Dexie)
- **Sync**: Yjs (CRDT) + pluggable providers
- **Backend**: Fastify (Node.js)
- **Deployment**: Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker (optional, for self-hosting)

### Development

```bash
# Clone the repository
git clone https://github.com/orbit-notes/orbit.git
cd orbit

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start development servers
pnpm dev

# Open http://localhost:5173 for web app
# API runs on http://localhost:4000
```

### Self-Hosting (Production)

```bash
# Quick start with Docker Compose
git clone https://github.com/orbit-notes/orbit.git
cd orbit/docker

# Configure environment
cp ../.env.example .env
# Edit .env and set JWT_SECRET (use: openssl rand -base64 32)

# Start services
docker-compose up -d

# Access at http://localhost:80
```

### Building from Source

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Lint & format
pnpm lint
pnpm format
```

## Project Structure

```
orbit-notes/
├── apps/
│   ├── web/                    # PWA (React + Vite)
│   └── server/                 # Backend API (Fastify)
├── packages/
│   ├── shared-types/           # Common TypeScript types
│   ├── sync-engine/            # Yjs + sync providers
│   ├── crypto/                 # E2EE utilities
│   └── markdown-parser/        # Markdown ↔ Blocks
├── docker/                     # Docker configurations
├── docs/                       # Documentation
└── tools/                      # Scripts & utilities
```

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) - System design and technical decisions
- [Self-Hosting Guide](docs/SELFHOSTING.md) - Deployment and configuration
- [API Documentation](docs/API.md) - Backend API reference
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Development Roadmap](docs/ROADMAP.md) - Feature timeline

## Roadmap

### Phase 1: Foundation (Current)
- [x] M1: Project setup & monorepo
- [ ] M2: Data model & local storage
- [ ] M3: Editor integration
- [ ] M4: Layout & UI shell
- [ ] M5: Capture flow
- [ ] M6: Search

### Phase 2: Linking & Tasks
- [ ] M7: Linking system
- [ ] M8: Task extraction
- [ ] M9: Tags & properties

### Phase 3: Sync
- [ ] M10: Sync engine (local-only)
- [ ] M11: WebDAV provider
- [ ] M12: Sync UI

### Phase 4: Launch
- [ ] M13: PWA manifest
- [ ] M14: Performance optimization
- [ ] M15: Self-hosted backend
- [ ] M16: Import/Export

See [ROADMAP.md](docs/ROADMAP.md) for detailed milestones.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Security

- **Vulnerability Reports**: Please email security@orbitnotes.app
- **E2EE**: Optional end-to-end encryption with user-controlled keys
- **Self-Hosted**: Full control over your data
- **No Analytics**: We don't track you (opt-in only for self-hosted error reporting)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Inspired by and built upon the shoulders of giants:

- [Obsidian](https://obsidian.md) - Local-first knowledge management
- [Notion](https://notion.so) - Flexible blocks and databases
- [Superlist](https://superlist.com) - Fast, beautiful task management
- [UpNote](https://upnote.com) - Simplicity and elegance
- [Yjs](https://yjs.dev) - CRDT library for conflict-free sync
- [ProseMirror](https://prosemirror.net) - Robust editor framework

## Community

- [Discord](https://discord.gg/orbit-notes) - Chat with the community
- [GitHub Discussions](https://github.com/orbit-notes/orbit/discussions) - Feature requests & ideas
- [Twitter](https://twitter.com/orbit_notes) - Updates and announcements

---

**Built with ❤️ for people who think in connections, not folders.**
