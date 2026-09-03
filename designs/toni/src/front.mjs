import { base, constructSidePoints } from './base.mjs'
import { back } from './back.mjs'
import * as shared from './utils.mjs'
import {
  buildOutlinePaths,
  buildSaPaths,
  createSideSeam,
  formatAngle,
  pathPathDistance,
  pointPathDistance,
  verticalSplit,
  measureSideSeam,
  drawHelpLine,
} from './utils.mjs'
import { pathUtilsPlugin } from '@freesewing/plugin-path-utils'
import { pctBasedOn } from '@freesewing/core'

export const front = {
  from: base,
  name: 'toni.front',
  hide: { from: true },
  optionalMeasurements: ['hpsToBust', 'bustSpan', 'hpsToWaistFront'],
  after: back,
  options: {
    raglanAngleFront: {
      deg: 20,
      min: 0,
      max: 30,
      menu: (settings, mergedOptions) =>
        mergedOptions?.construction === 'raglan' ? 'advanced.fit' : false,
    },
    extraBustEase: {
      pct: -5,
      min: -15,
      max: 15,
      ...pctBasedOn('chest'),
      menu: (settings, mergedOptions) => (mergedOptions?.draftForHighBust ? 'advanced.fit' : false),
    },
    raglanOffsetFront: {
      pct: 33,
      min: 1,
      max: 99,
      menu: (settings, mergedOptions) =>
        mergedOptions?.construction === 'raglan' ? 'advanced.style' : false,
    },
    dart: {
      bool: true,
      menu: (settings, mergedOptions) => (mergedOptions?.draftForHighBust ? 'style' : false),
    },
  },
  plugins: [pathUtilsPlugin],
  draft: ({
    scale,
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
    complete,
    macro,
    utils,
    measurements,
    expand,
    part,
    log,
    units,
  }) => {
    paths.saBase.hide()

    constructSidePoints(part, 'front', store.get('backSideSeamLength'))

    // Front armhole is a bit deeper, add those points
    let deeper = measurements.chest * options.frontArmholeDeeper
    for (const p of ['', 'Cp1', 'Cp2']) {
      points[`armholePitch${p}`] = points[`armholePitch${p}`].shift(180, deeper)
    }

    let originalSideSeamLength = store.get('backSideSeamLength')

    paths.sideSeamBase = createSideSeam(part).hide()
    points.armholeCp2Base = points.armholeCp2.clone()

    let fba
    points.fbaCenter = points.neck //.shiftFractionTowards(points.shoulder, 0.3)
    store.set('fba-dx', 0)
    if (options.draftForHighBust && points.bust) {
      const dx =
        (measurements.bust * (1 + options.extraBustEase) * (1 + options.chestEase) -
          store.get('chestMeasurement') * (1 + options.chestEase)) /
        2
      store.set('fba-dx', dx)
      const ease =
        (measurements.bust * (1 + options.extraBustEase) * (1 + options.chestEase) -
          measurements.bust * (1 + options.chestEase)) /
        2
      store.set('fba-ease', ease)
      if (dx <= 0) {
        log.info(`⭕ Skipping full bust adjustment with delta: \`${units(dx)}\``)
      } else {
        log.info(`🍈 Calculating full bust adjustment with delta: \`${units(dx)}\``)
        fba = calculateFba(points.fbaCenter, points.bust, dx)
        log.info(
          `🍈 FBA calculated. dx: \`${units(fba.dx)}\` dy: \`${units(fba.dy)}\` angle: \`${formatAngle(fba.angle)}\``
        )
        points.bustOffset = fba.bustOffset
        points.armholeCp1 = fba.rotateUpper(points.armholeCp1)
        points.armhole = fba.rotateUpper(points.armhole)
        points.cbArmhole.y = points.armhole.y
        points.armholeCp2 = fba.rotateUpper(points.armholeCp2)
        points.armholeHollowCp1 = fba.rotateUpper(points.armholeHollowCp1)
        points.armholeHollow = fba.rotateUpper(points.armholeHollow)
        points.armholeHollowCp2 = fba.rotateUpper(points.armholeHollowCp2)
        points.cbHem = points.cbHem.translate(0, fba.dy)
        points.cbHemCp2 = points.cbHemCp2.translate(0, fba.dy)
        points.armholeCp1 = points.armholeCp1.shiftTowards(points.armhole, 3 * fba.dy)
        // points.sideWaistCp2 = points.sideWaistCp2.shiftTowards(points.sideWaist, -fba.dy)
        points.armholePitchCp1 = fba.rotateUpper(points.armholePitchCp1)
        points.armholePitch = fba.rotateUpper(points.armholePitch)
        points.armholePitchCp2 = fba.rotateUpper(points.armholePitchCp2)
        points.shoulderCp1 = fba.rotateUpper(points.shoulderCp1)
        points.shoulder = fba.rotateUpper(points.shoulder)

        // remirror points on armhole side after fba for s3
        macro('mirror', {
          mirror: [points.hps, points.shoulder],
          points: ['armholePitch', 'armholePitchCp2', 'shoulderCp1'],
          clone: true,
        })
      }
    } else {
      log.info(`⭕ Full bust adjustment disabled`)
    }

    // Adapt the shoulder line according to the relevant options
    // Don't bother with less than 10% as that's just asking for trouble
    if (options.construction === 'raglan' || (options.s3Collar < 0.1 && options.s3Collar > -0.1)) {
      points.s3CollarSplit = points.neck
    } else if (options.s3Collar > 0) {
      // Shift shoulder seam forward on the collar side
      points.s3CollarSplit = paths.frontCollar.shiftAlong(
        store.get('s3CollarMaxFront') * options.s3Collar
      )
      paths.frontCollar = paths.frontCollar.split(points.s3CollarSplit)[1]
    } else if (options.s3Collar < 0) {
      // Shift shoulder seam backward on the collar side
      paths.backCollarReverse = new Path()
        .move(points.neck)
        .curve(points.mirroredNeckCp2, points.mirroredCbNeckCp1, points.mirroredCbNeck)
      points.s3CollarSplit = paths.backCollarReverse.shiftAlong(
        store.get('s3CollarMaxBack') * -options.s3Collar
      )
      paths.frontCollar = (
        paths.backCollarReverse.split(points.s3CollarSplit)[0] || new Path().move(points.neck)
      )
        .reverse()
        .join(paths.frontCollar)
    }
    if (options.s3Armhole < 0.1 && options.s3Armhole > -0.1) {
      points.s3ArmholeSplit = points.shoulder
    } else if (options.s3Armhole > 0) {
      // Shift shoulder seam forward on the armhole side
      points.s3ArmholeSplit = utils.curveIntersectsY(
        points.shoulder,
        points.shoulderCp1,
        points.armholePitchCp2,
        points.armholePitch,
        store.get('s3ArmholeMax') * options.s3Armhole + points.shoulder.y
      )
    } else if (options.s3Armhole < 0) {
      // Shift shoulder seam forward on the armhole side
      points.s3ArmholeSplit = utils.curveIntersectsY(
        points.shoulder,
        points.mirroredShoulderCp1,
        points.mirroredArmholePitchCp2,
        points.mirroredArmholePitch,
        store.get('s3ArmholeMax') * options.s3Armhole + points.shoulder.y
      )
    }

    const dartLength = measureSideSeam(part) - originalSideSeamLength
    const constructDart = (path, tip, dartLength) => {
      const length = path.length()
      dartLength = Math.max(0, Math.min(dartLength, length))

      const gatherArea = Math.max(0, Math.min(dartLength * 2.5, length))
      // The length of both the beforeDart and afterDart paths,
      // which are used to create a smooth transition to the dart
      let auxLength = (gatherArea - dartLength) * 0.5

      let dartOffset = path.measureAlong(path.projectPoint(tip))

      for (let i = 0; i < 10; i++) {
        if (dartOffset < gatherArea * 0.5) {
          dartOffset = gatherArea * 0.5
        }
        if (dartOffset > length - gatherArea * 0.5) {
          dartOffset = length - gatherArea * 0.5
        }
        const offset = dartOffset - gatherArea * 0.5
        const startSplit = path.shiftAlong(offset)
        const startDartAlpha = path.shiftAlong(offset + auxLength)
        const endDartAlpha = path.shiftAlong(offset + auxLength + dartLength)
        const endSplit = path.shiftAlong(offset + gatherArea)

        let tmp = verticalSplit(Path, path, startSplit)
        const pathBefore = tmp[0]
        tmp = verticalSplit(Path, tmp[1], endSplit)
        const pathGather = tmp[0]
        const pathAfter = tmp[1]
        const angleBefore = path.angleAt(startSplit)
        const angleAfter = path.angleAt(endSplit)
        const cpBefore = startSplit.shift(angleBefore, auxLength / 3)
        const cpAfter = endSplit.shift(angleAfter, -auxLength / 3)

        const dartDist = Math.max(tip.dist(startDartAlpha), tip.dist(endDartAlpha))

        const startDelta = tip.dist(startDartAlpha) - dartDist
        const endDelta = tip.dist(endDartAlpha) - dartDist
        const delta = startDelta - endDelta

        if (i < 9 && Math.abs(delta) > 1) {
          dartOffset += delta / 3
          continue
        }

        const startDart = tip.shiftTowards(startDartAlpha, dartDist)

        const endDart = tip.shiftTowards(endDartAlpha, dartDist)

        const dartMid = startDart.shiftFractionTowards(endDart, 0.5)
        let tipShifted = tip.shiftFractionTowards(dartMid, 0.25)
        const maxDartFactor = 5
        if (tipShifted.dist(dartMid) > dartLength * maxDartFactor) {
          tipShifted = dartMid.shiftTowards(tipShifted, dartLength * maxDartFactor)
        }
        const dartCpStart = tipShifted
          .shiftFractionTowards(dartMid, 0.25)
          .shiftFractionTowards(startDart, 0.0625)
        const dartCpEnd = tipShifted
          .shiftFractionTowards(dartMid, 0.25)
          .shiftFractionTowards(endDart, 0.0625)

        const dartAngleMain = startDart.angle(endDart)
        const dartAngleBefore = startDartAlpha.angle(endDartAlpha)
        const dartAngle = dartAngleBefore * 2 - dartAngleMain
        let dartInnerAngle = tipShifted.angle(endDart) - tipShifted.angle(startDart)
        if (dartInnerAngle < -180) dartInnerAngle += 360
        const cpSplitStart = startDart.shift(dartAngle - dartInnerAngle / 2, -auxLength / 3)
        const cpSplitEnd = endDart.shift(dartAngle + dartInnerAngle / 2, auxLength / 3)

        return {
          beforeDart: pathBefore.clone().curve(cpBefore, cpSplitStart, startDart),
          dart: new Path()
            .move(startDart)
            ._curve(dartCpStart, tipShifted)
            .curve_(dartCpEnd, endDart),
          afterDart: new Path().move(endDart).curve(cpSplitEnd, cpAfter, endSplit).join(pathAfter),
          dartMiddle: new Path().move(dartMid).line(tipShifted),
          startGather: startSplit,
          endGather: endSplit,
          startDart: startDart,
          endDart: endDart,
          dartTip: tipShifted,
          gatherArea: gatherArea,
          gatherPath: pathGather,
          dartLength: dartLength,
          offset: offset,
        }
      }
    }

    paths.sideSeamWithDart = paths.originalSideSeam = createSideSeam(part).clone() //.hide()

    if (options.draftForHighBust && points.bust) {
      const dart = constructDart(createSideSeam(part), points.bust, dartLength)

      store.set('dart', dart)

      points.startGather = dart.startGather
      points.endGather = dart.endGather
      points.startDart = dart.startDart
      points.endDart = dart.endDart
      points.dartTip = dart.dartTip

      if (!options.dart) {
        log.info(`♦️ Dart is disabled (length difference is \`${units(dartLength)}\`)`)
      } else if (dartLength > measurements.waist * 0.02) {
        log.info(`♦️ Dart is required (length difference is \`${units(dartLength)}\`)`)
        paths.sideSeam1 = dart.beforeDart
        paths.dart = dart.dart.addClass('fabric')
        paths.sideSeam2 = dart.afterDart
        if (complete) {
          paths.dartMiddle = dart.dartMiddle.addClass('contrast help')
        }
        paths.sideSeamWithDart = paths.sideSeam1.clone().join(paths.dart).join(paths.sideSeam2)
      } else {
        log.info(`♦️ Dart is not required (length difference is only \`${units(dartLength)}\`)`)
      }
    }

    // Rename cb (center back) to cf (center front)
    for (let key of ['Shoulder', 'Armhole', 'Waist', 'Seat', 'Hem', 'HemCp2']) {
      points[`cf${key}`] = new Point(points[`cb${key}`].x, points[`cb${key}`].y)
      // delete points[`cb${key}`]
    }

    if (measurements.hpsToWaistFront) {
      points.cfWaist = new Point(0, measurements.hpsToWaistFront)
    }

    // Front neckline points
    points.neckCp2 = new Point(points.neckCp2Front.x, points.neckCp2Front.y)
    store.set(
      'library.sleeve.frontArmholeToArmholePitch',
      shared.armholeToArmholePitch(points, Path)
    )

    if (options.construction !== 'raglan') {
      if (options.s3Armhole < 0.1 && options.s3Armhole > -0.1) {
        paths.frontArmhole = new Path()
          .move(points.armholePitch)
          .curve(points.armholePitchCp2, points.shoulderCp1, points.shoulder)
          .hide()
      } else if (options.s3Armhole > 0) {
        paths.frontArmhole = new Path()
          .move(points.armholePitch)
          .curve(points.armholePitchCp2, points.shoulderCp1, points.shoulder)
          .split(points.s3ArmholeSplit)[0]
          .hide()
      } else if (options.s3Armhole < 0) {
        paths.frontArmhole = new Path()
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
      }
    }

    let upperPaths

    const holeAllowance = options.holeAllowance === 'sa' ? sa : absoluteOptions.holeAllowance
    const armholeAllowance = holeAllowance
    const neckholeAllowance = options.hasCollar ? sa : holeAllowance

    if (options.construction === 'raglan') {
      // Raglan
      points.s3CollarSplit = points.raglanCollar = paths.frontCollar.shiftFractionAlong(
        options.raglanOffsetFront
      )
      points.raglanCollarCp1 = points.raglanCollar
        .shiftFractionTowards(points.armholeHollow, 0.3)
        .rotate(options.raglanAngleFront, points.raglanCollar)
      // paths.frontCollar = paths.frontCollar.split(points.raglanCollar)[1]

      paths.raglanFrontSplit = new Path()
        .move(points.armhole)
        .curve(points.armholeCp2, points.armholeHollowCp1, points.armholeHollow)
        .curve(points.armholeHollowCp2, points.raglanCollarCp1, points.raglanCollar)
        .hide()

      store.set('raglanFrontSplit', paths.raglanFrontSplit.length())
      store.set('raglanFrontTop', points.raglanCollar.dist(points.neck))
      store.set(
        'raglanFrontAngle',
        points.raglanCollar.angle(points.neck) + measurements.shoulderSlope
      )
      store.set(
        'raglanFrontJoinAngle',
        paths.frontCollar.angleAt(points.raglanCollar) + measurements.shoulderSlope
      )
      paths.raglanCollar = paths.frontCollar.split(points.raglanCollar)[1]

      snippets.armholePitchNotch = new Snippet(
        'notch',
        paths.raglanFrontSplit.shiftAlong(store.get('library.sleeve.frontArmholeToArmholePitch'))
      )

      upperPaths = [
        { p: 'raglanFrontSplit', offset: sa },
        { p: 'raglanCollar', offset: neckholeAllowance },
      ]
    } else if (options.construction === 'set-in') {
      paths.shoulder = new Path().move(points.s3ArmholeSplit).line(points.s3CollarSplit).hide()
      paths.armhole = new Path()
        .move(points.armhole)
        .curve(points.armholeCp2, points.armholeHollowCp1, points.armholeHollow)
        .curve(points.armholeHollowCp2, points.armholePitchCp1, points.armholePitch)
        .join(paths.frontArmhole)
        .addClass('various')

      upperPaths = [
        { p: 'armhole', offset: sa },
        { p: 'shoulder', offset: sa },
        { p: 'frontCollar', offset: neckholeAllowance },
      ]
      snippets.armholePitchNotch = new Snippet('notch', points.armholePitch)
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
        { p: 'frontCollar', offset: neckholeAllowance },
      ]
    } else {
      points.shoulderDummy = points.shoulder.shiftFractionTowards(
        points.neck,
        options.sleevelessOpeningSize
      )
      points.shoulderDummy2 = points.shoulderDummy.shift(
        270 - measurements.shoulderSlope + options.shoulderAngle,
        10
      )
      points.armOpeningTop = utils.beamsIntersect(
        points.s3CollarSplit,
        points.s3ArmholeSplit,
        points.shoulderDummy,
        points.shoulderDummy2
      )
      points.armOpeningTopCp1 = points.armOpeningTop.shift(
        paths.frontCollar.angleAt(points.s3CollarSplit),
        points.armOpeningTop.dy(points.armholePitch) * 0.33
      )

      let strapWidth = pointPathDistance(
        points.armOpeningTop,
        new Path().move(points.s3CollarSplit).line(points.neckCp2Front)
      )

      points.sleevelessArmholePitch = new Point(
        points.shoulderDummy.x * options.sleevelessOpeningPitchFront,
        points.armholePitch.y
      )

      const frontPitchRotation =
        (options.armholeDepth + options.sleevelessOpeningPitchFront - 1) * 60
      const pitchRotation = frontPitchRotation + -90
      const distCp1 = points.sleevelessArmholePitch.dy(points.shoulderDummy)
      const distCp2 = points.sleevelessArmholePitch.dy(points.armhole)

      for (let i = 0; i < 100; i++) {
        points.sleevelessArmholePitchCp2 = points.sleevelessArmholePitch.shift(
          pitchRotation,
          distCp1 * 0.33
        )
        paths.armholePilot = new Path()
          .move(points.sleevelessArmholePitch)
          .curve(points.sleevelessArmholePitchCp2, points.armOpeningTopCp1, points.armOpeningTop)
          .addClass('various')
        paths['pilot' + i] = paths.armholePilot
        let distance = pathPathDistance(paths.armholePilot, paths.frontCollar)
        const delta = strapWidth - distance
        if (delta < 0.02) {
          break
        }
        if (distance < strapWidth) {
          points.sleevelessArmholePitch = points.sleevelessArmholePitch.translate(delta, 0)
        }
      }
      points.sleevelessArmholePitchCp1 = points.sleevelessArmholePitch.shift(
        pitchRotation,
        distCp2 * 0.66
      )
      points.sleevelessArmholeCp2 = points.armhole.shiftFractionTowards(
        points.armholeCp2,
        1 + 4 * options.sleevelessOpeningSize
      )
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
        { p: 'frontCollar', offset: neckholeAllowance },
      ]
    }

    paths.center = new Path().move(points.cfNeck).line(points.cfHem)

    store.set('upperPathsFront', upperPaths)

    let pathBuilder

    paths.sideSeam = createSideSeam(part)

    let hemSa = store.get('ribbingHeight') === 0 ? absoluteOptions.hemAllowance : sa
    if (paths.dart) {
      pathBuilder = [
        { p: 'hem', offset: hemSa },
        { p: 'sideSeam1', offset: sa },
        { p: 'dart', offset: 0, sa: 'skip' },
        { p: 'sideSeam2', offset: sa },
        ...store.get('upperPathsFront'),
        { p: 'center', offset: 0, center: true },
      ]
    } else {
      pathBuilder = [
        { p: 'hem', offset: hemSa },
        { p: 'sideSeam', offset: sa },
        ...store.get('upperPathsFront'),
        { p: 'center', offset: 0, center: true },
      ]
    }

    for (const path of Object.keys(paths)) {
      if (path !== 'dartMiddle') paths[path] = paths[path].hide()
    }

    buildOutlinePaths(part, pathBuilder)
    buildSaPaths(part, pathBuilder)

    if (store.get('waistDart') > 0) {
      points.waistDartCenter = new Point(points.bust.x, points.sideWaist.y)
      points.waistDartTop = points.bust.shiftFractionTowards(points.waistDartCenter, 0.1)
      points.waistDartTopCp1 = points.waistDartTop.shiftFractionTowards(points.waistDartCenter, 0.3)
      points.waistDartBottom = points.waistDartTop.shiftFractionTowards(points.waistDartCenter, 2)
      points.waistDartBottomCp1 = points.waistDartBottom.shiftFractionTowards(
        points.waistDartCenter,
        0.3
      )
      points.waistDartLeft = points.waistDartCenter.translate(store.get('waistDart') * -0.5, 0)
      points.waistDartRight = points.waistDartCenter.translate(store.get('waistDart') * 0.5, 0)
      points.waistDartLeftCp1 = points.waistDartLeft.shift(
        -90,
        points.waistDartTop.dy(points.waistDartCenter) * 0.5
      )
      points.waistDartLeftCp2 = points.waistDartLeft.shift(
        90,
        points.waistDartTop.dy(points.waistDartCenter) * 0.5
      )
      points.waistDartRightCp1 = points.waistDartRight.shift(
        90,
        points.waistDartTop.dy(points.waistDartCenter) * 0.5
      )
      points.waistDartRightCp2 = points.waistDartRight.shift(
        -90,
        points.waistDartTop.dy(points.waistDartCenter) * 0.5
      )
      paths.waistDartLeft = new Path()
        .move(points.waistDartBottom)
        .curve(points.waistDartBottomCp1, points.waistDartLeftCp1, points.waistDartLeft)
        .curve(points.waistDartLeftCp2, points.waistDartTopCp1, points.waistDartTop)
        .attr('class', 'fabric')
      paths.waistDartRight = new Path()
        .move(points.waistDartTop)
        .curve(points.waistDartTopCp1, points.waistDartRightCp1, points.waistDartRight)
        .curve(points.waistDartRightCp2, points.waistDartBottomCp1, points.waistDartBottom)
        .attr('class', 'fabric')

      if (expand) {
        macro('mirror', {
          mirror: [points.cfNeck, points.cfHem],
          clone: true,
          paths: ['waistDartLeft', 'waistDartRight'],
        })
      }
    }

    points.title = new Point(points.title.x, Math.max(points.title.y, points.cfNeck.y + 60 * scale))

    macro('hd', {
      id: 'wHem',
      from: points.cfHem,
      to: points.sideHem,
      y: points.cfHem.y + sa + 15,
    })
    macro('vd', {
      id: 'hHemToNeckOpeningBottom',
      from: points.cfHem,
      to: points.cfNeck,
      x: points.cfHem.x - sa - 30,
    })
    macro('hd', {
      id: 'wCFrontToNeck',
      from: points.cfNeck,
      to: points.s3CollarSplit,
      y: points.s3CollarSplit.y - sa - 15,
    })
    macro('vd', {
      id: 'hCFrontToNeck',
      from: points.cfNeck,
      to: points.s3CollarSplit,
      x: points.cfWaist.x - sa - 15,
    })
    macro('hd', {
      id: 'wCFrontToArmhole',
      from: points.cfArmhole,
      to: points.armhole,
      y: points.armhole.y,
    })
    macro('vd', {
      id: 'hNeckToArmhole',
      from: points.cfArmhole,
      to: points.cfNeck,
      x: points.cfNeck.x - sa - 15,
    })
    if (paths.shoulder) {
      macro('pd', {
        id: 'shoulder',
        path: paths.shoulder.reverse(),
        d: -15,
      })
    }

    if (paths.sideSeam1) {
      paths.sideHelper = paths.sideSeam1.clone().combine(paths.sideSeam2).hide()
    } else {
      paths.sideHelper = paths.sideSeam.clone().hide()
    }

    drawHelpLine(
      part,
      'sideChestNotch',
      'chestLine',
      points.cfBust || points.cbChest,
      store.get('sideChestOffset')
    )

    if (expand) {
      macro('mirror', {
        mirror: [points.cfNeck, points.cfHem],
        clone: true,
        points: ['waist', 'waistCp', 'armhole', 'hips'],
        paths: ['dartMiddle'],
      })
    }

    if (complete && points.cfHem.y > points.cfWaist.y) {
      drawHelpLine(
        part,
        'sideWaistNotch',
        'waistLine',
        points.cfWaist,
        store.get('sideWaistOffset')
      )

      macro('vd', {
        id: 'hHemToWaist',
        from: points.cfHem,
        to: points.cfWaist,
        x: points.cfHem.x - sa - 15,
      })
      macro('vd', {
        id: 'hWaistToHem',
        from: points.waist,
        to: points.sideHem,
        x: points.armhole.x + sa + 15,
      })
      macro('hd', {
        id: 'wCFrontToWaist',
        from: points.cfWaist,
        to: points.waist,
        y: points.sideWaist.y,
      })
      macro('vd', {
        id: 'hBustToWaist',
        from: points.cfWaist,
        to: points.bust,
        x: points.cfWaist.x - sa - 15,
      })
      macro('vd', {
        id: 'hArmholeToWaist',
        from: points.armhole,
        to: points.waist,
        x: points.armhole.x + sa + 15,
      })
    } else {
      macro('vd', {
        id: 'hBustToHem',
        from: points.cfHem,
        to: points.bust,
        x: points.cfHem.x - sa - 15,
      })
      macro('vd', {
        id: 'hArmholeToHem',
        from: points.armhole,
        to: points.sideHem,
        x: points.armhole.x + sa + 15,
      })
    }
    store.cutlist.setCut({ cut: 1, from: 'fabric', onFold: !expand })
    macro('title', { at: points.title, nr: 1, title: 'front' })

    delete points.logo
    delete snippets.logo

    if (expand && snippets.armholePitchNotch) {
      snippets.armholePitchNotchReversed = new Snippet(
        'notch',
        snippets.armholePitchNotch.anchor.flipX()
      )
    }

    // Store length of the neck seam
    store.set('frontNeckSeamLength', paths.frontCollar.length())
    store.set('frontHemLength', paths.hem.length())
    // Store lengths to fit sleeve
    if (paths.frontArmhole) {
      store.set(
        'library.sleeve.frontArmholeLength',
        shared.armholeLength(points, Path, paths.frontArmhole)
      )
    }

    // store neck opening for potential hood parts
    const hoodParts = ['threePartHood', 'hoodSide', 'hoodCenter']
    for (const hoodPart of hoodParts) {
      store.set(`library.${hoodPart}.neckOpeningLenFront`, paths.frontCollar.length())
      store.set(`library.${hoodPart}.neckCutoutFront`, points.cfNeck.y)
    }
    store.set('library.hoodSide.title', { nr: 6 })
    store.set('library.hoodCenter.title', { nr: 7 })

    return part
  },
}

function calculateFba(anchor, bust, dx) {
  if (dx < 0) dx = 0

  let angle1 = bust.angle(anchor)
  let angle2 = bust.angle(anchor.shift(angle1 - 90, dx))
  const b = angle1 - angle2

  let bustOffset = bust.rotate(b, anchor)

  let dy = bustOffset.y - bust.y

  const rotateUpper = (point) => point.rotate(b, anchor)

  if (b === 0) {
    bustOffset = bust.clone()
    dx = 0
    dy = 0
  }

  return {
    dx: dx,
    dy: dy,
    angle: b,
    rotateUpper: rotateUpper,
    bustOffset: bustOffset,
    anchor,
    bust,
  }
}
