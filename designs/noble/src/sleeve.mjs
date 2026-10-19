import { pctBasedOn } from '@freesewing/core'
import { sleeve as libSleeve } from '@freesewing/library'
import { frontOutside } from './frontoutside.mjs'
import { backOutside } from './backoutside.mjs'

const sleeveMenuEnabled =
  (menu = 'style') =>
  (settings, mergedOptions) =>
    mergedOptions?.nobleSleeve ? menu : false

export const sleeve = {
  name: 'noble.sleeve',
  after: [frontOutside, backOutside],
  measurements: ['biceps', 'shoulderToWrist', 'wrist'],
  options: {
    nobleSleeve: {
      bool: true,
      menu: 'armhole',
    },
    // Library sleevecap options
    libraryFitSleeve: true,
    bicepsEase: { pct: 15, min: 0, max: 50, ...pctBasedOn('biceps'), menu: 'fit' },
    cuffEase: { pct: 20, min: 0, max: 200, ...pctBasedOn('wrist'), menu: 'fit' },
    legacyArmholeDepth: false,
    sleevecapEase: {
      ...libSleeve.options.sleevecapEase,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapTopFactorX: {
      ...libSleeve.options.sleevecapTopFactorX,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapTopFactorY: {
      ...libSleeve.options.sleevecapTopFactorY,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapBackFactorX: {
      ...libSleeve.options.sleevecapBackFactorX,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapBackFactorY: {
      ...libSleeve.options.sleevecapBackFactorY,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapFrontFactorX: {
      ...libSleeve.options.sleevecapFrontFactorX,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapFrontFactorY: {
      ...libSleeve.options.sleevecapFrontFactorY,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapQ1Offset: {
      ...libSleeve.options.sleevecapQ1Offset,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapQ2Offset: {
      ...libSleeve.options.sleevecapQ2Offset,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapQ3Offset: {
      ...libSleeve.options.sleevecapQ3Offset,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapQ4Offset: {
      ...libSleeve.options.sleevecapQ4Offset,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapQ1Spread1: {
      ...libSleeve.options.sleevecapQ1Spread1,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapQ1Spread2: {
      ...libSleeve.options.sleevecapQ1Spread2,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapQ2Spread1: {
      ...libSleeve.options.sleevecapQ2Spread1,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapQ2Spread2: {
      ...libSleeve.options.sleevecapQ2Spread2,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapQ3Spread1: {
      ...libSleeve.options.sleevecapQ3Spread1,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapQ3Spread2: {
      ...libSleeve.options.sleevecapQ3Spread2,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapQ4Spread1: {
      ...libSleeve.options.sleevecapQ4Spread1,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleevecapQ4Spread2: {
      ...libSleeve.options.sleevecapQ4Spread2,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleeveWidthGuarantee: {
      ...libSleeve.options.sleeveWidthGuarantee,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
    sleeveLengthBonus: {
      ...libSleeve.options.sleeveLengthBonus,
      menu: sleeveMenuEnabled('advanced.style.sleevecap'),
    },
  },
  from: libSleeve,
  hide: {
    from: true,
  },
  draft: ({ options, part }) => {
    if (!options.nobleSleeve) {
      return part.hide()
    }
    return part
  },
}
