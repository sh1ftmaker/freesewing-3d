import { control, controlDesc } from './control.mjs'
import { logoPath } from './logo.mjs'
import {
  measurements,
  topToBottomMeasurements,
  degreeMeasurements,
  isDegreeMeasurement,
} from './measurements.mjs'
import { sewingTechniques } from './sewing.mjs'
import { roles, uiRoles } from './roles.mjs'
import { urls, relPath } from './urls.mjs'
import { apikeyLevels } from './apikeys.mjs'
import { domains } from './domains.mjs'

/*
 * This top-level file bundles all (named) exports for the config package
 */
export {
  apikeyLevels,
  control,
  controlDesc,
  domains,
  logoPath,
  measurements,
  degreeMeasurements,
  isDegreeMeasurement,
  sewingTechniques,
  roles,
  topToBottomMeasurements,
  uiRoles,
  urls,
  relPath,
}
