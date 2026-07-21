import { Design, mergeI18n } from '@freesewing/core'
import { i18n as brianI18n } from '@freesewing/brian'
import { i18n as toniI18n } from '../i18n/index.mjs'
import { front } from './front.mjs'
import { back } from './back.mjs'
import { base } from './base.mjs'
import { sleeve, sleeveMenuEnabled, sleeveMenuEnabledAdvanced } from './sleeve.mjs'
import {
  buildOutlinePaths,
  buildSaPaths,
  armholeLength,
  armholeToArmholePitch,
  verticalSplit,
  createSideSeam,
  addText,
  measureSideSeam,
  drawHelpLine,
} from './utils.mjs'

import about from '../about.json' with { type: 'json' }
import { waistband } from './waistband.mjs'
import { cuff } from './cuff.mjs'

// Setup our new design
const Toni = new Design({
  data: about,
  parts: [front, back, base, sleeve, cuff, waistband],
})

// Merge translations
const i18n = mergeI18n([brianI18n, toniI18n], {
  o: { drop: ['cuffEase', 'lengthBonus', 'collarEase', 'shoulderEase'] },
})

// Named exports
export {
  front,
  back,
  base,
  sleeve,
  cuff,
  waistband,
  sleeveMenuEnabled,
  sleeveMenuEnabledAdvanced,
  buildOutlinePaths,
  buildSaPaths,
  armholeLength,
  armholeToArmholePitch,
  verticalSplit,
  createSideSeam,
  measureSideSeam,
  drawHelpLine,
  addText,
  Toni,
  i18n,
  about,
}
