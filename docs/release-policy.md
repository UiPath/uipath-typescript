# Release Policy

The UiPath TypeScript SDK is under rapid development, following semantic versioning in the format of **X.Y.Z**:

- **X** (major version): X = 1
- **Y** (minor version) increases indicate breaking changes for public interfaces not marked as beta
- **Z** (patch version) increases indicate:
    - Bug fixes
    - New features
    - Changes to private interfaces
    - Changes to beta features

### Version Number Format

The version format is `X.Y.Z` where:

- X = 1 (e.g., 1.0.0, 1.1.0)
- Y represents the minor version
- Z represents the patch version

### Release Candidates

From time to time, we will version packages as release candidates. These are versions that are intended to be released as stable versions, but we want to get feedback from the community before doing so.

Release candidates are versioned as `X.Y.ZrcN`. For example:
- `1.2.0rc1`

If no issues are found, the release candidate will be released as a stable version with the same version number. If issues are found, we will release a new release candidate with an incremented N value (e.g., `1.2.0rc2`).

When upgrading between minor versions, users should review the list of breaking changes and deprecations.

## Release Cadence

### Minor Releases (X.Y.0)

- Released as needed based on feature development and breaking changes
- Include breaking changes for public interfaces not marked as beta
- Require a migration guide for users
- Preceded by a release candidate (RC) phase

### Patch Releases (X.Y.Z)

- Released as needed based on bug fixes and improvements
- Include bug fixes, new features, and changes to private interfaces
- Always maintain backward compatibility for public interfaces

## API Stability

### Public API
The following components are considered part of the public API:

- All classes and methods in the `src` directory
- CLI commands and their interfaces

## Breaking Changes

Breaking changes are introduced in minor releases (X.Y.0) and follow these guidelines:

1. **Deprecation Period**: Features marked for removal will be deprecated for at least one minor release cycle
2. **Migration Path**: Breaking changes must provide a clear migration path
3. **Documentation**: All breaking changes must be documented in the release notes and migration guide
4. **Beta Features**: Breaking changes to beta features can occur in patch releases

## Deprecation Policy

1. **Announcement**: Features to be deprecated will be announced in release notes
2. **Warning Period**: Deprecated features will trigger warnings when used
3. **Removal**: Deprecated features will be removed in the next major release

## Release Process

1. **Development**:
    - Features and fixes are developed in feature branches
    - All changes require tests and documentation
    - Code must pass all CI checks

2. **Release Candidate**:
    - Minor releases include an RC phase
    - RCs are versioned as `X.Y.ZrcN`
    - Community feedback is collected during RC phase

3. **Release**:
    - Version number is updated in `package.json`
    - Release notes are prepared
    - Package is published to npm
    - Documentation is updated

## Support Policy

- Current major version: Full support
- Previous major version: Security fixes only
- Older versions: No official support

## Dependencies

The SDK maintains compatibility with:

- Node.js 18+
- Key dependencies as specified in `package.json`
- Regular updates to dependencies are performed in minor releases

## Documentation

- All public APIs must be documented
- Documentation follows TypeScript standard JSDoc format
- Examples and usage guides are provided for new features
- Breaking changes are clearly documented in migration guides