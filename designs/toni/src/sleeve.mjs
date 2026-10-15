import { pctBasedOn } from '@freesewing/core'
import { front } from './front.mjs'
import { back } from './back.mjs'
import { sleeve as libSleeve } from '@freesewing/library'
import * as shared from './utils.mjs'

export const sleeveMenuEnabled =
  (menu = 'style') =>
  (settings, mergedOptions) =>
    mergedOptions?.construction === 'set-in' || mergedOptions?.construction === 'raglan'
      ? menu
      : false
export const sleeveMenuEnabledAdvanced = sleeveMenuEnabled('advanced.style.sleevecap')

export const sleeve = {
  name: 'toni.sleeve',
  after: [front, back],
  measurements: ['shoulderToWrist', 'wrist'],
  options: {
    // compatibility options, which we don't really use
    sleeveLengthBonus: 0,
    cuffEase: 0,
    armholeDepthFactor: 0.55,
    legacyArmholeDepth: false,
    // Library sleevecap options
    libraryFitSleeve: true,
    sleevecapEase: { pct: 0, min: 0, max: 10, menu: sleeveMenuEnabledAdvanced },
    sleevecapTopFactorX: { pct: 50, min: 25, max: 75, menu: sleeveMenuEnabledAdvanced },
    sleevecapTopFactorY: { pct: 45, min: 35, max: 125, menu: sleeveMenuEnabledAdvanced },
    sleevecapBackFactorX: { pct: 60, min: 35, max: 65, menu: sleeveMenuEnabledAdvanced },
    sleevecapBackFactorY: { pct: 33, min: 30, max: 65, menu: sleeveMenuEnabledAdvanced },
    sleevecapFrontFactorX: { pct: 55, min: 35, max: 65, menu: sleeveMenuEnabledAdvanced },
    sleevecapFrontFactorY: { pct: 33, min: 30, max: 65, menu: sleeveMenuEnabledAdvanced },
    sleevecapQ1Offset: { pct: 1, min: 0, max: 7, menu: sleeveMenuEnabledAdvanced },
    sleevecapQ2Offset: { pct: 4, min: 0, max: 7, menu: sleeveMenuEnabledAdvanced },
    sleevecapQ3Offset: { pct: 2.5, min: 0, max: 7, menu: sleeveMenuEnabledAdvanced },
    sleevecapQ4Offset: { pct: 1, min: 0, max: 7, menu: sleeveMenuEnabledAdvanced },
    sleevecapQ1Spread1: { pct: 6, min: 4, max: 20, menu: sleeveMenuEnabledAdvanced },
    sleevecapQ1Spread2: { pct: 15, min: 4, max: 20, menu: sleeveMenuEnabledAdvanced },
    sleevecapQ2Spread1: { pct: 15, min: 4, max: 20, menu: sleeveMenuEnabledAdvanced },
    sleevecapQ2Spread2: { pct: 10, min: 4, max: 20, menu: sleeveMenuEnabledAdvanced },
    sleevecapQ3Spread1: { pct: 10, min: 4, max: 20, menu: sleeveMenuEnabledAdvanced },
    sleevecapQ3Spread2: { pct: 8, min: 4, max: 20, menu: sleeveMenuEnabledAdvanced },
    sleevecapQ4Spread1: { pct: 7, min: 4, max: 20, menu: sleeveMenuEnabledAdvanced },
    sleevecapQ4Spread2: { pct: 6.3, min: 4, max: 20, menu: sleeveMenuEnabledAdvanced },
    sleeveWidthGuarantee: { pct: 85, min: 25, max: 100, menu: sleeveMenuEnabledAdvanced },
    sleeveWidth: { pct: 30, min: -10, max: 200, menu: sleeveMenuEnabled() },
    bicepsEase: {
      pct: 15,
      min: -10,
      max: 30,
      ...pctBasedOn('biceps'),
      menu: sleeveMenuEnabled('fit'),
      order: '100',
    },
    wristEase: {
      pct: 20,
      min: -15,
      max: 200,
      ...pctBasedOn('wrist'),
      menu: sleeveMenuEnabled('fit'),
      order: '200',
    },
    sleeveLength: {
      pct: 30,
      min: 10,
      max: 120,
      ...pctBasedOn('shoulderToWrist'),
      menu: sleeveMenuEnabled(),
      order: '105',
    },
  },
  from: libSleeve,
  hide: {
    from: true,
  },
  draft: ({
    store,
    sa,
    Point,
    points,
    Path,
    paths,
    Snippet,
    snippets,
    options,
    absoluteOptions,
    macro,
    scale,
    measurements,
    part,
    utils,
    units,
    log,
  }) => {
    if (options.construction !== 'raglan' && options.construction !== 'set-in') {
      return part.hide()
    }

    macro('rmScalebox')

    points.sleeveTip = paths.sleevecap.edge('top')

    if (options.construction === 'raglan') {
      const raglanPitFactor = 0.4
      points.capQ1 = points.capQ1.shiftFractionTowards(points.bicepsRight, raglanPitFactor)
      points.capQ1Cp1 = points.capQ1Cp1.shiftFractionTowards(points.bicepsRight, raglanPitFactor)
      points.capQ1Cp2 = points.capQ1Cp2.shiftFractionTowards(points.bicepsRight, raglanPitFactor)
      points.capQ4Cp1 = points.capQ4Cp1.shiftFractionTowards(points.bicepsLeft, raglanPitFactor)
      points.capQ4Cp2 = points.capQ4Cp2.shiftFractionTowards(points.bicepsLeft, raglanPitFactor)
      points.capQ4 = points.capQ4.shiftFractionTowards(points.bicepsLeft, raglanPitFactor)

      let xOffset = 0
      let yOffset = -0.7 * store.get('raglanFrontSplit')

      for (let run = 0; run < 10; run++) {
        points.raglanTop = new Point(xOffset, yOffset)

        points.raglanFront = points.raglanTop.shift(
          90 - store.get('raglanFrontAngle'),
          store.get('raglanFrontTop')
        )
        points.raglanBack = points.raglanTop.shift(
          90 + store.get('raglanBackAngle'),
          store.get('raglanBackTop')
        )

        points.raglanFrontCp2 = points.raglanFront.shift(
          90 - store.get('raglanFrontJoinAngle'),
          store.get('raglanFrontTop') * 0.3
        )
        points.raglanBackCp1 = points.raglanBack.shift(
          90 + store.get('raglanBackJoinAngle'),
          store.get('raglanBackTop') * 0.3
        )

        let armholeDepthFront = store.get('raglanSize') * options.raglanOffsetFront
        let armholeDepthBack = store.get('raglanSize') * options.raglanOffsetBack
        const tipAngle = points.raglanBack.angle(points.raglanFront) - options.shoulderAngle * 0.5

        points.raglanTopCp1 = points.raglanTop.shift(tipAngle, 3 * armholeDepthFront)
        points.raglanTopCp2 = points.raglanTop.shift(tipAngle, -1.5 * armholeDepthBack)

        points.raglanFrontCp1 = points.raglanFront
          .shiftFractionTowards(points.capQ1, 0.1)
          .rotate(-options.raglanAngleFront, points.raglanFront)
        points.raglanBackCp2 = points.raglanBack
          .shiftFractionTowards(points.capQ4, 0.1)
          .rotate(options.raglanAngleBack, points.raglanBack)

        paths.raglanFront = new Path()
          .move(points.bicepsRight)
          ._curve(points.capQ1Cp1, points.capQ1)
          .curve(points.capQ1Cp2, points.raglanFrontCp1, points.raglanFront)
          .hide()

        paths.raglanFrontTop = new Path()
          .move(points.raglanFront)
          .curve(points.raglanFrontCp2, points.raglanTopCp1, points.raglanTop)
          .hide()

        paths.raglanBackTop = new Path()
          .move(points.raglanTop)
          .curve(points.raglanTopCp2, points.raglanBackCp1, points.raglanBack)
          .hide()

        paths.raglanBack = new Path()
          .move(points.raglanBack)
          .curve(points.raglanBackCp2, points.capQ4Cp1, points.capQ4)
          ._curve(points.capQ4Cp2, points.bicepsLeft)
          .hide()

        paths.sleevecap = paths.raglanFront
          .clone()
          .join(paths.raglanFrontTop)
          .join(paths.raglanBackTop)
          .join(paths.raglanBack)
          .addClass('fabric')
          .hide()

        let frontError = paths.raglanFront.length() - store.get('raglanFrontSplit')
        let backError = paths.raglanBack.length() - store.get('raglanBackSplit')

        let yError = (frontError + backError) * 0.7
        let xError = (frontError - backError) * 0.7

        log.debug(
          `📏 Fitting raglan seam: Run \`${run}\`, error is \`${units(xError)}\` \`${units(yError)}\``
        )

        if (Math.abs(xError) < 0.1 && Math.abs(yError) < 0.1) {
          break
        }

        yOffset += yError
        xOffset += xError
      }
    }
    // Remove things inherited
    delete paths.waist
    for (const key in snippets) delete snippets[key]

    // Determine the sleeve length
    points.sleeveTop = new Point(0, points.sleeveTip.y) // Always in center
    points.grainlineTop = new Point(0, (points.raglanTop ?? points.sleeveTop).y)

    // Wrist
    points.centerWrist = points.sleeveTop.shift(-90, measurements.shoulderToWrist)
    points.wristRight = points.centerWrist.shift(
      0,
      (measurements.wrist * (1 + options.wristEase)) / 2
    )
    points.wristLeft = points.wristRight.rotate(180, points.centerWrist)

    points.squareLeft = new Point(points.bicepsLeft.x, points.wristLeft.y)
    points.squareRight = new Point(points.bicepsRight.x, points.wristRight.y)

    points.leftTmp = points.squareLeft.shiftFractionTowards(
      points.wristLeft,
      1 - options.sleeveWidth
    )
    points.rightTmp = points.squareRight.shiftFractionTowards(
      points.wristRight,
      1 - options.sleeveWidth
    )

    const sleeveY =
      points.sleeveTop.y +
      options.sleeveLength * measurements.shoulderToWrist -
      store.get('ribbingHeight')
    const minFabricWidth = absoluteOptions.hemAllowance * 1.5 || sa
    let sideSleeveY = Math.max(sleeveY, points.bicepsLeft.y + minFabricWidth)
    let centerSleeveY = Math.max(sleeveY, points.sleeveTop.y + minFabricWidth)
    if (absoluteOptions.ribbingHeight > 0) {
      // don't allow curved sleeve hems with ribbing, that calls for trouble
      centerSleeveY = sideSleeveY
    }
    points.hemLeft = utils.beamIntersectsY(points.leftTmp, points.bicepsLeft, sideSleeveY)
    points.hemRight = utils.beamIntersectsY(points.rightTmp, points.bicepsRight, sideSleeveY)
    points.hemCenter = points.hemLeft.shiftFractionTowards(points.hemRight, 0.5)
    points.hemCenter.y = centerSleeveY

    const fac = 0.367552597
    points.hemLeftCp2 = points.hemLeft.translate(points.hemLeft.dx(points.hemCenter) * fac, 0)
    points.hemCenterCp1 = points.hemCenter.translate(points.hemLeft.dx(points.hemCenter) * -fac, 0)
    points.hemCenterCp2 = points.hemCenter.translate(points.hemRight.dx(points.hemCenter) * -fac, 0)
    points.hemRightCp1 = points.hemRight.translate(points.hemRight.dx(points.hemCenter) * fac, 0)

    paths.hem = new Path()
      .move(points.hemLeft)
      .curve(points.hemLeftCp2, points.hemCenterCp1, points.hemCenter)
      .curve(points.hemCenterCp2, points.hemRightCp1, points.hemRight)
      .hide()

    paths.leftEdge = new Path().move(points.bicepsLeft).line(points.hemLeft).hide()

    paths.rightEdge = new Path().move(points.hemRight).line(points.bicepsRight).hide()

    paths.seam = paths.leftEdge
      .clone()
      .join(paths.hem)
      .join(paths.rightEdge)
      .join(paths.sleevecap)
      .close()
      .attr('class', 'fabric')

    if (sa) {
      if (store.get('ribbingHeight') > 0) {
        paths.sa = macro('sa', {
          paths: ['leftEdge', 'hem', 'rightEdge', 'sleevecap'],
        })
      } else {
        if (sleeveY === sideSleeveY) {
          paths.hemSa = macro('hem', {
            path1: 'leftEdge',
            path2: 'rightEdge',
            hemWidth: absoluteOptions.hemAllowance,
            lastFoldWidth: absoluteOptions.hemAllowance,
            folds: 1,
          }).hide()
        } else {
          paths.hemSa = paths.hem.offset(absoluteOptions.hemAllowance).hide()
        }

        paths.sa = macro('sa', {
          paths: ['leftEdge', { p: 'hemSa', offset: 0 }, 'rightEdge', 'sleevecap'],
        })
      }
    }

    /*
     * Annotations
     */

    // Anchor point for sampling
    points.gridAnchor = new Point(0, 0)

    // Grainline
    macro('grainline', {
      from: points.grainlineTop,
      to: points.hemCenter,
    })

    // Cut list
    store.cutlist.setCut({ cut: 2, from: 'fabric' })

    // Title
    macro('title', { at: points.centerBiceps.translate(15 * scale, 0), nr: 3, title: 'sleeve' })

    // Notches
    let stretch = 1 + options.sleevecapEase
    points.frontNotch = paths.sleevecap.shiftAlong(
      store.get('library.sleeve.frontArmholeToArmholePitch') * stretch
    )
    points.backNotch = paths.sleevecap
      .reverse()
      .shiftAlong(store.get('library.sleeve.backArmholeToArmholePitch') * stretch)
    snippets.frontNotch = new Snippet('notch', points.frontNotch)
    snippets.backNotch = new Snippet('bnotch', points.backNotch)
    shared.addText(part, paths.sleevecap, points.frontNotch, 'Front Armhole')
    shared.addText(part, paths.sleevecap, points.backNotch, 'Back Armhole')

    if (options.construction !== 'raglan') {
      points.shoulderNotch = paths.sleevecap.shiftAlong(
        store.get('library.sleeve.frontArmholeLength') * stretch
      )
      snippets.shoulderNotch = new Snippet('notch', points.shoulderNotch)
      shared.addText(part, paths.sleevecap, points.shoulderNotch, 'Shoulder seam')
    }

    // Dimensions
    macro('vd', {
      id: 'hCuffToArmhole',
      from: points.hemLeft,
      to: points.bicepsLeft,
      x: points.bicepsLeft.x - sa - 15,
    })
    if (options.construction === 'raglan') {
      macro('vd', {
        id: 'hLeft',
        from: points.hemLeft,
        to: points.raglanBack,
        x: points.bicepsLeft.x - sa - 30,
      })
      macro('vd', {
        id: 'hRight',
        from: points.hemLeft,
        to: points.raglanFront,
        x: points.bicepsRight.x + sa + 30,
      })
      macro('pd', {
        id: 'lRaglanLeft',
        path: paths.raglanBack.reverse(),
        d: -1 * sa - 15,
      })
      macro('pd', {
        id: 'lRaglanRight',
        path: paths.raglanFront.reverse(),
        d: -1 * sa - 15,
      })
      macro('pd', {
        id: 'lRaglanLeftTop',
        path: paths.raglanFrontTop.join(paths.raglanBackTop).reverse(),
        d: sa + 15,
      })
    } else {
      macro('vd', {
        id: 'hFull',
        from: points.hemLeft,
        to: points.sleeveTip,
        x: points.bicepsLeft.x - sa - 30,
      })
      macro('pd', {
        id: 'lSleevevap',
        path: paths.sleevecap.reverse(),
        d: -1 * sa - 15,
      })
    }
    macro('hd', {
      id: 'wFull',
      from: points.bicepsLeft,
      to: points.bicepsRight,
      y: points.bicepsLeft.y + sa + 30,
    })
    macro('hd', {
      id: 'wCuff',
      from: points.hemLeft,
      to: points.hemRight,
      y: points.hemLeft.y + sa + 30,
    })

    store.set('sleeveHemLength', paths.hem.length())

    return part
  },
}
