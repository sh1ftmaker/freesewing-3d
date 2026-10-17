import { backPoints as nobleBackPoints } from '@freesewing/noble'
import { frontInside as sashaFrontInside } from './frontinside.mjs'

export const backInside = {
  name: 'sasha.backInside',
  from: nobleBackPoints,
  after: sashaFrontInside,
  hide: { from: true },
  options: {
    dartPosition: 'armhole', // only support armhole as princess seam endpoint
    armholeDartPositionBackOffset: { pct: 0, min: -100, max: 100, menu: 'advanced' },
    backHemSlope: 0, // ensures that the back part gets a straight side seam
    shoulderSlopeBack: 1, // same slope back and front to ensure same seam length (no easing in)
  },
  draft: ({ sa, store, points, Path, paths, options, macro, part }) => {
    // hide the paths(s) inherited from nobleBackPoints
    for (const key of Object.keys(paths)) paths[key].hide()

    // custom split of armhole and curve from there to dart tip
    // NOTE: paths.armhole is generated in nobleBackPoints
    const backArmholeDartPosition = Math.max(
      Math.min(0.99, options.armholeDartPosition + options.armholeDartPositionBackOffset),
      0.01
    )
    points.armholeSplit = paths.armhole.shiftFractionAlong(1 - backArmholeDartPosition)
    store.set('backArmholeDartPosition', backArmholeDartPosition)

    // roughly circular path from point of tip to armhole split
    // (different from noble)
    paths.sashaDartToArmhole = new Path()
      .move(points.dartTip)
      .curve(
        points.dartTip.shift(90, -points.dartTip.dy(points.armholeSplit) * 0.4),
        points.armholeSplit.shift(180, -points.armholeSplit.dx(points.dartTip) * 0.5),
        points.armholeSplit
      )

    // redraw remaining paths as in Noble
    // NOTE: nobleBackInside is drawn from cbNeck to waistCenter to dart to waistSide to armhole etc
    // remaining part of armhole
    const nobleCb = new Path().move(points.cbNeck).curve_(points.cbNeckCp2, points.waistCenter)

    const nobleDartLeftHalf = new Path()
      .move(points.dartBottomLeft)
      .curve(points.dartLeftCp, points.shoulderDartCpDown, points.dartTip)

    // account for adjusted neckline
    points.neckShoulder = points.hps.shiftTowards(points.shoulder, store.get('neckShift'))
    const nobleRest = new Path()
      .move(points.shoulder)
      .line(points.neckShoulder)
      ._curve(points.cbNeckCp1, points.cbNeck)

    // skirt portion consists of a rectangle and a 'godet' (but as one piece)
    points.cbSkirtHem = points.waistCenter.shift(270, store.get('skirtLength'))
    points.godetStart = points.dartBottomLeft.shift(270, store.get('skirtLength'))
    points.godetEnd = points.dartBottomLeft.shift(
      270 + store.get('skirtDartAngle'),
      store.get('skirtLength')
    )

    // assemble the seam from these paths
    paths.insideSeam = new Path()
      .move(points.cbSkirtHem)
      .move(points.godetStart)
      .curve(
        points.godetStart.shift(0, points.godetStart.dist(points.godetEnd) / 3),
        points.godetEnd.shift(
          store.get('skirtDartAngle'),
          points.godetEnd.dist(points.godetEnd) / 3
        ),
        points.godetEnd
      )
      .join(nobleDartLeftHalf || new Path().move(points.dartBottomRight)) // go through dartBottomRight either way
      .join(paths.sashaDartToArmhole)
      .join(nobleRest)
      .join(nobleCb)
      .line(points.cbSkirtHem) // close() is not enough to draw seam allowance correctly
      .close()
      .addClass('fabric')

    // mark the waist line with notches
    macro('sprinkle', {
      snippet: 'notch',
      on: ['waistCenter', 'dartBottomLeft'],
    })

    // cutlist
    store.cutlist.setCut({ cut: 2, from: 'fabric', onFold: false })

    // grainline
    macro('grainline', {
      from: points.cbSkirtHem.shift(90, points.cbNeck.dy(points.cbSkirtHem)).shift(0, 20),
      to: points.cbSkirtHem.shift(0, 20),
    })

    // title
    points.titleAnchor = points.titleAnchor.shift(0, points.titleAnchor.dx(points.waistCenter) / 2)
    macro('title', {
      at: points.titleAnchor,
      nr: 3,
      title: 'backInside',
    })

    if (sa) paths.sa = paths.insideSeam.offset(sa).attr('class', 'fabric sa')

    if (options.dartPosition == 'shoulder') {
      points.shoulderPoint = points.shoulderDart.clone()
    } else {
      points.shoulderPoint = points.shoulder.clone()
    }
    macro('hd', {
      from: points.waistCenter,
      to: points.dartBottomLeft,
      y: points.waistCenter.y + 15,
      id: 'middleToDart',
    })
    macro('hd', {
      from: points.cbNeck,
      to: points.dartBottomLeft,
      y: points.waistCenter.y + 25,
      id: 'neckToDart',
    })
    macro('hd', {
      from: points.cbNeck,
      to: points.neckShoulder,
      y: points.neckShoulder.y - sa - 15,
      id: 'neckToCb',
    })

    let extraOffset = 0
    if (options.dartPosition != 'shoulder') {
      macro('vd', {
        from: points.neckShoulder,
        to: points.armholeSplit,
        x: points.neckShoulder.x + sa + 15,
        id: 'splitToShoulder',
      })
      extraOffset = 10
    }

    macro('vd', {
      from: points.armholeSplit,
      to: points.dartTip,
      x: points.neckShoulder.x + sa + 15,
      id: 'dartPointToSplit',
    })
    macro('vd', {
      from: points.neckShoulder,
      to: points.dartTip,
      x: points.neckShoulder.x + sa + 25 + extraOffset,
      id: 'dartToShoulder',
    })
    macro('vd', {
      from: points.dartTip,
      to: points.dartBottomLeft,
      x: points.neckShoulder.x + sa + 15,
      id: 'dartPointToWaist',
    })
    macro('hd', {
      from: points.cbNeck,
      to: points.dartTip,
      y: points.dartTip.y,
      id: 'middleToDartTip',
    })
    macro('vd', {
      from: points.dartBottomLeft,
      to: points.waistCenter,
      x: points.dartBottomLeft.x + 25,
      id: 'waistVertical',
    })
    macro('vd', {
      from: points.cbSkirtHem,
      to: points.cbNeck,
      x: points.cbNeck.x - sa - 15,
      id: 'hemToNeck',
    })
    macro('vd', {
      from: points.cbSkirtHem,
      to: points.neckShoulder,
      x: points.cbNeck.x - sa - 25,
      id: 'hemToNeckline',
    })
    macro('hd', {
      from: points.cbSkirtHem,
      to: points.godetStart,
      y: points.cbSkirtHem.y + sa + 15,
      id: 'middleToGodetStart',
    })
    macro('hd', {
      from: points.godetStart,
      to: points.godetEnd,
      y: points.cbSkirtHem.y + sa + 15,
      id: 'godetWidth',
    })
    macro('hd', {
      from: points.cbSkirtHem,
      to: points.godetEnd,
      y: points.cbSkirtHem.y + sa + 25,
      id: 'middleToGodetEnd',
    })
    macro('vd', {
      from: points.cbSkirtHem,
      to: points.godetEnd,
      x: points.godetEnd.x + sa + 15,
      id: 'hemVertical',
    })

    return part
  },
}
