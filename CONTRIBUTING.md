# Contributing to OwnServer Manager

🎮 Thank you for your interest in contributing to OwnServer Manager! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Release Process](#release-process)

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please be respectful and constructive in all interactions.

## 🚀 Getting Started

### Before You Start

1. **Check existing issues** - Look for existing issues or feature requests
2. **Create an issue** - If none exists, create one to discuss your proposal
3. **Get feedback** - Wait for maintainer feedback before starting work
4. **Fork the repository** - Create your own fork to work in

### Types of Contributions

We welcome several types of contributions:

- 🐛 **Bug fixes** - Fix existing functionality issues
- ✨ **New features** - Add new functionality (discuss first)
- 📚 **Documentation** - Improve docs, guides, and examples
- 🧪 **Tests** - Add or improve test coverage
- 🔧 **Infrastructure** - CI/CD, Docker, deployment improvements
- 🌐 **Translations** - Localization support (future)

## 💻 Development Setup

### Prerequisites

- **Node.js** 18+ 
- **Docker** with Docker Compose
- **Git**
- **Ubuntu** (for full testing) or compatible Linux distribution

### Initial Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/ownserver-manager.git
cd ownserver-manager

# Install dependencies
npm install

# Copy and configure environment files
cp config/production.env config/development.env
cp config/config.json.example config/config.json

# Create necessary directories
mkdir -p minecraft-servers logs backups

# Build development Docker image
docker compose build

# Start development environment
docker compose up -d

# Verify setup
npm run test
```

### Development Environment

```bash
# Start development container
docker compose up -d

# Access development shell
docker compose exec ownserver-manager bash

# Run CLI commands for testing
npm run cli status
npm run cli health
```

## 🔄 Making Changes

### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `test/description` - Test improvements
- `chore/description` - Maintenance tasks

Example: `feature/multi-server-support` or `fix/cloudflare-connection-timeout`

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or modifying tests
- `chore` - Maintenance tasks

Examples:
```
feat(minecraft): add support for Forge server management

fix(cloudflare): handle DNS API timeout errors properly

docs(deployment): update Ubuntu Server installation guide

test(cli): add comprehensive CLI command testing
```

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm run test
   npm run test:integration
   ./scripts/health-check.sh
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): description of changes"
   ```

5. **Push and create pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

## 🧪 Testing

### Test Requirements

All contributions must include appropriate tests:

- **Unit tests** for new functions/classes
- **Integration tests** for system interactions
- **Documentation updates** for public API changes

### Running Tests

```bash
# All tests
npm run test

# Specific test suites
npm run test:minecraft
npm run test:cloudflare
npm run test:integration

# CLI functionality tests
./test-alpha-1.0.0-features.sh

# Health check validation
./scripts/health-check.sh
```

### Test Structure

```
tests/
├── minecraft/          # Minecraft server management tests
├── cloudflare/         # CloudFlare integration tests  
├── integration/        # End-to-end integration tests
├── cli/               # CLI command tests
└── fixtures/          # Test data and fixtures
```

### Writing Tests

Example test structure:

```javascript
const { expect } = require('chai');
const YourModule = require('../src/modules/YourModule');

describe('YourModule', () => {
  let module;

  beforeEach(() => {
    module = new YourModule();
  });

  afterEach(async () => {
    await module.cleanup();
  });

  describe('yourMethod', () => {
    it('should handle normal operation', async () => {
      const result = await module.yourMethod('test');
      expect(result).to.be.an('object');
      expect(result.success).to.be.true;
    });

    it('should handle error conditions', async () => {
      try {
        await module.yourMethod(null);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid input');
      }
    });
  });
});
```

## 📝 Submitting Changes

### Pull Request Process

1. **Update documentation** - Include relevant doc updates
2. **Add/update tests** - Ensure test coverage for changes
3. **Test thoroughly** - Run full test suite
4. **Create pull request** - Use the PR template
5. **Respond to feedback** - Address review comments promptly

### Pull Request Template

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix/feature causing existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Health check script passes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] Changelog updated (if needed)
```

### Review Process

1. **Automated checks** - CI/CD pipeline runs tests
2. **Code review** - Maintainer reviews code quality
3. **Testing** - Functionality testing in various environments
4. **Approval** - Maintainer approval required for merge
5. **Merge** - Squash and merge into main branch

## 📏 Coding Standards

### JavaScript/Node.js

- **ES6+** features where appropriate
- **Async/await** for asynchronous operations
- **Error handling** with try/catch blocks
- **JSDoc comments** for public methods
- **Consistent naming** using camelCase

### File Organization

```
src/
├── index.js           # Main entry point
├── managers/          # Core business logic managers
├── modules/           # Reusable functionality modules
├── utils/             # Utility functions
├── commands/          # CLI command implementations
└── types/             # Type definitions (future)
```

### Error Handling

```javascript
// Proper error handling pattern
async function exampleFunction() {
  try {
    const result = await riskyOperation();
    return { success: true, data: result };
  } catch (error) {
    logger.error('Operation failed', { error: error.message, stack: error.stack });
    throw new Error(`Failed to complete operation: ${error.message}`);
  }
}
```

### Logging Standards

```javascript
// Use structured logging
logger.info('Server started', { 
  port: 25565, 
  version: '1.21.5', 
  type: 'paper' 
});

logger.error('Connection failed', { 
  error: error.message, 
  endpoint: 'cloudflare.com',
  retryCount: 3 
});
```

## 🚀 Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions  
- **PATCH** version for backwards-compatible bug fixes
- **Pre-release** identifiers (alpha, beta, rc) for development versions

Examples:
- `1.0.0-alpha.1` - Initial alpha release
- `1.0.0-beta.1` - First beta version
- `1.0.0` - First stable release
- `1.1.0` - Minor feature addition
- `1.1.1` - Bug fix release

### Release Checklist

For maintainers preparing releases:

1. **Update version** in `package.json`
2. **Update changelog** with release notes
3. **Run full test suite** and validation
4. **Update documentation** for any changes
5. **Create release tag** and GitHub release
6. **Build and test** Docker images
7. **Update installation scripts** if needed

## ❓ Questions and Support

### Getting Help

- **GitHub Issues** - For bugs and feature requests
- **GitHub Discussions** - For questions and general discussion
- **Documentation** - Check existing docs first
- **Discord** - Community chat (link in README)

### Maintainer Contact

- **Primary Maintainer**: Kodai Kita
- **Response Time**: Typically within 48 hours
- **Availability**: GMT+9 timezone preferred

## 📚 Additional Resources

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)

---

Thank you for contributing to OwnServer Manager! Your contributions help make Minecraft server management easier for everyone. 🎮✨
