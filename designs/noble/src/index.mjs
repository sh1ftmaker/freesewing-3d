import { Design } from '@freesewing/core'
import about from '../about.json' with { type: 'json' }
import { i18n } from '../i18n/index.mjs'
import { backPoints } from './backpoints.mjs'
import { backInside } from './backinside.mjs'
import { backOutside } from './backoutside.mjs'
import { frontPoints } from './frontpoints.mjs'
import { frontInside } from './frontinside.mjs'
import { frontOutside } from './frontoutside.mjs'
import { sleeve } from './sleeve.mjs'

// Setup our new design
const Noble = new Design({
  data: about,
  parts: [backPoints, backInside, backOutside, frontPoints, frontInside, frontOutside, sleeve],
})

// Named exports
export {
  backPoints,
  backInside,
  backOutside,
  frontPoints,
  frontInside,
  frontOutside,
  sleeve,
  Noble,
  i18n,
  about,
}
