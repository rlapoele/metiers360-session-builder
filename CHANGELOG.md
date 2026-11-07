# Changelog

## [1.1.0] - Unreleased

### Added

- Grouped métier and video-title keyword suggestions, retaining names and the selected job appellation, with up to five suggestions and ten selected métier/title criteria.
- Contextual option availability: choices without matching videos are disabled while selected criteria remain removable.
- Catalogue and deterministic keyword dictionary preparation at Astro startup, cached for the process lifetime, with bounded retries, visible loading/error states and manual recovery.

### Changed

- Search updates automatically when criteria are selected or removed, replacing the search button. Criteria and pagination remain restorable through URLs, reloads and browser history.
- Search controls follow Public → Métiers ou mots-clés → Casque VR, with shared icon chips and ellipsized labels across mobile, tablet and desktop.
- All multi-métier URLs, including existing links, now combine jobs with **OR** instead of AND. Every title keyword, legacy `q`, public and headset condition still combines with **AND**.
- Refreshed the README and desktop, tablet and mobile screenshots.

The supplied mock API, catalogue and dependencies are unchanged. The documented open-popup accessibility limitations remain deferred under the accepted Checkpoint H scope; see [the verification report](docs/search-verification.md#checkpoint-h-acceptance-2026-11-07).

## [1.0.1] - 2026-10-25

### Changed

- Clarified the README's interface rationale, personal contribution, attention estimate and possible follow-up work; corrected its French spelling, grammar and typography.
- Added the application version to the root package manifest and lockfile.

Application behavior and dependencies are unchanged from v1.0.0.

## [1.0.0] - 2026-10-25

### Added

- Initial verified session-builder demonstration: catalogue discovery, a persistent ordered draft, session saving and read-only saved-session review.
- Public Railway web demonstration with a private mock API and documented verification limits.
