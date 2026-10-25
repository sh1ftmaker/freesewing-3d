import { front } from './front.mjs'
import { waist_front } from './waist_front.mjs'

function draftPercyWaistSide({
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
  const bottom_length = store.get('side_panel_width')
  log.info('Side panel length is ' + bottom_length)
  const width = store.get('waistbandWidth')

  //const length_percentage = bottom_length / store.get('garmentTopCircumference')
  //const top_length = length_percentage * store.get('waistbandTopCircumference')

  const waistbandTopRatioFront = store.get('waistbandTopRatioFront')

  const circleOuterRadius = store.get('waistband_outer_radius')
  const circleInnerRadius = store.get('waistband_inner_radius')

  const circlePercentage = bottom_length / (2 * 3.14 * circleOuterRadius)
  const circleAngle = circlePercentage * 360
  log.info(
    'side waistband is ' + circlePercentage + ' of total circle, or ' + circleAngle + ' degrees'
  )

  points.circleCenter = new Point(0, -circleInnerRadius)
  points.topCenter = new Point(0, 0)
  points.bottomCenter = new Point(0, circleOuterRadius - circleInnerRadius)
  paths.centerLine = new Path()
    .move(points.topCenter)
    .line(points.bottomCenter)
    .setClass('note help')

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

  //draw the buttons
  let overlap = store.get('frontPanelOverlap') / 2
  points.overlapBottom = paths.bottomCurve.reverse().shiftAlong(overlap)
  points.overlapTop = paths.topCurve.reverse().shiftAlong(overlap * waistbandTopRatioFront)
  //points.overlapTopRight = new Point(waistbandTopRatioFront * (bottom_length / 2 - overlap), 0)
  paths.overlap = new Path()
    .move(points.overlapTop)
    .line(points.overlapBottom)
    .setClass('sa')
    .hide()

  overlap = Math.min(overlap, paths.overlap.length() / 3)

  snippets['button_0'] = new Snippet('button', paths.overlap.shiftAlong(overlap)).rotate(90)
  snippets['button_1'] = new Snippet('button', paths.overlap.reverse().shiftAlong(overlap)).rotate(
    90
  )

  store.cutlist.addCut({ cut: 4 })
  store.cutlist.addCut({ cut: 2, from: 'interfacing' })

  points.titleAnchor = points.topCenter
    .shiftFractionTowards(points.bottomCenter, 0.5)
    .shiftFractionTowards(points.bottomLeft, 0.4)
  macro('title', {
    nr: 5,
    title: 'waist_side',
    at: points.titleAnchor,
    scale: 0.7,
  })

  points.grainlineBottom = points.bottomCenter
  points.grainlineTop = points.topCenter
  macro('grainline', {
    from: points.grainlineTop,
    to: points.grainlineBottom,
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
    to: points.grainlineTop,
    x: points.bottomLeft.shiftFractionTowards(points.bottomRight, 0.5).x,
  })
  macro('vd', {
    id: 'bottomOffset',
    from: points.grainlineBottom,
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

export const waist_side = {
  name: 'percy.waist_side',
  measurements: [],
  after: [front, waist_front],
  options: {},
  draft: draftPercyWaistSide,
}
