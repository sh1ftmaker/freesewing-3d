import { capitalize } from '@freesewing/core'

export function buildOutlinePaths(
  part,
  pathBuilder,
  pathName = 'outline',
  forceExpand = false,
  className = 'fabric'
) {
  let { macro, paths, expand, store } = part.shorthand()

  delete paths[pathName]
  delete paths['mirrored' + capitalize(pathName)]

  paths[pathName] = macro('sa', {
    paths: pathBuilder.map((pb) => {
      return pb === null ? null : { ...pb, offset: 0, hidden: pb.center && (expand || forceExpand) }
    }),
  }).setClass(className)

  const centerPathName = pathBuilder.find((pb) => pb?.center === true)
  if (centerPathName === undefined) return
  const centerPath = paths[centerPathName.p]

  if (expand || forceExpand) {
    macro('mirror', {
      clone: true,
      mirror: [centerPath.start(), centerPath.end()],
      paths: [pathName],
    })
    macro('grainline', {
      from: centerPath.start(),
      to: centerPath.end(),
    })
    store.flag.preset('expandIsOn')
  } else {
    macro('cutonfold', {
      from: centerPath.start(),
      to: centerPath.end(),
      grainline: true,
    })
    store.flag.preset('expandIsOff')
  }
}

export function buildSaPaths(part, pathBuilder, pathName = 'sa', className = 'fabric sa') {
  let { sa, macro, paths, expand } = part.shorthand()

  delete paths[pathName]
  delete paths['mirrored' + capitalize(pathName)]

  if (!sa) {
    return
  }
  const paths1 = pathBuilder
    .filter((pb) => pb?.sa !== 'skip')
    .map((pb) => {
      return pb === null || pb.offset === 0 ? null : { ...pb, hidden: pb.hidden || pb.center }
    })
  paths[pathName] = macro('sa', {
    paths: paths1,
    class: className,
  })

  const centerPathName = pathBuilder.find((pb) => pb?.center === true)
  if (centerPathName === undefined) return
  const centerPath = paths[centerPathName.p]

  if (expand) {
    macro('mirror', {
      clone: true,
      mirror: [centerPath.start(), centerPath.end()],
      paths: [pathName],
    })
  }
}

export function armholeLength(points, Path, upperArmholePath) {
  return new Path()
    .move(points.armhole)
    .curve(points.armholeCp2, points.armholeHollowCp1, points.armholeHollow)
    .curve(points.armholeHollowCp2, points.armholePitchCp1, points.armholePitch)
    .join(upperArmholePath)
    .length()
}

export function armholeToArmholePitch(points, Path) {
  return new Path()
    .move(points.armhole)
    .curve(points.armholeCp2, points.armholeHollowCp1, points.armholeHollow)
    .curve(points.armholeHollowCp2, points.armholePitchCp1, points.armholePitch)
    .length()
}

export function verticalSplit(Path, path, splitPoint) {
  const tmp = path.split(splitPoint)
  if (!tmp[0]) tmp[0] = new Path().move(splitPoint)
  if (!tmp[1]) tmp[1] = new Path().move(splitPoint)
  return tmp
}

export function createSideSeam(part) {
  const { Path, points, utils, paths, options } = part.shorthand()

  paths.hem = new Path()
    .move(points.cbHem)
    .curve(points.cbHemCp2, points.sideHemCp1, points.sideHem)
    .hide()

  points.circleCenter =
    utils.beamsIntersect(points.cbHem, points.cbHemCp2, points.sideHem, points.sideHemCp1) ||
    points.cbHem
  points.sideHemExtend = points.circleCenter.shift(0, points.circleCenter.dist(points.sideHem))
  let p = new Path().move(points.sideHem)

  if (points.sideHem.y > points.sideWaist.y) {
    if (options.straightHem) {
      p = new Path().move(points.sideHemExtend)
      p = p.circleSegment(points.circleCenter.angle(points.sideHem), points.circleCenter)
      paths.hem = new Path().move(points.cbHem).line(points.sideHemExtend).hide()
    }
    p._curve(points.sideWaistCp1, points.sideWaist)
  } else {
    if (options.straightHem) {
      p = new Path().move(points.sideHemExtend)
      p = p.line(points.sideHem)
      paths.hem = new Path().move(points.cbHem).line(points.sideHemExtend).hide()
    }
  }
  p.curve(points.sideWaistCp2, points.armholeCp1, points.armhole)

  return p
}

export function formatAngle(angle) {
  return angle.toFixed(2) + '°'
}

export function pointPathDistance(point, path) {
  let project = path.projectPoint(point)

  return point.dist(project)
}

let pointCache = null
let pointCachePath = null

function getPathControlPoints(b) {
  if (pointCachePath === b) return pointCache
  let points = []
  for (let i = 0.125; i < 1; i += 0.125) {
    points.push(b.shiftFractionAlong(i))
  }
  pointCache = points
  pointCachePath = b
  return points
}

export function pathPathDistance(a, b) {
  if (a.intersects(b).length > 0) return 0
  let min = Infinity
  let points = getPathControlPoints(b)
  for (let point of points) {
    min = Math.min(min, pointPathDistance(point, a))
  }
  return min
}

export function addText(part, path, point, text) {
  const { complete, scale } = part.shorthand()
  if (!complete) return
  point.setText(text, 'fill-contrast text-sm')
  let rotation = -90 - path.angleAt(point)
  const transform =
    'matrix(' +
    `${scale}, 0, 0, ${scale}, ` +
    `${point.x - scale * point.x}, ` +
    `${point.y - scale * point.y}` +
    `) rotate(${rotation} ${point.x} ${point.y})`
  point.attr('data-text-transform', transform, true)
  point.attr('data-text-dx', 4, true)
  point.attr('data-text-dy', 2, true)
}

export function draftRibbing(part, length) {
  const { store, points, paths, Path, Point, expand, sa, macro, units, scale } = part.shorthand()
  const height = store.get('ribbingHeight')

  if (height === 0) return part.hide()

  if (expand) {
    store.flag.preset('expandIsOn')
  } else {
    // Expand is off, do not draw the part but flag this to the user
    const extraSa = sa ? 2 * sa : 0
    store.flag.note({
      msg: `toni:cut${capitalize(part.name.split('.')[1])}`,
      notes: [sa ? 'flag:saIncluded' : 'flag:saExcluded', 'flag:partHiddenByExpand'],
      replace: {
        w: units(2 * height + extraSa),
        l: units(length + extraSa),
      },
      suggest: {
        text: 'flag:show',
        icon: 'expand',
        update: {
          settings: ['expand', 1],
        },
      },
    })
    // Also hint about expand
    store.flag.preset('expandIsOff')

    return part.hide()
  }

  points.topLeft = new Point(0, 0)
  points.topCenter = new Point(height, 0)
  points.topRight = new Point(height * 2, 0)
  points.bottomLeft = new Point(0, length)
  points.bottomCenter = new Point(points.topCenter.x, length)
  points.bottomRight = new Point(points.topRight.x, length)

  paths.seam = new Path()
    .move(points.bottomRight)
    .line(points.topRight)
    .line(points.topLeft)
    .line(points.bottomLeft)
    .line(points.bottomRight)
    .close()
    .addClass('various')

  paths.fold = new Path().move(points.bottomCenter).line(points.topCenter).addClass('various help')

  if (sa) paths.sa = macro('sa', { paths: ['seam'] }).addClass('various sa')

  /*
   * Annotations
   */
  // Title
  points.title = new Point(points.bottomRight.x / 3, scale * 10)

  // Dimensions
  macro('vd', {
    id: 'hFull',
    from: points.bottomRight,
    to: points.topRight,
    x: points.topRight.x + sa + 15,
  })
  macro('hd', {
    id: 'wFull',
    from: points.topLeft,
    to: points.topRight,
    y: points.topRight.y - sa - 15,
  })
  macro('grainline', {
    from: points.bottomLeft.translate(0, -15 - sa),
    to: points.bottomRight.translate(0, -15 - sa),
  })
}
export function safeIntersectsY(y, path) {
  let intersectsY = path.intersectsY(y)
  if (intersectsY.length === 0) {
    y -= 0.1
    intersectsY = path.intersectsY(y)
  }
  return intersectsY
}

export function drawHelpLine(
  part,
  id,
  lineId,
  start,
  sideOffset,
  dartCorrection = false,
  design = 'toni'
) {
  const { points, paths, Path, Point, Snippet, snippets, utils, macro, expand, complete } =
    part.shorthand()
  if (!complete) return

  function plotSidePoint(sideWaistOffset, reverse) {
    if (reverse) {
      return paths.sideHelper.reverse().shiftAlong(measureSideSeam(part) - sideWaistOffset)
    }
    return paths.sideHelper.shiftAlong(sideWaistOffset)
  }

  if (sideOffset > 0) {
    points[id] = plotSidePoint(sideOffset, dartCorrection)
    snippets[id] = new Snippet('notch', points[id])

    const angle = paths.sideHelper.angleAt(points[id])
    const tmpId = '__tmp' + id
    const sideCpId = id + 'Cp1'
    const centerCpId = id + 'Cp2'
    points[tmpId] = points[id].shift(90 + angle, 30)
    const dx = start.dx(points[id])
    points[sideCpId] = points[id].shiftTowards(points[tmpId], dx * 0.3)
    points[centerCpId] = start.translate(dx * 0.6, 0)

    if (expand) {
      macro('mirror', {
        mirror: [points.cbNeck, points.cbHem],
        clone: true,
        points: [id],
      })
      const s = 'mirrored' + utils.capitalize(id)
      snippets[s] = new Snippet('notch', points[s])
    }

    paths[lineId] = new Path()
      .move(new Point(0, start.y))
      .curve(points[centerCpId], points[sideCpId], points[id])

    if (paths.dartMiddle && paths[lineId].intersects(paths.dartMiddle).length > 0) {
      paths[lineId] = new Path().move(new Point(0, start.y)).line(points[centerCpId])
    }

    if (expand) {
      macro('mirror', {
        mirror: [points.cbNeck, points.cbHem],
        clone: true,
        reverse: true,
        paths: [lineId],
      })
      const mirroredPath = paths['mirrored' + utils.capitalize(lineId)]
      paths[lineId] = mirroredPath.combine(paths[lineId])
      mirroredPath.hide()
    }
    paths[lineId].attr('class', 'contrast help')

    macro('banner', {
      id: lineId,
      classes: 'center fill-contrast help',
      path: paths[lineId],
      text: design + ':' + lineId,
    })
  }
}

export function measureSideSeam(part) {
  return createSideSeam(part).length()
}
