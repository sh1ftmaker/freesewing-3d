import { base, constructSidePoints } from './base.mjs'
import * as shared from './utils.mjs'
import { pathUtilsPlugin } from '@freesewing/plugin-path-utils'
import {
  createSideSeam,
  drawHelpLine,
  pathPathDistance,
  pointPathDistance,
  safeIntersectsY,
} from './utils.mjs'
import { buildOutlinePaths, buildSaPaths } from './utils.mjs'

export const back = {
  from: base,
  name: 'toni.back',
  hide: { from: true },
  options: {
    raglanAngleBack: {
      deg: 15,
      min: 0,
      max: 25,
      menu: (settings, mergedOptions) =>
        mergedOptions?.construction === 'raglan' ? 'advanced.fit' : false,
    },
    raglanOffsetBack: {
      pct: 24,
      min: 1,
      max: 99,
      menu: (settings, mergedOptions) =>
        mergedOptions?.construction === 'raglan' ? 'advanced.style' : false,
    },
  },
  plugins: [pathUtilsPlugin],
  draft: ({
    paths,
    store,
    points,
    Path,
    Point,
    sa,
    part,
    macro,
    complete,
    options,
    absoluteOptions,
    measurements,
    snippets,
    Snippet,
    utils,
    scale,
    expand,
  }) => {
    constructSidePoints(part, 'back')
    store.set(
      'library.sleeve.backArmholeToArmholePitch',
      shared.armholeToArmholePitch(points, Path)
    )

    paths.sideSeam = createSideSeam(part)

    // Do this before adjusting for dolman sleeves
    store.set('backSideSeamLength', paths.sideSeam.length())

    let upperPaths = []

    const holeAllowance = options.holeAllowance === 'sa' ? sa : absoluteOptions.holeAllowance
    const armholeAllowance = holeAllowance
    const neckholeAllowance = options.hasCollar ? sa : holeAllowance

    // Raglan
    if (options.construction === 'raglan') {
      points.s3CollarSplit = points.raglanCollar = paths.backCollar.shiftFractionAlong(
        options.raglanOffsetBack
      )
      points.raglanCollarCp1 = points.raglanCollar
        .shiftFractionTowards(points.armholeHollow, 0.3)
        .rotate(options.raglanAngleBack, points.raglanCollar)

      paths.raglanBackSplit = new Path()
        .move(points.armhole)
        .curve(points.armholeCp2, points.armholeHollowCp1, points.armholeHollow)
        .curve(points.armholeHollowCp2, points.raglanCollarCp1, points.raglanCollar)
        .hide()

      store.set('raglanBackSplit', paths.raglanBackSplit.length())
      store.set('raglanBackTop', points.raglanCollar.dist(points.neck))
      store.set(
        'raglanBackAngle',
        points.raglanCollar.angle(points.neck) + measurements.shoulderSlope
      )
      store.set(
        'raglanBackJoinAngle',
        paths.backCollar.angleAt(points.raglanCollar) + measurements.shoulderSlope
      )
      store.set('raglanSize', points.neck.dist(points.neckCp2))

      paths.raglanCollar = paths.backCollar.split(points.raglanCollar)[1]

      snippets.armholePitchNotch = new Snippet(
        'bnotch',
        paths.raglanBackSplit.shiftAlong(store.get('library.sleeve.backArmholeToArmholePitch'))
      )

      upperPaths = [
        { p: 'raglanBackSplit', offset: sa },
        { p: 'raglanCollar', offset: neckholeAllowance },
      ]
    } else {
      // Adapt the shoulder seam according to the relevant options
      // Note: s3 stands for Shoulder Seam Shift
      // Don't bother with less than 10% as that's just asking for trouble
      if (options.s3Collar < 0.1 && options.s3Collar > -0.1) {
        points.s3CollarSplit = points.neck
      } else if (options.s3Collar > 0) {
        paths.frontCollarReverse = new Path()
          .move(points.neck)
          .curve(points.mirroredNeckCp2Front, points.mirroredCfNeckCp1, points.mirroredCfNeck)
        // Shift shoulder seam forward on the collar side
        points.s3CollarSplit = paths.frontCollarReverse.shiftAlong(
          store.get('s3CollarMaxFront') * options.s3Collar
        )
        paths.backCollar = (
          paths.frontCollarReverse.split(points.s3CollarSplit)[0] || new Path().move(points.neck)
        )
          .reverse()
          .join(paths.backCollar)
      } else if (options.s3Collar < 0) {
        // Shift shoulder seam backward on the collar side
        points.s3CollarSplit = paths.backCollar.shiftAlong(
          store.get('s3CollarMaxBack') * -options.s3Collar
        )
        paths.backCollar = paths.backCollar.split(points.s3CollarSplit)[1]
      }
      // Don't bother with less than 10% as that's just asking for trouble
      if (options.s3Armhole < 0.1 && options.s3Armhole > -0.1) {
        points.s3ArmholeSplit = points.shoulder
        paths.backArmhole = new Path()
          .move(points.armholePitch)
          .curve(points.armholePitchCp2, points.shoulderCp1, points.shoulder)
          .hide()
      } else if (options.s3Armhole > 0) {
        // Shift shoulder seam forward on the armhole side
        points.s3ArmholeSplit = utils.curveIntersectsY(
          points.shoulder,
          points.mirroredShoulderCp1,
          points.mirroredArmholePitchCp2,
          points.mirroredArmholePitch,
          store.get('s3ArmholeMax') * -1 * options.s3Armhole + points.shoulder.y
        )
        paths.backArmhole = new Path()
          .move(points.armholePitch)
          .curve(points.armholePitchCp2, points.shoulderCp1, points.shoulder)
          .join(
            new Path()
              .move(points.shoulder)
              .curve(
                points.mirroredShoulderCp1,
                points.mirroredArmholePitchCp2,
                points.mirroredArmholePitch
              )
              .split(points.s3ArmholeSplit)[0]
          )
          .hide()
      } else if (options.s3Armhole < 0) {
        // Shift shoulder seam backward on the armhole side
        points.s3ArmholeSplit = utils.curveIntersectsY(
          points.shoulder,
          points.shoulderCp1,
          points.armholePitchCp2,
          points.armholePitch,
          store.get('s3ArmholeMax') * -1 * options.s3Armhole + points.shoulder.y
        )
        paths.backArmhole = new Path()
          .move(points.armholePitch)
          .curve(points.armholePitchCp2, points.shoulderCp1, points.shoulder)
          .split(points.s3ArmholeSplit)[0]
          .hide()
      }
      if (options.construction === 'set-in') {
        paths.shoulder = new Path().move(points.s3ArmholeSplit).line(points.s3CollarSplit)
        paths.armhole = new Path()
          .move(points.armhole)
          .curve(points.armholeCp2, points.armholeHollowCp1, points.armholeHollow)
          .curve(points.armholeHollowCp2, points.armholePitchCp1, points.armholePitch)
          .join(paths.backArmhole)

        upperPaths = [
          { p: 'armhole', offset: sa },
          { p: 'shoulder', offset: sa },
          { p: 'backCollar', offset: neckholeAllowance },
        ]
        // Notches
        snippets.armholePitchNotch = new Snippet('bnotch', points.armholePitch)
      } else if (options.construction === 'sleeveless' || options.construction === 'racerback') {
        points.shoulderDummy = points.shoulder.shiftFractionTowards(
          points.neck,
          options.sleevelessOpeningSize
        )
        points.shoulderDummy2 = points.shoulderDummy.shift(
          270 - measurements.shoulderSlope - options.shoulderAngle,
          10
        )
        points.armOpeningTop = utils.beamsIntersect(
          points.s3CollarSplit,
          points.s3ArmholeSplit,
          points.shoulderDummy,
          points.shoulderDummy2
        )
        if (options.construction === 'sleeveless') {
          points.armOpeningTopCp1 = points.armOpeningTop.shift(
            paths.backCollar.angleAt(points.s3CollarSplit),
            points.armOpeningTop.dy(points.armholePitch) * 0.33
          )

          let strapWidth = pointPathDistance(
            points.s3CollarSplit,
            new Path().move(points.armOpeningTop).line(points.armOpeningTopCp1)
          )

          points.sleevelessArmholePitch = new Point(
            points.shoulderDummy.x * options.sleevelessOpeningPitchBack,
            points.armholePitch.y
          )

          for (let i = 0; i < 100; i++) {
            points.sleevelessArmholePitchCp2 = points.sleevelessArmholePitch.translate(
              0,
              points.sleevelessArmholePitch.dy(points.shoulderDummy) * 0.33
            )
            paths.armholePilot = new Path()
              .move(points.sleevelessArmholePitch)
              .curve(
                points.sleevelessArmholePitchCp2,
                points.armOpeningTopCp1,
                points.armOpeningTop
              )
              .addClass('various')
            paths['pilot' + i] = paths.armholePilot
            let distance = pathPathDistance(paths.armholePilot, paths.backCollar)
            const delta = strapWidth - distance
            if (delta < 0.02) {
              break
            }
            if (distance < strapWidth) {
              points.sleevelessArmholePitch = points.sleevelessArmholePitch.translate(delta, 0)
            }
          }
          points.sleevelessArmholePitchCp1 = points.sleevelessArmholePitch.translate(
            0,
            points.shoulderDummy.dy(points.sleevelessArmholePitch) * 0.66
          )
          points.sleevelessArmholeCp2 = points.armhole.shiftFractionTowards(
            points.armholeCp2,
            1 + 4 * options.sleevelessOpeningSize
          )
        } else {
          const cpDist = points.cbNeck.dist(points.cbNeckCp1)

          points.armOpeningTopCp1 = points.armOpeningTop.shift(
            paths.backCollar.angleAt(points.s3CollarSplit),
            cpDist * 2.5
          )
          let strapWidth = pointPathDistance(
            points.s3CollarSplit,
            new Path().move(points.armOpeningTop).line(points.armOpeningTopCp1)
          )

          points.sleevelessArmholePitch = new Point(strapWidth, points.cbNeck.y + strapWidth * 3)
          for (let i = 0; i < 100; i++) {
            points.sleevelessArmholePitchCp2 = points.sleevelessArmholePitch.translate(
              0,
              cpDist * -0.8
            )

            paths.armholePilot = new Path()
              .move(points.sleevelessArmholePitch)
              .curve(
                points.sleevelessArmholePitchCp2,
                points.armOpeningTopCp1,
                points.armOpeningTop
              )
              .addClass('various')
            let distance = pathPathDistance(paths.armholePilot, paths.backCollar)
            const delta = strapWidth - distance
            if (delta < 0.02) {
              break
            }
            if (distance < strapWidth) {
              points.sleevelessArmholePitch = points.sleevelessArmholePitch.translate(delta, delta)
            }
          }
          points.sleevelessArmholePitchCp2 = points.sleevelessArmholePitch.translate(
            0,
            cpDist * -0.8
          )
          points.sleevelessArmholePitchCp1 = points.sleevelessArmholePitch.translate(0, cpDist * 2)
          points.sleevelessArmholeCp2 = points.armhole.shiftFractionTowards(points.armholeCp2, 4)

          points.neckOpeningMid = paths.backCollar.intersectsX(points.s3CollarSplit.x * 0.4)[0]
        }
        paths.shoulder = new Path().move(points.armOpeningTop).line(points.s3CollarSplit)
        paths.armhole = new Path()
          .move(points.armhole)
          .curve(
            points.sleevelessArmholeCp2,
            points.sleevelessArmholePitchCp1,
            points.sleevelessArmholePitch
          )
          .curve(points.sleevelessArmholePitchCp2, points.armOpeningTopCp1, points.armOpeningTop)
          .addClass('various')

        upperPaths = [
          { p: 'armhole', offset: armholeAllowance },
          { p: 'shoulder', offset: sa },
          { p: 'backCollar', offset: neckholeAllowance },
        ]
      } else if (options.construction === 'dolman') {
        points.shoulderExtension = points.s3ArmholeSplit.translate(
          measurements.shoulderToWrist * options.dolmanSleeveLength,
          0
        )
        points.armholeCorner = points.armhole.shiftTowards(
          points.sideWaistCp2,
          0.01 * store.get('chestMeasurement')
        )
        points.armholeExtension = points.armholeCorner.translate(
          Math.max(
            0.01 * store.get('chestMeasurement'),
            -0.07 * store.get('chestMeasurement') +
              measurements.shoulderToWrist * options.dolmanSleeveLength
          ),
          0
        )
        points.armhole = points.dolmanArmhole = points.armhole.shiftTowards(
          points.sideWaistCp2,
          0.02 * store.get('chestMeasurement')
        )
        paths.sideSeam = createSideSeam(part)
        points.armholeCornerEdge = points.armholeCorner.shiftTowards(
          points.armholeExtension,
          points.armholeCorner.dist(points.dolmanArmhole)
        )
        paths.dolmanLower = new Path()
          .move(points.dolmanArmhole)
          .curve(points.armholeCorner, points.armholeCorner, points.armholeExtension)
        paths.dolmanHem = new Path()
          .move(points.armholeExtension)
          .line(points.shoulderExtension)
          .addClass('various')
        paths.dolmanUpper = new Path()
          .move(points.shoulderExtension)
          ._curve(points.s3ArmholeSplit, points.neck)
          .addClass('various')

        upperPaths = [
          { p: 'dolmanLower', offset: sa },
          { p: 'dolmanHem', offset: absoluteOptions.hemAllowance },
          { p: 'dolmanUpper', offset: sa },
          { p: 'backCollar', offset: neckholeAllowance },
        ]
      }
    }

    function setOffset(storeKey, y) {
      let intersectsY = safeIntersectsY(y, paths.sideSeam)
      if (intersectsY.length > 0) {
        store.set(storeKey, paths.sideSeam.measureAlong(intersectsY[0]))
      } else {
        store.set(storeKey, -1)
      }
    }

    setOffset('sideWaistOffset', points.waist.y)

    if (store.get('sideWaistOffset') > 0) {
      points.sideWaistNotch = paths.sideSeam.shiftAlong(store.get('sideWaistOffset'))
    }

    paths.center = new Path().move(points.cbNeck).line(points.cbHem)

    store.set('upperPaths', upperPaths)

    for (const path of Object.keys(paths)) {
      paths[path] = paths[path].hide()
    }

    let hemSa = store.get('ribbingHeight') === 0 ? absoluteOptions.hemAllowance : sa
    let pathBuilder = [
      { p: 'hem', offset: hemSa },
      { p: 'sideSeam', offset: sa },
      ...store.get('upperPaths'),
      { p: 'center', offset: 0, center: true },
    ]

    buildOutlinePaths(part, pathBuilder)
    buildSaPaths(part, pathBuilder)

    if (store.get('waistDart') > 0) {
      points.waistDartCenter = new Point(0, points.cbWaist.y)
      points.waistDartTop = new Point(0, points.cbArmhole.y)
      points.waistDartBottom = new Point(0, points.cbSeat.y)
      points.waistDartTopCp1 = points.waistDartTop.shiftFractionTowards(points.waistDartCenter, 0.3)
      points.waistDartBottomCp1 = points.waistDartBottom.shiftFractionTowards(
        points.waistDartCenter,
        0.3
      )
      points.waistDartRight = points.waistDartCenter.translate(store.get('waistDart'), 0)
      points.waistDartRightCp1 = points.waistDartRight.shift(
        90,
        points.waistDartTop.dy(points.waistDartCenter) * 0.3
      )
      points.waistDartRightCp2 = points.waistDartRight.shift(
        -90,
        points.waistDartTop.dy(points.waistDartCenter) * 0.3
      )
      paths.waistDart = new Path()
        .move(points.waistDartTop)
        .curve(points.waistDartTopCp1, points.waistDartRightCp1, points.waistDartRight)
        .curve(points.waistDartRightCp2, points.waistDartBottomCp1, points.waistDartBottom)
        .attr('class', 'fabric')
      const intersects = paths.hem.intersects(paths.waistDart)
      if (intersects.length === 1) {
        let tmp = null
        try {
          tmp = paths.waistDart.split(intersects[0])[0].attr('class', 'fabric')
        } catch (e) {
          store.log.debug(`Couldn't split waistdart path: ${e}`)
        }
        if (tmp !== null) paths.waistDart = tmp
      }
      if (expand) {
        macro('mirror', {
          mirror: [points.cbNeck, points.cbHem],
          clone: true,
          paths: ['waistDart'],
        })
      }
    }
    // Dimensions
    // shared.dimensions(part, 'front')
    //
    macro('hd', {
      id: 'wHem',
      from: points.cbHem,
      to: points.sideHem,
      y: points.cbHem.y + sa + 15,
    })
    macro('vd', {
      id: 'hHemToNeckOpeningBottom',
      from: points.cbHem,
      to: points.cbNeck,
      x: points.cbHem.x - sa - 30,
    })
    macro('hd', {
      id: 'wCFrontToNeck',
      from: points.cbNeck,
      to: points.s3CollarSplit ?? points.neck,
      y: points.s3CollarSplit.y - sa - 15,
    })
    macro('vd', {
      id: 'hCFrontToArmhole',
      from: points.cbArmhole,
      to: points.s3CollarSplit,
      x: points.s3CollarSplit.x,
    })
    macro('hd', {
      id: 'wCFrontToArmhole',
      from: points.cbArmhole,
      to: points.armhole,
      y: points.armhole.y,
    })
    macro('vd', {
      id: 'hNeckToArmhole',
      from: points.cbArmhole,
      to: points.cbNeck,
      x: points.cbNeck.x - sa - 15,
    })
    if (paths.shoulder) {
      macro('pd', {
        id: 'shoulder',
        path: paths.shoulder.reverse(),
        d: -15,
      })
    }

    store.cutlist.setCut({ cut: 1, from: 'fabric', onFold: !expand })
    points.title = new Point(points.title.x, Math.max(points.title.y, points.cbNeck.y + 60 * scale))
    macro('title', { at: points.title, nr: 2, title: 'back' })

    delete points.logo
    delete snippets.logo
    store.set('sideChestOffset', -1)

    // Bust line
    if (points.bust) {
      const chest = paths.sideSeam.intersectsY(points.cbChest.y)
      points.chest = chest[0] ?? new Point(points.armhole.x, points.bust.y)
      setOffset('sideChestOffset', points.chest.y)
    }

    paths.sideHelper = paths.sideSeam.clone().hide()

    drawHelpLine(part, 'sideChestNotch', 'chestLine', points.cbChest, store.get('sideChestOffset'))
    if (complete && points.cbHem.y > points.cbWaist.y) {
      drawHelpLine(
        part,
        'sideWaistNotch',
        'waistLine',
        points.cbWaist,
        store.get('sideWaistOffset')
      )
      macro('vd', {
        id: 'hHemToWaist',
        from: points.cbHem,
        to: points.cbWaist,
        x: points.cbHem.x - sa - 15,
      })
      macro('vd', {
        id: 'hWaistToHem',
        from: points.waist,
        to: points.sideHem,
        x: points.armhole.x + sa + 15,
      })
      macro('hd', {
        id: 'wCFrontToWaist',
        from: points.cbWaist,
        to: points.waist,
        y: points.sideWaist.y,
      })
      macro('vd', {
        id: 'hArmholeToWaist',
        from: points.armhole,
        to: points.waist,
        x: points.armhole.x + sa + 15,
      })
    } else {
      macro('vd', {
        id: 'hArmholeToHem',
        from: points.armhole,
        to: points.sideHem,
        x: points.armhole.x + sa + 15,
      })
    }

    if (points.sideWaist.x > 130) {
      points.scaleboxAnchor = points.title.translate(45, 40 * scale + 30)
      macro('scalebox', { at: points.scaleboxAnchor })
    } else {
      points.scaleboxAnchor = points.title.translate(15, 40 * scale + 10)
      macro('miniscale', { at: points.scaleboxAnchor })
    }
    if (points.sideWaist.x > 175) {
      points.logo = points.scaleboxAnchor.translate(80, 0)
      snippets.logo = new Snippet('logo', points.logo)
    }

    if (expand && snippets.armholePitchNotch) {
      snippets.armholePitchNotchReversed = new Snippet(
        'notch',
        snippets.armholePitchNotch.anchor.flipX()
      )
    }

    // Store length of the neck seam
    store.set('backNeckSeamLength', paths.backCollar.length())
    store.set('backHemLength', paths.hem.length())

    // store neck opening for potential hood parts
    const hoodParts = ['threePartHood', 'hoodSide', 'hoodCenter']
    for (const hoodPart of hoodParts) {
      store.set(`library.${hoodPart}.neckOpeningLenBack`, paths.backCollar.length())
      store.set(`library.${hoodPart}.neckCutoutBack`, points.cbNeck.y)
    }

    // Store lengths to fit sleeve
    if (paths.backArmhole) {
      store.set(
        'library.sleeve.backArmholeLength',
        shared.armholeLength(points, Path, paths.backArmhole)
      )
    }

    return part
  },
}
