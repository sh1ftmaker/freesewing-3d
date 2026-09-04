import {
  buildOutlinePaths,
  buildSaPaths,
  front as toniFront,
  base as toniBase,
} from '@freesewing/toni'
import { back } from './back.mjs'

function getIntersectionY(path, sideOffset) {
  const y = path.intersectsY(sideOffset)
  if (y.length > 0) return y
  // Sometimes the intersection is directly on a node of the sidepath
  // (especially with the default front coverage of 30 for some reason)
  // so shift the y coordinate a little bit
  // Intersecting the path exactly on the corner points sometimes doesn't work
  // See issue #3367
  sideOffset += 0.001
  return path.intersectsY(sideOffset)
}

function tinaFront({
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
  measurements,
  macro,
  complete,
  part,
  scale,
}) {
  delete snippets.armholePitchNotchReversed
  delete paths.waistLine
  macro('rmBanner', 'waistLine')
  delete paths.chestLine
  macro('rmBanner', 'chestLine')
  delete snippets.mirroredBustPoint
  delete snippets.sideChestNotch
  delete snippets.mirroredSideChestNotch
  delete snippets.sideWaistNotch
  delete snippets.mirroredSideWaistNotch

  points.underbust = points.cbWaist.shift(90, measurements.waistToUnderbust)

  macro('mirror', {
    mirror: [points.cfNeck, points.cfHem],
    clone: true,
    points: ['sideHem', 'sideHemExtend', 'sideHemCp1', 'cfHemCp2'],
  })
  let sideOffset
  let rotationAngle

  const diagonalEase = options.frontEase

  function getRotationAngle() {
    // this is a basic estimate
    const angle =
      (180 / Math.PI) *
      points.shoulder.dist(points.mirroredSideJoin) *
      (diagonalEase / points.mirroredSideHem.dist(points.sideHem))

    let limit = points.mirroredSideHem.angle(points.neck) - 90
    if (!store.splitFrontPart && options.lengthBonus > 0) {
      limit = limit * Math.max(0, 1 - options.lengthBonus)
    }

    if (angle < limit) {
      // rotating it further would lengthen the diagonal again
      return limit
    }
    return angle
  }

  function getSplitPath(path, splitPoint, index) {
    const tmp = path.split(splitPoint)[index]
    if (tmp && !Array.isArray(tmp)) return tmp
    return new Path().move(splitPoint)
  }

  /**
   * Adjusts the given rotation origin so that the length of the curved seams stays the same as
   * it would be without rotation.
   *
   * This ensures that with negative front ease setting, the hem or split seam stays the same length
   * even when the left (mirrored) path is rotated towards the neck point
   *
   * @param {Point} side
   * @returns {Point}
   */
  function adjustRotationOrigin(side) {
    const center = new Point(0, side.y)
    const mirror = new Point(-side.x, side.y)
    const expectedLength = side.dist(mirror)
    let rotationOrigin = side
    let steps = 0
    while (steps < 1000) {
      const target = mirror.rotate(rotationAngle, rotationOrigin)
      const tmpPath = new Path().move(target)._curve(center, side).hide()
      if (tmpPath.length() <= expectedLength) {
        return rotationOrigin
      }
      rotationOrigin = rotationOrigin.shift(-90, 1)
      steps++
    }
    console.error('failed to adjust rotation origin within 1000 steps')
    return rotationOrigin
  }

  if (options.frontCoverage > 0) {
    store.splitDist = sa ? sa * 4 : 40

    const dartHeight = points.endDart ? points.endDart.dy(points.startDart) : 0
    sideOffset =
      points.sideHem.y * (1 - options.frontCoverage) +
      (points.underbust.y + dartHeight) * options.frontCoverage

    let intersection = getIntersectionY(paths.originalSideSeam, sideOffset)
    points.sideJoin = intersection.length > 0 ? intersection[0] : points.armhole
    points.mirroredSideJoin = new Point(-points.sideJoin.x, points.sideJoin.y)

    store.splitFrontPart =
      options.splitFrontPart && points.sideHem.y - sideOffset > store.splitDist * 3

    rotationAngle = getRotationAngle()

    macro('mirror', {
      mirror: [new Point(0, 0), new Point(0, 100)],
      paths: ['originalSideSeam'],
      clone: true,
    })
    paths.mirroredSide = getSplitPath(paths.mirroredOriginalSideSeam, points.mirroredSideJoin, 0)
      .reverse()
      .hide()

    points.rotationOrigin = adjustRotationOrigin(
      store.splitFrontPart ? points.sideJoin : points.sideHem
    )

    paths.easeMirroredSide = paths.mirroredSide.rotate(rotationAngle, points.rotationOrigin).hide()
  } else {
    points.sideJoin = points.sideHem.shiftFractionTowards(points.cfHem, -options.frontCoverage)
    points.mirroredSideJoin = new Point(-points.sideJoin.x, points.sideJoin.y)

    store.splitFrontPart = false

    rotationAngle = getRotationAngle()

    points.rotationOrigin = adjustRotationOrigin(points.sideHem)
  }

  points.easeMirroredSideJoin = points.mirroredSideJoin.rotate(rotationAngle, points.rotationOrigin)
  points.easeMirroredSideHem = points.mirroredSideHem.rotate(rotationAngle, points.rotationOrigin)
  points.easeMirroredSideHemCp1 = points.mirroredSideHemCp1.rotate(
    rotationAngle,
    points.rotationOrigin
  )

  points.mirroredBust = new Point(-measurements.bustSpan / 2, measurements.hpsToBust)
  paths.hemBaseHalf = paths.hem

  if (options.straightHem) {
    points.easeMirroredSideHemExtend = points.mirroredSideHemExtend.rotate(
      rotationAngle,
      points.rotationOrigin
    )

    paths.hemBase = new Path()
      .move(points.mirroredSideHemExtend)
      .line(points.cfHem)
      .line(points.sideHemExtend)
      .hide()
    paths.easeHemBase = new Path()
      .move(points.easeMirroredSideHemExtend)
      .line(points.cfHem)
      .line(points.sideHemExtend)
      .hide()
  } else {
    paths.hemBase = new Path()
      .move(points.mirroredSideHem)
      .curve(points.mirroredSideHemCp1, points.mirroredCfHemCp2, points.cfHem)
      .curve(points.cbHemCp2, points.sideHemCp1, points.sideHem)
      .hide()

    paths.easeHemBase = new Path()
      .move(points.easeMirroredSideHem)
      .curve(points.easeMirroredSideHemCp1, points.mirroredCfHemCp2, points.cfHem)
      .curve(points.cbHemCp2, points.sideHemCp1, points.sideHem)
      .hide()
  }
  if (options.frontCoverage <= 0) {
    points.mirroredSideJoin = paths.hemBase.projectPoint(points.mirroredSideJoin)
    points.easeMirroredSideJoin = paths.easeHemBase.projectPoint(points.easeMirroredSideJoin)
    points.sideJoin = paths.hemBase.projectPoint(points.sideJoin)

    paths.hemBase = paths.hemBase.split(points.mirroredSideJoin)[1].hide()
    paths.easeHemBase = paths.easeHemBase.split(points.easeMirroredSideJoin)[1].hide()
  }

  snippets.sideJoin = new Snippet('bnotch', points.sideJoin)
  snippets.mirroredSideJoin = new Snippet('bnotch', points.easeMirroredSideJoin)

  if (complete) {
    paths.alignPath = new Path()
      .move(points.easeMirroredSideJoin.shiftFractionTowards(points.sideJoin, 0.05))
      .line(points.sideJoin.shiftFractionTowards(points.easeMirroredSideJoin, 0.05))
      .addClass('dashed note')
      .addText('align between mirrored parts', 'center note help')
      .attr('marker-start', 'url(#grainlineFrom)')
      .attr('marker-end', 'url(#grainlineTo)')
  }

  paths.tinaDiagonalSeam = new Path()
    .move(points.neck)
    .curve(points.neckCp2, points.neckCp2, points.easeMirroredSideJoin)
    .hide()

  store.diagnonalLength = paths.tinaDiagonalSeam.length()

  let pathBuilder

  const upperPathsFront = [...store.get('upperPathsFront')].filter(
    (path) => path.p !== 'frontCollar'
  )

  if (store.splitFrontPart) {
    let splitOffset = sideOffset + store.splitDist
    if (points.startGather) {
      splitOffset = Math.max(splitOffset, points.startGather.y)
    }
    points.cfSplit = new Point(0, splitOffset)

    paths.sideSeamBottom = paths.sideSeam1 ?? paths.sideSeam

    let intersection = paths.sideSeamBottom.intersectsY(splitOffset)
    points.sideSplit = intersection[0]
    points.mirroredSideSplit = new Point(-points.sideSplit.x, points.sideSplit.y)
    points.easeMirroredSideSplit = points.mirroredSideSplit.rotate(
      rotationAngle,
      points.rotationOrigin
    )

    const sideSeamSplit = paths.sideSeamBottom.split(points.sideSplit)
    paths.upperSide = sideSeamSplit[1].hide()
    paths.lowerSide = sideSeamSplit[0].hide()

    paths.mirroredUpperSide = getSplitPath(
      paths.easeMirroredSide,
      points.easeMirroredSideSplit,
      0
    ).hide()
    paths.mirroredLowerSide = getSplitPath(paths.mirroredSide, points.mirroredSideSplit, 1).hide()

    paths.topSplit = new Path()
      .move(points.easeMirroredSideSplit)
      ._curve(points.cfSplit, points.sideSplit)
      .hide()

    if (paths.dart) {
      pathBuilder = [
        { p: 'upperSide', offset: sa },
        { p: 'dart', offset: 0, sa: 'skip' },
        { p: 'sideSeam2', offset: sa },
        ...upperPathsFront,
        { p: 'tinaDiagonalSeam', offset: sa * options.holeAllowance },
        { p: 'mirroredUpperSide', offset: sa },
        { p: 'topSplit', offset: sa },
      ]
    } else {
      pathBuilder = [
        { p: 'upperSide', offset: sa },
        ...upperPathsFront,
        { p: 'tinaDiagonalSeam', offset: sa * options.holeAllowance },
        { p: 'mirroredUpperSide', offset: sa },
        { p: 'topSplit', offset: sa },
      ]
    }

    buildOutlinePaths(part, pathBuilder)
    buildSaPaths(part, pathBuilder)

    paths.bottomTop = new Path().move(paths.lowerSide.end()).line(points.cfSplit).hide()
    paths.bottomCenter = new Path().move(points.cfSplit).line(points.cfHem).hide()
    store.set('bottomPathBuilder', [
      { p: 'hemBaseHalf', offset: absoluteOptions.hemAllowance },
      { p: 'lowerSide', offset: sa },
      { p: 'bottomTop', offset: sa },
      { p: 'bottomCenter', offset: 0, center: true },
    ])
  } else {
    if (paths.dart) {
      pathBuilder = [
        { p: 'easeHemBase', offset: absoluteOptions.hemAllowance },
        { p: 'sideSeam1', offset: sa },
        { p: 'dart', offset: 0, sa: 'skip' },
        { p: 'sideSeam2', offset: sa },
        ...upperPathsFront,
        { p: 'tinaDiagonalSeam', offset: absoluteOptions.holeAllowance },
      ]
    } else {
      pathBuilder = [
        { p: 'easeHemBase', offset: absoluteOptions.hemAllowance },
        { p: 'sideSeam', offset: sa },
        ...upperPathsFront,
        { p: 'tinaDiagonalSeam', offset: absoluteOptions.holeAllowance },
      ]
    }

    if (paths.easeMirroredSide) {
      pathBuilder.push({ p: 'easeMirroredSide', offset: sa })
    }

    buildOutlinePaths(part, pathBuilder)
    buildSaPaths(part, pathBuilder)

    macro('grainline', {
      from: points.bust,
      to: points.cfHem.shift(0, measurements.bustSpan / 2),
    })
  }

  const grainLineBottom = new Point(points.neck.x, (points.sideSplit ?? points.sideHem).y).rotate(
    rotationAngle / 2,
    points.neck
  )

  if (options.plotFitHelpers) {
    snippets.bustPoint = new Snippet('notch', points.bust)
    snippets.mirroredBustPoint = new Snippet('notch', points.mirroredBust)

    macro('mirror', {
      mirror: [new Point(0, 0), new Point(0, 100)],
      paths: ['outline'],
      clone: true,
    })

    paths.mirroredOutline.attr('class', 'dotted stroke-xs')
    if (store.get('bottomPathBuilder')) {
      buildOutlinePaths(part, store.get('bottomPathBuilder'), 'bottom', true, 'fabric')
      paths.bottom = paths.bottom.attr('class', 'dotted stroke-xs')
      paths.mirroredBottom = paths.mirroredBottom.clone().unhide().attr('class', 'dotted stroke-xs')
    }
  }

  macro('grainline', {
    from: points.neck,
    to: grainLineBottom,
  })

  points.title = points.mirroredBust
    .shiftFractionTowards(points.shoulderCp1, 0.6)
    .shiftFractionTowards(points.cfSplit ?? points.cfHem, options.lengthBonus / 4)
  delete snippets.logo

  macro('rmCutOnFold', 'cutonfold')

  store.cutlist.setCut({ cut: 2, from: 'fabric', onFold: false })

  macro('title', { at: points.cbChest.translate(scale * 15, 0), nr: 1, title: 'front' })

  macro('pd', {
    id: 'pDiagonal',
    path: paths.tinaDiagonalSeam.reverse(),
    d: -3 * sa - 15,
  })

  return part
}

export const front = {
  name: 'tina.front',
  from: toniFront,
  after: [back],
  measurements: ['waistToUnderbust'],
  hide: { from: true },
  options: {
    frontCoverage: { pct: 25, min: -75, max: 100, menu: 'style' },
    frontEase: { pct: -6, min: -30, max: 0, menu: 'fit' },
    plotFitHelpers: { bool: false, menu: 'advanced' },
    splitFrontPart: { bool: true, menu: 'advanced' },
    construction: {
      ...toniBase.options.construction,
      list: ['set-in', 'sleeveless', 'racerback'],
    },
  },
  draft: tinaFront,
}
