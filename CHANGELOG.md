# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.8] - 2025-11-25

### Changed

- Switched Pulumi frontend build to `npm ci` for reproducible installs and deterministic caching
- Added sha-based triggers that watch key source, asset, and config files (including `public/`, Vite/tailwind configs, `.npmrc`, and tsconfig variants) so rebuilds only run when inputs change

### Documentation

- Updated usage instructions for LLM_DEFAULT_MODEL
- Updated README Quick Start section

## [0.2.7] - 2025-11-19

### Documentation

- Refreshed setup guide and README links to reflect the latest CLI workflow

## [0.2.6] - 2025-11-17

### Fixed

- Hardened application startup scripts to better support pre-bundled images

## [0.2.5] - 2025-11-12

### Fixed

- Corrected issue with uniqueness in OAuth provider identities
- Fixed issue with overriding SQLite file during write operation

## [0.2.2] - 2025-10-21

### Fixed

- Corrected issue with uniqueness in OAuth provider identities

## [0.2.1] - 2025-10-21

### Added

- Improved table paddings
- Display file preview size relative to actual size
- Added file upload indication
- Added additional session invalidation logic
- Implemented suggested prompts when KB/files are selected
- Added validation messages to KB/chat actions
- Switched message retrieval to SSE (server-sent events) instead of polling
- Updated app navigation to highlight the active page correctly
- Visual updates for links and knowledge bases
- Upgraded DataRobot integration to use Core

### Fixed

- Fixed markdown response rendering for 4o mini and added animation
- Disabled “Create KB” button when required fields are missing
- Fixed fast refresh issues and updated exports
- Fixed button text alignment and consistency
- Fixed table paddings

## [0.2.0] - 2025-09-25

### Added

- Initial release of Talk to My Docs.
- Storing uploaded files in persistent storage. Files will not be lost between container restarts.
- User sees only own chats.
- Added support of DB migrations with [Alembic](https://alembic.sqlalchemy.org/en/latest/).
