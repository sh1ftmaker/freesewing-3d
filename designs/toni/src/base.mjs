import { pctBasedOn, pctBasedOnSa, units } from '@freesewing/core'
import { bustPlugin } from '@freesewing/plugin-bust'
import { createSideSeam, formatAngle, safeIntersectsY } from './utils.mjs'

export const base = {
  name: 'toni.base',
  measurements: [
    'head',
    'biceps',
    'chest',
    'hpsToWaistBack',
    'neck',
    'shoulderToShoulder',
    'shoulderSlope',
    'waistToArmpit',
    'waistToSeat',
    'seat',
    'waist',
    'shoulderToWrist',
  ],
  optionalMeasurements: ['waistBack', 'seatBack', 'highBust', 'bustFront', 'hips', 'waistToHips'],
  options: {
    // Static
    collarFactor: 4.8,
    // Fit
    draftForHighBust: {
      bool: true,
      menu: 'advanced.fit',
    },
    ribbingStretch: {
      pct: 5,
      min: 0,
      max: 30,
      menu: (settings, mergedOptions) => (mergedOptions?.ribbingHeight ? 'advanced.fit' : false),
    },
    ribbingHeight: {
      pct: 0,
      min: 0,
      max: 1000,
      ...pctBasedOnSa(),
      menu: 'style',
    },
    // Advanced
    acrossBackFactor: { pct: 95, min: 88, max: 100, menu: 'advanced' },
    armholeDepth: {
      pct: 10,
      min: 0,
      max: 40,
      menu: 'style',
      order: '110',
    },
    backNeckCutout: { pct: 30, min: 5, max: 200, menu: 'style', order: '230' },
    neckWidth: { pct: 60, min: 0, max: 130, menu: 'style', order: '220' },
    neckOpeningSize: {
      pct: 80,
      min: 65,
      max: 150,
      toAbs: (val, settings, mergedOptions) => {
        return settings.measurements[mergedOptions.neckBasedOn] * val
      },
      fromAbs: (val, settings, mergedOptions) =>
        Math.round((10000 * val) / settings.measurements[mergedOptions.neckBasedOn]) / 10000,
      menu: 'style',
      order: '210',
    },
    frontArmholeDeeper: 0.01,
    frontNeckOpening: { pct: 100, min: 0, max: 200, menu: 'style', order: '270' },
    shoulderSlopeReduction: { pct: 0, min: 0, max: 80, menu: 'advanced' },
    fitWaist: {
      dflt: 'side',
      list: ['side', 'dart', 'off'],
      menu: 'advanced.fit',
    },
    fitWaistDartPct: {
      pct: 50,
      min: 0,
      max: 100,
      menu: (settings, mergedOptions) =>
        mergedOptions?.fitWaist === 'dart' ? 'advanced.fit' : false,
    },
    neckBasedOn: {
      dflt: 'head',
      list: ['neck', 'head', 'waist', 'seat'],
      menu: 'style',
      order: '200',
    },
    lengthBelowWaist: {
      pct: 75,
      min: -15,
      max: 100,
      ...pctBasedOn('waistToSeat'),
      menu: 'style',
      order: '500',
    },
    chestEase: { pct: 5, min: -10, max: 25, ...pctBasedOn('chest'), menu: 'fit', order: '400' },
    waistEase: { pct: 12, min: -20, max: 40, ...pctBasedOn('waist'), menu: 'fit', order: '500' },
    seatEase: { pct: 8, min: -20, max: 40, ...pctBasedOn('seat'), menu: 'fit', order: '600' },
    construction: {
      dflt: 'set-in',
      list: ['set-in', 'dolman', 'raglan', 'sleeveless', 'racerback'],
      menu: 'style',
      order: '100',
    },
    s3Collar: { pct: 0, min: -100, max: 100, menu: 'advanced.style' },
    s3Armhole: { pct: 0, min: -100, max: 100, menu: 'advanced.style' },
    sleevelessOpeningSize: {
      pct: 60,
      min: 20,
      max: 80,
      menu: (settings, mergedOptions) =>
        mergedOptions?.construction === 'sleeveless' || mergedOptions?.construction === 'racerback'
          ? 'style'
          : false,
    },
    sleevelessOpeningPitchFront: {
      pct: 100,
      min: 70,
      max: 120,
      menu: (settings, mergedOptions) =>
        mergedOptions?.construction === 'sleeveless' || mergedOptions?.construction === 'racerback'
          ? 'advanced.style'
          : false,
    },
    sleevelessOpeningPitchBack: {
      pct: 80,
      min: 60,
      max: 90,
      menu: (settings, mergedOptions) =>
        mergedOptions?.construction === 'sleeveless' ? 'advanced.style' : false,
    },
    dolmanSleeveLength: {
      pct: 30,
      min: 1,
      max: 120,
      ...pctBasedOn('shoulderToWrist'),
      menu: (settings, mergedOptions) =>
        mergedOptions?.construction === 'dolman' ? 'style' : false,
      order: '105',
    },
    hemAllowance: {
      pct: 300,
      min: 0,
      max: 600,
      ...pctBasedOnSa(),
      menu: (settings, mergedOptions) =>
        settings.sa && !mergedOptions.ribbingHeight ? 'construction' : false,
    },
    holeAllowance: {
      pct: 0,
      min: 0,
      max: 100,
      ...pctBasedOnSa(),
      menu: (settings) => (settings.sa ? 'construction' : false),
    },
    shoulderAngle: {
      deg: 25,
      min: 0,
      max: 35,
      menu: 'style',
      order: '250',
    },
    hasCollar: false, // can be overridden by child patterns to force seam allowance on neck
    straightHem: {
      bool: false,
      menu: 'style',
      order: '510',
    },
  },
  plugins: [bustPlugin],
  draft: ({
    part,
    points,
    paths,
    options,
    absoluteOptions,
    Path,
    Point,
    measurements,
    store,
    scale,
    utils,
  }) => {
    store.set('ribbingHeight', absoluteOptions.ribbingHeight ?? 0)

    if (measurements.hpsToBust && measurements.bustSpan) {
      points.cfBust = new Point(0, measurements.hpsToBust)
      points.bust = new Point(measurements.bustSpan / 2, measurements.hpsToBust)
    }

    let chestMeasurement
    if (options.draftForHighBust && measurements.highBust && measurements.bustFront) {
      // If bust fitting is enabled, draft a Brian-like top using the back chest measurement to primarily fit the back half of the body.
      // We'll adjust the front part separately with an FBA and stuff.
      // The back chest measurement is estimated here as the average between half the highBust measurement
      // and the "bustBack" measurement.
      // Both are valid approximations, but the high bust measurement may be a bit high (due to the upwards curve and extent of the bust)
      // and the bustBack measurement may be a bit low (because it usually sits below the bulk of shoulder blades).
      // So take the average, which results in a good approximation.
      // We could also use "highBustBack" as another potentially useful measurement, but let's try to keep it simple and limit
      // what the user needs to measure.
      // (This is then multiplied with 2 again to get the full chest circumference for Brian)
      chestMeasurement = measurements.highBust / 2 + (measurements.bust - measurements.bustFront)
    } else {
      chestMeasurement = measurements.chest
    }
    store.set('chestMeasurement', chestMeasurement)

    // scale acrossBack by chest Ease
    const shoulderEase = Math.min(0, options.chestEase)

    store.set('shoulderEase', (measurements.shoulderToShoulder * shoulderEase) / 2)

    // Center back (cb) vertical axis
    points.cbHps = new Point(0, 0)
    points.cbChest = new Point(0, measurements.hpsToBust)
    points.cbWaist = new Point(0, measurements.hpsToWaistBack)

    // Shoulder line
    points.hps = new Point(measurements.neck / options.collarFactor, 0)

    points.shoulder = utils.beamsIntersect(
      points.hps,
      points.hps.shift(measurements.shoulderSlope * -1, 100),
      new Point(measurements.shoulderToShoulder / 2 + store.get('shoulderEase'), -100),
      new Point(measurements.shoulderToShoulder / 2 + store.get('shoulderEase'), 100)
    )

    points.cbShoulder = new Point(0, points.shoulder.y)
    points.cbArmpit = new Point(0, points.cbWaist.y - measurements.waistToArmpit)

    // Determine armhole depth and cbShoulder independent of shoulder slope reduction
    points.cbArmhole = new Point(
      0,
      points.cbWaist.y - measurements.waistToArmpit * (1 - options.armholeDepth)
    )

    // Now take shoulder slope reduction into account
    points.shoulder.y -= (points.shoulder.y - points.cbHps.y) * options.shoulderSlopeReduction
    // Shoulder should never be higher than HPS
    if (points.shoulder.y < points.cbHps.y) points.shoulder = new Point(points.shoulder.x, 0)

    // Side back (cb) vertical axis
    points.armhole = new Point((chestMeasurement * (1 + options.chestEase)) / 4, points.cbArmhole.y)

    if (points.shoulder.x >= points.armhole.x) {
      store.flag.error({
        msg: 'toni:largeShoulderWidth',
      })
    }

    if (points.cbArmpit.y * 1.1 >= points.bust.y) {
      store.flag.error({
        msg: 'toni:lowArmpit',
      })
    }
    if (points.cbArmpit.y < points.shoulder.y + measurements.biceps / 2.5) {
      store.flag.error({
        msg: 'toni:highArmpit',
      })
    }

    // Armhhole
    points.armholePitch = new Point(
      (measurements.shoulderToShoulder * options.acrossBackFactor * (1 + shoulderEase)) / 2 +
        store.get('shoulderEase') / 2,
      points.shoulder.y + points.shoulder.dy(points.cbArmpit) / 2
    )
    // Armhole hollow
    points._tmp1 = new Point(points.armholePitch.x, points.armhole.y)
    points._tmp2 = points._tmp1.shift(45, 10)
    points._tmp3 = utils.beamsIntersect(
      points._tmp1,
      points._tmp2,
      points.armhole,
      points.armholePitch
    )
    points.armholeHollow = points._tmp1.shiftFractionTowards(points._tmp3, 0.5)
    points.armholeCp2 = points.armhole.shift(180, points._tmp1.dx(points.armhole) / 4)
    points.armholeHollowCp1 = points.armholeHollow.shift(
      -45,
      points.armholeHollow.dy(points.armhole) / 2
    )
    points.armholeHollowCp2 = points.armholeHollow.shift(
      135,
      points.armholePitch.dx(points.armholeHollow)
    )
    points.armholePitchCp1 = points.armholePitch.shift(
      -90,
      points.armholePitch.dy(points.armholeHollow) / 2
    )
    points.armholePitchCp2 = points.armholePitch.shift(
      90,
      points.shoulder.dy(points.armholePitch) / 2
    )
    points.shoulderCp1 = points.shoulder
      .shiftTowards(points.hps, points.shoulder.dy(points.armholePitch) / 5)
      .rotate(90, points.shoulder)

    let neckOpening = measurements[options.neckBasedOn]
    neckOpening *= options.neckOpeningSize
    const minNeckOpening = measurements.neck * 0.8
    let maxNeckOpening = points.armholePitch.x * options.collarFactor * 0.8
    maxNeckOpening = Math.min(maxNeckOpening, neckOpening)

    let neckOpeningWidth = minNeckOpening + (maxNeckOpening - minNeckOpening) * options.neckWidth

    points.neck = points.hps.shiftTowards(
      points.shoulder,
      (neckOpeningWidth - measurements.neck) / options.collarFactor
    )

    points.originalArmhole = points.armhole
    points.originalArmholeCp2 = points.armholeCp2

    constructNeck(part, neckOpening, maxNeckOpening)

    constructSidePoints(part)

    if (points.cfNeck.y > points.cbHem.y || points.cbNeck.y > points.cbHem.y) {
      store.flag.error({
        msg: 'toni:neckFittingFailed',
        replace: { circ: units(neckOpening) },
      })
    }

    points.anchor = points.cbWaist.clone()

    paths.collar = new Path()
      .move(points.neck)
      .curve(points.neckCp2Front, points.cfNeckCp1, points.cfNeck)
      .hide()
    points.s3ArmholeSplit = points.shoulder
    paths.backArmhole = paths.frontArmhole = new Path()
      .move(points.armholePitch)
      .curve(points.armholePitchCp2, points.shoulderCp1, points.shoulder)
      .hide()

    paths.saBase = new Path()
      .move(points.cbHem)
      .curve(points.cbHemCp2, points.sideHemCp1, points.sideHem)
      ._curve(points.sideWaistCp1, points.sideWaist)
      .curve(points.sideWaistCp2, points.armholeCp1, points.armhole)
      .curve(points.armholeCp2, points.armholeHollowCp1, points.armholeHollow)
      .curve(points.armholeHollowCp2, points.armholePitchCp1, points.armholePitch)
      .join(paths.frontArmhole)
      .line(points.neck)
      .join(paths.collar)

    points.title = new Point(20 * scale, points.cfArmhole.y - 15 * scale)
    store.cutlist.addCut({ cut: 1, onFold: true })

    store.set('neckDelta', points.cbNeck.dy(points.cfNeck))
    store.set('frontNeckHeight', points.neck.dy(points.cfNeck))
    store.set('neckBase', points.cfNeck.y)

    return part
  },
}

function calculateExtraLength(part, side, skipBellyAdjustment, skipSeatAdjustment) {
  const { measurements, points, options, store } = part.shorthand()

  if (side === 'back') {
    if (skipSeatAdjustment) {
      return 0
    }
    return points.seatFront.dx(points.seatBack) * 0.5
  } else if (side === 'front') {
    let bellyExtraLength
    if (skipBellyAdjustment) {
      bellyExtraLength = 0
    } else {
      bellyExtraLength = Math.max(0, points.waistBack.dx(points.waistFront)) * 0.5
    }
    let bustExtraLength = measurements.bust
      ? (measurements.bust * (1 + options.extraBustEase) - store.get('chestMeasurement')) * 0.5
      : 0
    return bellyExtraLength + bustExtraLength
  } else {
    return 0
  }
}

/**
 * Create waist and seat points, create a hem, and optionally fit the side seam length to the given value
 * @param part the part we're drafting
 * @param {false|'front'|'back'} side if we're drafting the base part or specifically the front or back
 * @param sideSeamLength The side seam length we want to fit to, or null to not fit
 */
export function constructSidePoints(part, side = false, sideSeamLength = null) {
  const { measurements, options, points, paths, Point, Path, utils, store, log, units } =
    part.shorthand()

  log.info(
    `🖋️ Constructing side seam points for \`${side || 'base'}\` part with target length \`${sideSeamLength ? units(sideSeamLength) : 'undefined'}\``
  )

  points.waistBack = new Point(
    (measurements.waistBackArc || measurements.waist / 4) * (1 + options.waistEase),
    points.cbWaist.y
  )
  points.waistFront = new Point(
    (measurements.waistFrontArc || measurements.waist / 4) * (1 + options.waistEase),
    points.cbWaist.y
  )

  points.cbSeat = new Point(0, points.cbWaist.y + measurements.waistToSeat)
  points.seatBack = new Point(
    (measurements.seatBackArc || measurements.seat / 4) * (1 + options.seatEase),

    points.cbSeat.y
  )
  points.seatFront = new Point(
    (measurements.seatFrontArc || measurements.seat / 4) * (1 + options.seatEase),
    points.cbSeat.y
  )

  if (measurements.hips && measurements.waistToHips) {
    points.cbHips = new Point(0, points.cbWaist.y + measurements.waistToHips)
    points.hips = new Point(
      (measurements.hips / 4) * (1 + Math.min(0, options.seatEase)),
      points.cbHips.y
    )
  }

  const skipBellyAdjustment =
    points.waistFront.x < points.armhole.x ||
    points.waistBack.dx(points.waistFront) < measurements.waist * 0.05

  if (skipBellyAdjustment) {
    log.info('🫄 Skipping full belly adjustment')
  } else {
    log.info('🫄 Enabling full belly adjustment')
  }

  if (!side || skipBellyAdjustment) {
    // No full belly adjustment necessary
    points.waist = points.waistBack.shiftFractionTowards(points.waistFront, 0.5)
  } else if (side === 'back') {
    points.waist = points.waistBack
  } else if (side === 'front') {
    points.waist = points.waistFront
  }

  const skipSeatAdjustment = points.seatFront.dx(points.seatBack) < measurements.seat * 0.05

  if (skipSeatAdjustment) {
    log.info('🍑 Skipping full seat adjustment')
  } else {
    log.info('🍑 Enabling full seat adjustment')
  }

  if (!side || skipSeatAdjustment) {
    // Front and back seat measurements are close enough that we keep front and back seat the same for simplicity
    points.seat = points.seatBack.shiftFractionTowards(points.seatFront, 0.5)
  } else if (side === 'back') {
    points.seat = points.seatBack
  } else if (side === 'front') {
    points.seat = points.seatFront
  }

  log.debug(`📏 Creating waist point with waist fitting: \`${options.fitWaist}\``)
  points.sideWaist = new Point(points.waist.x, points.waist.y * 0.9 + points.armhole.y * 0.1)

  if (options.fitWaist === 'dart') {
    store.set(
      'waistDart',
      Math.max(0, points.originalArmhole.x - points.waist.x) * options.fitWaistDartPct
    )
    const wideX = Math.max(points.originalArmhole.x, points.sideWaist.x)
    const xAdjust = wideX * options.fitWaistDartPct + points.waist.x * (1 - options.fitWaistDartPct)
    points.sideWaist.x = xAdjust
    points.waist.x = xAdjust
  } else if (options.fitWaist === 'off') {
    store.set('waistDart', 0)
    const wideX = Math.max(points.originalArmhole.x, points.sideWaist.x)
    points.sideWaist.x = wideX
    points.waist.x = wideX
  } else {
    store.set('waistDart', 0)
  }

  let angle = points.sideWaist.angle(points.armhole) - 90
  if (angle > 180) angle = angle - 360
  let sideWaistAngle = 90
  if (angle > 0) {
    log.info(`📐 Side waist is angled: \`${formatAngle(angle)}\``)
    sideWaistAngle += angle
    angle = 0
    points.sideWaist.y = points.waist.y
  } else {
    log.info('📐 Side waist is straight')
  }
  store.set('sideWaistAngle', sideWaistAngle)
  angle *= 2
  points._tmp6 = points._tmp2.shift(angle, 10)
  points.cfArmhole = new Point(
    0,
    points.cbWaist.y - measurements.waistToArmpit * (1 - options.armholeDepth)
  )
  points.armhole = new Point(points.armhole.x, points.cfArmhole.y)
  points.armholeCp2 = points.armhole.shift(180, points._tmp2.dx(points.armhole) / 4)
  points.armhole = utils.beamsIntersect(points.armhole, points.waist, points._tmp2, points._tmp6)
  points.armholeCp1 = points.armhole.shift(angle - 90, points.armhole.dist(points.sideWaist) * 0.5)
  points.armholeCp2 = points.armhole.shiftFractionTowards(points._tmp2, 0.25)

  const armHoleCorrection = points.armhole.dy(points.originalArmhole)

  points.armhole.y += armHoleCorrection
  points.armholeCp1.y += armHoleCorrection
  points.armholeCp2.y += armHoleCorrection
  const sideWaistCp1Base = points.sideWaist.shift(
    sideWaistAngle - 180,
    points.seat.dist(points.sideWaist) * 0.5
  )
  points.sideWaistCp1 = sideWaistCp1Base
  points.sideWaistCp2 = points.sideWaist.shift(
    sideWaistAngle,
    points.originalArmhole.dist(points.sideWaist) * 0.25
  )

  adjustSidePoints(part)

  log.debug(`📏 Creating hem`)
  let adjust = 0,
    yOffset
  const commonExtraLength =
    (calculateExtraLength(part, 'front', skipBellyAdjustment, skipSeatAdjustment) +
      calculateExtraLength(part, 'back', skipBellyAdjustment, skipSeatAdjustment)) /
    2
  for (let run = 0; run < 50; run++) {
    yOffset =
      points.cbWaist.y +
      measurements.waistToSeat * options.lengthBelowWaist -
      store.get('ribbingHeight') +
      commonExtraLength +
      adjust
    if (yOffset > points.sideWaist.y) {
      paths.sideSeamTemplate = new Path()
        .move(points.sideWaist)
        ._curve(points.sideWaistCp1, points.seat)
        .hide()

      const hemExtension = 10 + yOffset * 10
      if (hemExtension > 0) {
        const seatAngle = points.sideWaist.angle(points.seat)

        points.hemExtension = points.seat.shift(seatAngle, hemExtension)
        paths.sideSeamTemplate.line(points.hemExtension)
      }

      paths.sideSeamTemplate = paths.sideSeamTemplate.reverse().hide()

      points.sideHem = safeIntersectsY(yOffset, paths.sideSeamTemplate)[0]
    } else {
      paths.sideSeamTemplate = new Path()
        .move(points.sideWaist)
        .curve(points.sideWaistCp2, points.armholeCp1, points.armhole)
        .hide()

      points.sideHem = utils.curveIntersectsY(
        points.sideWaist,
        points.sideWaistCp2,
        points.armholeCp1,
        points.armhole,
        yOffset
      )
    }

    if (yOffset > points.sideWaist.y) {
      points.sideWaistCp1 = points.sideWaist.shiftFractionTowards(
        sideWaistCp1Base,
        options.lengthBelowWaist + (adjust - store.get('ribbingHeight')) / measurements.waistToSeat
      )
    }

    if (sideSeamLength === null) {
      break
    }

    let hemAngle
    if (yOffset > points.sideWaist.y) {
      hemAngle = points.sideHem.angle(points.sideWaistCp1)
    } else {
      hemAngle = paths.sideSeamTemplate.angleAt(points.sideHem)
    }

    points.sideHemCp1 = points.sideHem.shift(hemAngle + 90, points.sideHem.x * 0.15)
    points.cbHemCp2 = utils.beamIntersectsX(
      points.sideHem,
      points.sideHemCp1,
      points.sideHemCp1.x * 0.8
    )
    points.cbHemCp2.x *= 0.5
    points.cbHem = new Point(0, points.cbHemCp2.y)

    const sideSeam = createSideSeam(part)
    const delta = sideSeamLength - sideSeam.length()
    log.debug(`📏 Fitting side seam: Run \`${run}\`, delta is \`${units(delta)}\``)

    if (Math.abs(delta) < 0.1) {
      break
    }
    adjust += delta * (1 - run / 40) * 0.7
  }

  let hemAngle
  if (yOffset > points.sideWaist.y) {
    hemAngle = points.sideHem.angle(points.sideWaistCp1)
  } else {
    hemAngle = paths.sideSeamTemplate.angleAt(points.sideHem)
  }
  log.info(`📐 Hem angle is \`${formatAngle(hemAngle - 90)}\``)

  points.sideHemCp1 = points.sideHem.shift(hemAngle + 90, points.sideHem.x * 0.15)
  points.cbHemCp2 = utils.beamIntersectsX(
    points.sideHem,
    points.sideHemCp1,
    points.sideHemCp1.x * 0.8
  )
  points.cbHemCp2.x *= 0.5
  const extraLength =
    calculateExtraLength(part, side, skipBellyAdjustment, skipSeatAdjustment) - commonExtraLength
  if (extraLength > 0) {
    log.info(
      `📏 Moving hem down by \`${units(extraLength)}\` due to full bust/belly/seat adjustment`
    )

    points.cbHemCp2.y += extraLength
    points.cbHemCp2.x += extraLength * 2
    points.cbHemCp2.x = Math.min(points.cbHemCp2.x, points.sideHem.x)
    points.cbWaistAdjust = points.cbWaist.translate(0, extraLength)
  } else {
    log.info(`📏 Calculated hem extra length is \`${units(extraLength)}\`, skipping adjustment`)
    points.cbWaistAdjust = points.cbWaist
  }
  points.cbHem = new Point(0, points.cbHemCp2.y)

  const sideSeam = createSideSeam(part)
  log.info(`📏 Side seam length is \`${units(sideSeam.length())}\``)
}

function constructNeck(part, targetCircumference) {
  const { points, paths, options, Path, Point, utils, store, units, macro, log } = part.shorthand()

  // Neck opening (back)
  points._tmp4 = points.neck.shiftTowards(points.shoulder, 10).rotate(-90, points.neck)

  // Fit collar
  points.cfNeck = new Point(0, points.neck.y + new Point(0, 0).dist(points.neck))
  points.cbNeck = new Point(
    0,
    points.neck.y + new Point(0, 0).dist(points.neck) * options.backNeckCutout
  )
  let delta = 0
  let run = 0
  do {
    run++
    points.cfNeck = points.cfNeck.shift(90, delta / 3)
    points.cbNeck = points.cbNeck.shift(90, (delta / 3) * options.backNeckCutout)
    if (points.cfNeck.y < points.neck.y) {
      store.flag.error({
        msg: 'toni:neckFittingFailed',
        replace: { circ: units(targetCircumference) },
      })
      points.cfNeck = new Point(0, points.neck.y + 1)
    }
    if (points.cbNeck.y < points.neck.y) {
      store.flag.error({
        msg: 'toni:neckFittingFailed',
        replace: { circ: units(targetCircumference) },
      })
      points.cbNeck = new Point(0, points.neck.y + 1)
    }
    points.neckCp2 = utils.beamIntersectsY(points.neck, points._tmp4, points.cbNeck.y)
    points.neckCp2Front = utils.beamIntersectsY(points.neck, points._tmp4, points.cfNeck.y)
    points.neckCp2 = points.neck.shiftFractionTowards(points.neckCp2, utils.cbqc)
    points.neckCp2Front = points.neck.shiftFractionTowards(points.neckCp2Front, utils.cbqc)
    points.neckCp2 = points.neckCp2.rotate(-options.shoulderAngle, points.neck)
    points.neckCp2Front = points.neckCp2Front.rotate(options.shoulderAngle, points.neck)

    points.frontNeckCpEdge = utils.beamIntersectsY(
      points.neck,
      points.neckCp2Front,
      points.cfNeck.y
    )
    if (points.frontNeckCpEdge.x < 0) {
      store.flag.error({
        msg: 'toni:neckFittingFailed',
        replace: { circ: units(targetCircumference) },
      })
    }

    points.cfNeckCp1 = points.cfNeck.shiftFractionTowards(
      points.frontNeckCpEdge,
      utils.cbqc * options.frontNeckOpening
    )
    points.cbNeckCp1 = new Point(points.neck.x * 0.5, points.cbNeck.y)

    paths.neckOpening = new Path()
      .move(points.cfNeck)
      .curve(points.cfNeckCp1, points.neckCp2Front, points.neck)
      .curve(points.neckCp2, points.cbNeck, points.cbNeck)
      .attr('class', 'dashed stroke-xl various')
      .hide()
    delta = paths.neckOpening.length() * 2 - targetCircumference
    log.debug(`📏 Fitting neck: Run \`${run}\`, delta is \`${units(delta)}\``)
  } while (Math.abs(delta) > 0.1 && run < 10)

  log.info(
    `📏 Neck opening fitted to size \`${units(paths.neckOpening.length() * 2)}\` (targeted: \`${units(targetCircumference)}\`)`
  )

  paths.frontCollar = new Path()
    .move(points.neck)
    .curve(points.neckCp2Front, points.cfNeckCp1, points.cfNeck)

  paths.backCollar = new Path()
    .move(points.neck)
    .curve(points.neckCp2, points.cbNeckCp1, points.cbNeck)

  // update brian values
  store.set('s3CollarMaxFront', paths.frontCollar.length() * 0.375)
  store.set('s3CollarMaxBack', paths.backCollar.length() * 0.375)
  store.set('s3ArmholeMax', points.shoulder.dy(points.armholePitch) * 0.375)
  // store.set('library.sleeve.title', )

  // create these mirrored points for shoulder-seam-shift
  macro('mirror', {
    mirror: [points.hps, points.shoulder],
    points: [
      'cfNeck',
      'cbNeck',
      'cfNeckCp1',
      'cbNeckCp1',
      'neckCp2',
      'neckCp2Front',
      'armholePitch',
      'armholePitchCp2',
      'shoulderCp1',
    ],
    clone: true,
  })
}

/**
 * Prevent barrel shape and make sure that the seat is further out that the side waist plus
 * some factor determined by if the waist is concave or already further out than the armhole.
 * @param part
 */
export function adjustSidePoints(part) {
  const { points, log, paths, Path, measurements, store } = part.shorthand()
  const concaveWaist = points.waist.x < points.armhole.x
  log.debug(`📏 Waist is concave: \`${concaveWaist}\``)
  points.seat.x = Math.max(
    points.seat.x,
    points.sideWaist.x +
      Math.abs(points.sideWaist.dx(points.originalArmhole)) * (concaveWaist ? 0.25 : 1.25)
  )

  if (points.hips) {
    log.info(`📏 Fitting hips`)

    paths.hips = new Path()
      .move(points.cbHips)
      .line(points.hips)
      .attr('class', 'contrast help')
      .addText('hips', 'contrast help')
    points.originalSeat = points.seat.clone()
    let distance
    for (let i = 0; i < 10; i++) {
      const sideSeamTemplate = new Path().move(points.seat)
      sideSeamTemplate._curve(points.sideWaistCp1, points.sideWaist)

      const intersections = paths.hips.intersects(sideSeamTemplate)
      if (intersections.length > 0) {
        let intersection = intersections[0]
        distance = points.hips.dist(intersection)
        log.info(`📏 Hips distance: \`${units(distance)}\``)
        points.seat = points.seat.shift(0, distance)
      } else {
        break
      }
    }
    if (points.originalSeat.dist(points.seat) > 0.1 * measurements.seat || distance > 5) {
      store.flag.error({
        msg: `toni:hipsFittingFailed`,
      })
    }
  }
}
