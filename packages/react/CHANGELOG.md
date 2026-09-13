# Change log for: @freesewing/react


## 4.10.1 (2026-08-16)

### Added

 - Support sorting measurements from top to bottom (#904)

## 4.10.0 (2026-06-19)

### Fixed

 - Replace non-existing yaml.parse with yaml.load in Import component
 - Change bookmark URL parsing RegExp to use new UUID format
 - Linedrawings of Simon, Simone, Hugo, Shale, Hannah

## 4.9.0 (2026-05-25)

### Fixed

 - Fix uuid in CuratedSet component

## 4.8.0 (2026-04-18)

### Added

 - Implement measurement set import and redirect old import page

## 4.7.0 (2026-03-27)

### Added

 - Added new backend context to allow setting a custom backed URL
 - Allow custom key/val for clipboard copy in KeyVal component
 - Add support for codeberg in user profile data
 - Export backend URL from useBackend hook

### Changed

 - Updated Bookmark component to UUID changes
 - Updated Pattern component to UUID changes
 - Updated Patterns component to UUID changes
 - Updated PublicPattern component to UUID changes
 - Updated Profile component to UUID changes
 - Updated Set component to UUID changes
 - Updated Sets component to UUID changes
 - Update SignIn compnent to the new sign in flow
 - Update SignUp compnent to the new sign up flow
 - Updated UUID component
 - Make backend URL configurable in the useBackend hook
 - Drop support for github/twitch/tiktok/instagram in user profile data
 - Update measurements picker to UUIDs
 - Tweak language of signin/signup components

### Fixed

 - Fixed incorrect status code check in the SignUp component
 - Updated seenUser on username change
 - Set spacing on avatar upload button in welcome view

## 4.6.0 (2026-03-08)

### Fixed

 - Ensure PublicPattern component is available as an export
 - Ensure the flag title is translated before placeholders are replaced
 - Fix links in the DraftErrorHandler component
 - Fix translations in flag menu

## 4.5.0 (2026-02-21)

### Added

 - Added the 'useDesignTranslation' and 'useDesignOptionTranslation' hooks (#737)
 - Added the PublicPattern component

### Changed

 - Hide JSON and YAML pattern links for non-public patterns

### Fixed

 - Do not order menu options by the `menu` prop, as that can be a function

## 4.4.3 (2025-11-29)

### Fixed

 - Add missing @freesewing/bonny dependency

## 4.4.1 (2025-11-29)

### Added

 - Added linedrawing for Sarah
 - Improved absolute option selection (#657)

## 4.3.0 (2025-09-26)

### Added

 - Added LineDrawing for octoplushy, otis, penelope, and waralee (#553)
 - Added new components to support the new user showcase page (#556)

### Fixed

 - Handle inconcistent SA icon state after SA reset (#540)
 - Fix inherited translations in the flags menu
 - Preserve metadata in measurement settings within the editor state update

## 4.2.0 (2025-08-16)

### Fixed

 - Preserve pattern metadata when resetting the editor

## 4.1.0 (2025-06-29)

### Added

 - Added ARCH D and ARCH E paper sizes to export
 - Added ability to unfreeze an account in the in Admin component

### Fixed

 - Fix Pattern Layout counter-clockwise button (#453)
 - Fixed issue with custom pattern layout not getting applied (#241)
 - Fixed crash in pattern layout view (#340)
 - Show snapped value for snapped percentage options with toAbs() set

## 4.0.1 (2025-06-09)

### Added

 - Add inline help to the Editor
 - Added new useFilter hook

### Changed

 - Changed maximum value for margin between parts to 3 cm
 - Improvements to the Editor inspect view
 - PDF cover pages improvements in Editor
 - Change imperial step to 1/16 inch
 - Replace the flag number with a colored badge
 - Migrated from helpProvider to Help components in the Editor

### Fixed

 - Fixed issues with the pattern export feature in the Editor (#218)
 - Added Jane to the Linedrawing component (#211)
 - Do not apply null layout in the editor (#219)
 - Fixed Editor to force the measurements view when measurements are missing
 - Seam allowance slider (#210)
 - Fix issues with pattern export (#218)
 - When sampling options, also test different settings for sa, paperless, and complete (#225)
 - Do not rely on initial settings in the Editor
 - Fixed issue with translations (#244)
 - Fix weird slider behaviour when entering the default value ()#246)
 - Fix the inspect view popup when clicking on a path or point, fix missing translations in the xray path and point components (#256)
 - Fix pattern reset button (#258)
 - Fix deselecting included parts (#259)
 - Fix sampleMeasurement button
 - Fix button state for boolean core options (#229)
 - Respect user account units in the editor
 - Fixes to the Editor header
 - Always add bounding box in tiler plugin (#273)
 - Escape user-provided text in SVG (#260)
 - Pattern layout print settings UI fixes (#351)
 - Allow bookmark title to be edited
 - Fix Collection background image URL
 - Ignore pointer events on tooltip text of Xray point component
 - Add URL formats to Bookmarked Set picker
 - Improve resilience of Editor sample menu when translations are missing
 - Change the expand icon to have the arrows point inwards if expand is disabled
 - Gracefully fail the Editor when a part translation is not available

## 4.0.0 (2025-04-01)

### Added

 - The `@freesewing/react` package holds shared components, hooks, and context for our React-based frontends

## 3.0.0 (2023-09-30)

### Changed

 - All FreeSewing packages are now ESM only.
 - All FreeSewing packages now use named exports.
 - Dropped support for NodeJS 14. NodeJS 18 (LTS/hydrogen) or more recent is now required.


This is the **initial release**, and the start of this change log.

> Prior to version 2, FreeSewing was not a JavaScript project.
> As such, that history is out of scope for this change log.

