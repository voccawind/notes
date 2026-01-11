# Contributing to ORBIT Notes

Thank you for your interest in contributing to ORBIT Notes! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful, constructive, and professional. We're building this together.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/orbit.git`
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b feature/your-feature-name`
5. Make your changes
6. Test your changes: `pnpm test`
7. Commit: `git commit -m "feat: your feature description"`
8. Push: `git push origin feature/your-feature-name`
9. Open a Pull Request

## Development Workflow

### Running the app

```bash
# Start all services in development mode
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Lint
pnpm lint

# Format code
pnpm format
```

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Build process or auxiliary tool changes

### Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update the CHANGELOG (if applicable)
5. Request review from maintainers

## Architecture Decisions

Before making major architectural changes:

1. Open an issue describing the problem and proposed solution
2. Discuss with maintainers
3. Get approval before starting work

## Testing

- Write unit tests for new functionality
- Ensure tests are meaningful and maintainable
- Aim for >70% coverage on core logic
- E2E tests for critical user flows

## Documentation

- Update README for user-facing changes
- Update API docs for API changes
- Add JSDoc comments for public APIs
- Keep the architecture docs in sync

## Questions?

Open an issue or join our Discord: https://discord.gg/orbit-notes
