# Change log for: @freesewing/backend


## 4.10.1 (2026-08-16)

### Added

 - Added OIDC route for chat client (matrix)
 - Added OIDC route for meet client (jitsi)
 - Added endpoint for generating Jitsi tokens

## 4.10.0 (2026-06-19)

### Added

 - Added authors endpoint

## 4.9.0 (2026-05-25)

### Added

 - Added OIDC client for Morio
 - Added OIDC client for SemaphoreUI

### Changed

 - Include role in OIDC claims
 - Limit privileged OIDC clients to specific roles

## 4.8.0 (2026-04-18)

### Added

 - Added support for support, morio, and supermorio OIDC clients

### Changed

 - Limit support OIDC client to support role
 - Allow support role to impersonate users
 - Pass OIDC client ID to frontend

### Fixed

 - pkce.required needs to be a function

## 4.7.0 (2026-03-27)

### Added

 - Implemented rate-limiting
 - Added database schema to the repository
 - Added notifications domain to config

### Changed

 - Refactored the OIDC flow code
 - Removed the profile find endpoint
 - Removed the optionPack code
 - Updated email templates
 - Migrated transactional email from AWS to Scaleway
 - Migrated image hosting from Cloudflare to self-hosting fronted by Bunny CDN
 - Ported API key implementation to UUIDs
 - Ported Pattern implementation to UUIDs
 - Ported Bookmark implementation to UUIDs
 - Ported Set implementation to UUIDs
 - Ported User implementation to UUIDs
 - Ported CureatedSet implementation to UUIDs
 - Ported flow endpoints to UUIDs
 - Ported subscriber endpoints to UUIDs
 - Disabled anonymous image uploads
 - Allow login with UUID
 - Remove support for login with ID
 - Keep check and confirmation ID seperate in URL/body of email
 - Remove img field from Set data

### Fixed

 - Added config for reverse proxy setups
 - Typo in config lookup for max api key expiry
 - Await email sending
 - Detection logic for admin user in API keys
 - Adapt OIDC flow to UUID changes

## 4.6.0 (2026-03-08)

### Changed

 - Removed user card endpoint
 - Removed all code unit test code paths
 - Remove anonymous user profile access
 - Remove unused flow routed
 - Remove Prisma dependency, refactor to use NodeJS native SQLite bindings (#765)
 - Run backend in container image freesewing/backend (#765)

### Fixed

 - Sanitize usernames in SVG output | Reported by Alen Sarang
 - Enforce authenticated user ID check in account data endpoint, prevent cross-account data access | Reported by Alen Sarang
 - Removed an admin signup bug that abused unit test code paths to create admin accounts | Reported by Alen Sarang
 - Limit data returned from account endpoint | Reported by Alen Sarang
 - Handle various time formats in OIDC provider

## 4.0.1 (2025-06-09)

### Fixed

 - Newsletter unsubscribe links lead to 404

## 3.0.0 (2023-09-30)

### Changed

 - All FreeSewing packages are now ESM only.
 - All FreeSewing packages now use named exports.
 - Dropped support for NodeJS 14. NodeJS 18 (LTS/hydrogen) or more recent is now required.

## 2.20.5 (2022-02-17)

### Fixed

 - Mitigate risk of denial-of-service attacks in catch-all route


This is the **initial release**, and the start of this change log.

> Prior to version 2, FreeSewing was not a JavaScript project.
> As such, that history is out of scope for this change log.

