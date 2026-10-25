import { front } from './front.mjs'
import { back } from './back.mjs'
import { pctBasedOn } from '@freesewing/core'

function draftPercyWaistFront({
  points,
  Point,
  paths,
  Path,
  options,
  complete,
  measurements,
  store,
  macro,
  utils,
  snippets,
  Snippet,
  sa,
  log,
  part,
}) {
  //Total width of garment at top of body pieces

  const garmentTopCircumference =
    (store.get('back_waist_width') + store.get('front_waist_width')) * 2

  const seatHeightCircumference = measurements.seat * (1 + options.seatEase)
  const waistHeightCircumference = measurements.waist * (1 + options.waistEase)
  const waistFrontEased = measurements.waistFront * (1 + options.waistEase)
  const waistBackEased = measurements.waistBack * (1 + options.waistEase)

  const waistToSeatSlope =
    (seatHeightCircumference - waistHeightCircumference) / measurements.waistToSeat

  const garmentEdgeBelowWaist =
    options.waistbandWidth * measurements.waistToFloor +
    (1 - options.waistHeight) * measurements.waistToHips
  const waistToGarmentSlopeFront =
    (store.get('front_waist_width') * 2 - waistFrontEased) / garmentEdgeBelowWaist
  const waistToGarmentSlopeBack =
    (store.get('back_waist_width') * 2 - waistBackEased) / garmentEdgeBelowWaist

  //Total cicumference of top of waistband
  const waistbandTopCircumference =
    waistHeightCircumference +
    waistToSeatSlope * measurements.waistToHips * (1 - options.waistHeight)

  //total length of front top of waistband
  const waistbandTopFront =
    waistFrontEased +
    waistToGarmentSlopeFront * measurements.waistToHips * (1 - options.waistHeight)
  //total length of back top of waistband
  const waistbandTopBack =
    waistBackEased + waistToGarmentSlopeBack * measurements.waistToHips * (1 - options.waistHeight)

  store.set('garmentTopCircumference', garmentTopCircumference)
  store.set('waistbandTopCircumference', waistbandTopCircumference)
  store.set('waistbandTopFront', waistbandTopFront)
  store.set('waistbandTopBack', waistbandTopBack)

  const length = store.get('frontPanelWidth')
  log.info('Front panel length is ' + length)
  const width = options.waistbandWidth * measurements.waistToFloor
  store.set('waistbandWidth', width)

  const waistbandTopRatio = waistbandTopCircumference / garmentTopCircumference
  const waistbandTopRatioFront = waistbandTopFront / (store.get('front_waist_width') * 2)
  const waistbandTopRatioBack = waistbandTopBack / (store.get('back_waist_width') * 2)
  store.set('waistbandTopRatio', waistbandTopRatio)
  store.set('waistbandTopRatioFront', waistbandTopRatioFront)
  store.set('waistbandTopRatioBack', waistbandTopRatioBack)

  const circleOuterRadius = width / (1 - waistbandTopRatioFront)
  store.set('waistband_outer_radius', circleOuterRadius)
  const circleInnerRadius = circleOuterRadius - width
  store.set('waistband_inner_radius', circleInnerRadius)

  const circlePercentage = length / (2 * 3.14 * circleOuterRadius)
  const circleAngle = circlePercentage * 360
  log.info(
    'front waistband is ' + circlePercentage + ' of total circle, or ' + circleAngle + ' degrees'
  )

  points.circleCenter = new Point(0, -circleInnerRadius)
  points.topCenter = new Point(0, 0)
  points.bottomCenter = new Point(0, circleOuterRadius - circleInnerRadius)
  macro('grainline', {
    from: points.topCenter,
    to: points.bottomCenter,
  })

  paths.seam = new Path()
    .move(points.bottomCenter)
    .circleSegment(circleAngle / 2, points.circleCenter)

  points.bottomRight = paths.seam.end()
  points.topRight = points.bottomRight.shiftTowards(points.circleCenter, width)

  paths.seam = paths.seam.line(points.topRight).circleSegment(-circleAngle, points.circleCenter)

  points.topLeft = paths.seam.end()
  points.bottomLeft = points.topLeft.shiftTowards(points.circleCenter, -width)

  paths.seam = paths.seam
    .line(points.bottomLeft)
    .circleSegment(circleAngle / 2, points.circleCenter)
    .close()

  paths.bottomCurve = new Path()
    .move(points.bottomLeft)
    .circleSegment(circleAngle, points.circleCenter)
    .hide()

  paths.topCurve = new Path()
    .move(points.topLeft)
    .circleSegment(circleAngle, points.circleCenter)
    .hide()

  if (sa) {
    paths.saBase = paths.seam
    paths.sa = paths.saBase.offset(sa).setClass('sa')
  }

  if (options.frontPleat) {
    const centerToPleat = store.get('centerToPleat')
    points.pleatLeft = paths.bottomCurve.shiftAlong(paths.bottomCurve.length() / 2 + centerToPleat)
    points.pleatRight = paths.bottomCurve.shiftAlong(paths.bottomCurve.length() / 2 - centerToPleat)
    snippets['pleatLeftNotch'] = new Snippet('notch', points.pleatLeft)
    snippets['pleatRightNotch'] = new Snippet('notch', points.pleatRight)
  }

  //draw the buttonholes
  let overlap = store.get('frontPanelOverlap') / 2
  points.overlapBottomRight = paths.bottomCurve.reverse().shiftAlong(overlap)
  points.overlapTopRight = paths.topCurve.reverse().shiftAlong(overlap * waistbandTopRatio)
  //points.overlapTopRightRight = new Point(waistbandTopRatio * (bottom_length / 2 - overlap), 0)
  paths.overlapRight = new Path()
    .move(points.overlapTopRight)
    .line(points.overlapBottomRight)
    .setClass('sa')
    .hide()

  points.overlapBottomLeft = paths.bottomCurve.shiftAlong(overlap)
  points.overlapTopLeft = paths.topCurve.shiftAlong(overlap * waistbandTopRatio)
  paths.overlapLeft = new Path()
    .move(points.overlapTopLeft)
    .line(points.overlapBottomLeft)
    .setClass('sa')
    .hide()

  overlap = Math.min(overlap, paths.overlapRight.length() / 3)

  snippets['buttonhole_0'] = new Snippet(
    'buttonhole-end',
    paths.overlapRight.shiftAlong(overlap)
  ).rotate(90)
  snippets['buttonhole_1'] = new Snippet(
    'buttonhole-end',
    paths.overlapRight.reverse().shiftAlong(overlap)
  ).rotate(90)
  snippets['buttonhole_2'] = new Snippet(
    'buttonhole-start',
    paths.overlapLeft.shiftAlong(overlap)
  ).rotate(90)
  snippets['buttonhole_3'] = new Snippet(
    'buttonhole-start',
    paths.overlapLeft.reverse().shiftAlong(overlap)
  ).rotate(90)

  if (sa) {
    paths.saBase = paths.seam
    paths.sa = paths.saBase.offset(sa).setClass('sa')
  }

  store.cutlist.addCut()
  store.cutlist.addCut({ cut: 1, from: 'interfacing' })

  points.titleAnchor = points.topCenter.shiftFractionTowards(points.bottomLeft, 0.5)

  macro('title', {
    nr: 4,
    title: 'waist_front',
    at: points.titleAnchor,
    scale: 0.8,
  })

  macro('hd', {
    id: 'topLength',
    from: points.topLeft,
    to: points.topRight,
    y: points.topRight.y,
  })
  macro('hd', {
    id: 'bottomLength',
    from: points.bottomLeft,
    to: points.bottomRight,
    y: points.bottomRight.y,
  })

  macro('vd', {
    id: 'height',
    from: points.topLeft.shiftFractionTowards(points.topRight, 0.5),
    to: points.bottomLeft.shiftFractionTowards(points.bottomRight, 0.5),
    x: points.bottomLeft.shiftFractionTowards(points.bottomRight, 0.5).x + sa + 15,
  })

  macro('vd', {
    id: 'topOffset',
    from: points.topLeft.shiftFractionTowards(points.topRight, 0.5),
    to: points.topCenter,
    x: points.bottomLeft.shiftFractionTowards(points.bottomRight, 0.5).x,
  })
  macro('vd', {
    id: 'bottomOffset',
    from: points.bottomCenter,
    to: points.bottomLeft.shiftFractionTowards(points.bottomRight, 0.5),
    x: points.bottomLeft.shiftFractionTowards(points.bottomRight, 0.5).x,
  })

  macro('ld', {
    id: 'diagonalLeft',
    from: points.bottomLeft,
    to: points.topLeft,
    d: -15,
  })
  macro('ld', {
    id: 'diagonalRight',
    to: points.bottomRight,
    from: points.topRight,
    d: -15,
  })

  macro('hd', {
    id: 'hLeft',
    to: points.bottomLeft,
    from: points.topLeft,
    y: points.topLeft.y,
  })
  macro('vd', {
    id: 'vLeft',
    to: points.bottomLeft,
    from: points.topLeft,
    x: points.bottomLeft.x,
  })

  macro('hd', {
    id: 'hRight',
    from: points.bottomRight,
    to: points.topRight,
    y: points.topRight.y,
  })
  macro('vd', {
    id: 'vRight',
    from: points.bottomRight,
    to: points.topRight,
    x: points.bottomRight.x,
  })
  macro('pd', {
    id: 'lengthBottom',
    path: paths.bottomCurve,
    d: 15 + sa,
  })
  macro('pd', {
    id: 'lengthTop',
    path: paths.topCurve,
    d: 15 + sa,
  })

  return part
}

export const waist_front = {
  name: 'percy.waist_front',
  measurements: [],
  after: [front, back],
  options: {},
  draft: draftPercyWaistFront,
}
