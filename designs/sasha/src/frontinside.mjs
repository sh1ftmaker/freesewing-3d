import { pctBasedOn } from '@freesewing/core'
import { frontInside as nobleFrontInside } from '@freesewing/noble'

export const frontInside = {
  name: 'sasha.frontInside',
  from: nobleFrontInside,
  hide: { from: true },
  measurements: [
    'hips',
    'seat',
    'crossSeam',
    'crossSeamFront',
    'waistToHips',
    'waistToSeat',
    'waistToKnee',
    'hpsToWaistFront',
  ],
  options: {
    lengthBonus: { pct: -10, min: -100, max: 100, ...pctBasedOn('waistToKnee'), menu: 'style' },
    skirtWidthBonus: { pct: 50, min: 0, max: 100, ...pctBasedOn('hips'), menu: 'style' },
    necklineDepth: { pct: 30, min: 10, max: 70, menu: 'style' },
    necklineWidth: { pct: 50, min: 10, max: 95, menu: 'style' }, // NOTE: crashes at 100%
    necklineBend: { pct: 30, min: 0, max: 150, menu: 'style' },
    collarFactor: 0, // ensures that the new neckline is lower than the old one (no intersections)
  },
  draft: ({
    log,
    units,
    utils,
    store,
    sa,
    Point,
    points,
    Path,
    paths,
    options,
    measurements,
    macro,
    part,
  }) => {
    // Hide Noble paths
    for (const key of Object.keys(paths)) paths[key].hide()
    // for (const i in snippets) delete snippets[i] // keep the notches etc

    // adjust neckline first

    const necklineFromHps = options.necklineDepth * measurements.hpsToWaistFront
    log.info(
      `bottom of neckline is expected to sit ${units(measurements.hpsToBust - necklineFromHps)} above bust`
    )
    points.neckBottom = new Point(0, necklineFromHps)
    points.neckShoulder = points.hps.shiftFractionTowards(
      points.shoulderDartInside,
      options.necklineWidth
    )
    // maintain any delta between front/back seam lengths by converting options.necklineWidth to a length
    store.set('neckShift', points.hps.dist(points.neckShoulder))
    points.neckCorner = utils.beamsIntersect(
      points.neckBottom,
      points.neckBottom.shift(0, 20),
      points.neckShoulder,
      points.neckShoulder
        .shiftTowards(points.shoulderDartInside, 20)
        .rotate(90, points.neckShoulder)
    )

    points.neckBottomCp1 = points.neckBottom.shiftFractionTowards(
      points.neckCorner,
      options.necklineBend
    )

    points.neckShoulderCp2 = points.neckShoulder.shiftFractionTowards(
      points.neckCorner,
      0.2 + Math.min(options.necklineBend, 0.9)
    )
    paths.newNeckLine = new Path()
      .move(points.neckBottom)
      .curve(points.neckBottomCp1, points.neckShoulderCp2, points.neckShoulder)

    // insert the new neckline between shoulderDartInside and cfHem

    // take Noble paths, split into convenient pieces
    // NOTE: nobleFrontInside is drawn from cfHem to waistDartLeft to shoulder to cfNeck
    const halvesA = paths.insideSeam.split(points.waistDartLeft)
    const halvesB = halvesA[1].split(points.shoulderDartInside)
    // halvesA[0] is not used, this is the original hem (at waist height)

    const nobleCfPlus = halvesB[1] // center front line plus neckline plus shoulder seam
    const nobleRest = halvesB[0]

    const halvesC = nobleCfPlus.split(points.neckShoulder) // guaranteed to be before original neckline start

    const newCfPlus = halvesC[0]
      .join(paths.newNeckLine.reverse())
      .join(new Path().move(points.cfHem))

    store.set('skirtLength', measurements.waistToKnee * (1 + options.lengthBonus))
    store.set('skirtWidth', measurements.hips * (1 + options.skirtWidthBonus))
    const angle =
      (360 *
        Math.asin(((measurements.hips / 4) * options.skirtWidthBonus) / store.get('skirtLength'))) /
      (2 * Math.PI)
    store.set('skirtDartAngle', angle)

    log.debug(
      `skirt dart angle calculated as ${angle} from ${units(measurements.hips)}, ${
        options.skirtWidthBonus
      } and ${units(store.get('skirtLength'))}`
    )

    // skirt portion consists of a rectangle and a 'godet' (but as one piece)
    points.cfSkirtHem = points.cfHem.shift(270, store.get('skirtLength'))
    points.godetStart = points.waistDartLeft.shift(270, store.get('skirtLength'))
    points.godetEnd = points.waistDartLeft.shift(
      270 + store.get('skirtDartAngle'),
      store.get('skirtLength')
    )

    // path runs counter-clockwise, starting at center front hemline
    paths.insideSeam = new Path()
      .move(points.cfSkirtHem)
      .move(points.godetStart)
      .curve(
        points.godetStart.shift(0, points.godetStart.dist(points.godetEnd) / 3),
        points.godetEnd.shift(
          store.get('skirtDartAngle'),
          points.godetEnd.dist(points.godetEnd) / 3
        ),
        points.godetEnd
      )
      .join(nobleRest)
      .join(newCfPlus)
      .close()
      .addClass('fabric')

    // mark the waist line with notches
    macro('sprinkle', {
      snippet: 'notch',
      on: ['cfHem', 'waistDartLeft'],
    })

    // cutlist
    store.cutlist.setCut({ cut: 1, from: 'fabric', onFold: true })

    // cutonfold
    macro('cutonfold', {
      from: points.neckBottom,
      to: points.cfSkirtHem,
      grainline: true,
    })

    // title
    points.titleAnchor = points.titleAnchor.shift(0, points.titleAnchor.dx(points.cfHem) / 2)
    points.titleAnchor = points.titleAnchor.shift(270, points.titleAnchor.dy(points.cfHem) * 0.4)
    macro('title', {
      at: points.titleAnchor,
      nr: 1,
      title: 'frontInside',
    })

    macro('rmscalebox')

    let seamExceptFold = paths.insideSeam.split(points.neckBottom)
    if (sa) {
      paths.sa = seamExceptFold[0].offset(sa).attr('class', 'fabric sa')
    }

    let extraOffset = 0
    if (options.dartPosition == 'shoulder') {
      macro('hd', {
        from: points.neckShoulder,
        to: points.shoulderDartInside,
        y: points.neckShoulder.y - 25,
        id: 'hpsToDart',
      })
      macro('vd', {
        from: points.cfSkirtHem,
        to: points.shoulderDartInside,
        x: 0 - 30,
        id: 'hemToDart',
      })
      macro('vd', {
        from: points.cfSkirtHem,
        to: points.shoulderDartTip,
        x: 0 - 10,
        id: 'hemToDartTip',
      })
      macro('hd', {
        from: points.cfBust,
        to: points.shoulderDartTip,
        y: points.cfHem.y + sa + 25,
        id: 'middleToDartTip',
      })
    } else {
      extraOffset = 10
      macro('hd', {
        from: points.neckShoulder,
        to: points.shoulderCp1,
        y: points.neckShoulder.y - 35,
        id: 'hpsToShoulder',
      })
      macro('hd', {
        from: points.neckShoulder,
        to: points.armholeDartInsideCp2,
        y: points.neckShoulder.y - 25,
        id: 'hpsToDart',
      })
      macro('vd', {
        from: points.cfSkirtHem,
        to: points.armholeDartInsideCp2,
        x: 0 - 20,
        id: 'hemToDart',
      })
      macro('vd', {
        from: points.cfSkirtHem,
        to: points.shoulderCp1,
        x: 0 - 40,
        id: 'hemToShoulder',
      })
      macro('vd', {
        from: points.cfSkirtHem,
        to: points.armholeDartTipInside,
        x: 0 - 10,
        id: 'hemToDartTip',
      })
      macro('hd', {
        from: points.cfBust,
        to: points.armholeDartTipInside,
        y: points.cfBust.y + 25,
        id: 'middleToDartTip',
      })
    }

    macro('vd', {
      from: points.cfSkirtHem,
      to: points.neckBottom,
      x: 0 - 20 - extraOffset,
      id: 'hemToNeck',
    })
    macro('vd', {
      from: points.cfSkirtHem,
      to: points.neckShoulder,
      x: 0 - 40 - extraOffset,
      id: 'hemToHps',
    })
    macro('hd', {
      from: points.cfSkirtHem,
      to: points.waistDartLeft,
      y: points.waistDartLeft.y + 25,
      id: 'middleToDart',
    })
    macro('hd', {
      from: points.neckBottom,
      to: points.neckShoulder,
      y: points.neckShoulder.y - sa - 15,
      id: 'middleToHps',
    })

    return part
  },
}
