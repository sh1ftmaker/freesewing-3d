import { backPoints } from './backpoints.mjs'

export const backOutside = {
  name: 'noble.backOutside',
  from: backPoints,
  draft: ({ sa, Point, points, Path, paths, Snippet, snippets, options, macro, store, part }) => {
    paths.dart = new Path()
      .move(points.shoulderDart)
      .curve(points.shoulderDart, points.shoulderDartCpUp, points.dartTip)
      .curve(points.shoulderDartCpDown, points.dartRightCp, points.dartBottomRight)
      .hide()

    if (options.dartPosition !== 'shoulder') {
      paths.armhole = paths.armhole.split(points.shoulderDart)[0]
      store.set('library.sleeve.backArmholeToArmholePitch', paths.armhole.length())
    } else {
      snippets.armholePitchNotch = new Snippet('notch', points.armholePitch)
    }
    paths.outsideSeam = new Path()
      .move(points.dartBottomRight)
      .line(points.waistSide)
      .curve_(points.waistSideCp2, points.armhole)
      .join(paths.armhole)
      .line(points.shoulderDart)
      .join(paths.dart)
      .close()
      .attr('class', 'fabric')

    points.grainlineFrom = new Point(
      Math.max(points.shoulderDart.x, points.dartBottomRight.x),
      Math.max(points.shoulder.y, points.shoulderDart.y) * 1.2
    )
    points.grainlineTo = new Point(points.grainlineFrom.x, points.waistSide.y * 0.9)

    macro('grainline', {
      from: points.grainlineFrom,
      to: points.grainlineTo,
    })

    snippets.dartTip = new Snippet('notch', points.dartTip)

    store.cutlist.removeCut()
    store.cutlist.addCut({ onFold: false })
    points.titleAnchor = points.dartBottomRight
      .shiftFractionTowards(points.waistSide, 0.1)
      .shiftFractionTowards(points.shoulder, 0.3)
    macro('title', {
      at: points.titleAnchor,
      nr: 4,
      title: 'backOutside',
    })
    points.gridAnchor = points.armholeCpTarget.clone()

    if (sa) paths.sa = paths.outsideSeam.offset(sa).attr('class', 'fabric sa')

    let pLeft = paths.dart.edge('left')
    macro('hd', {
      from: pLeft,
      to: points.waistSide,
      y: points.waistCenter.y + sa + 15,
      id: 'leftToSide',
    })
    macro('hd', {
      from: points.dartBottomRight,
      to: points.armhole,
      y: points.waistCenter.y + sa + 25,
      id: 'dartToArmhole',
    })
    macro('hd', {
      from: points.dartTip,
      to: points.waistSide,
      y: points.waistCenter.y + sa + 15,
      id: 'leftToSide',
    })
    macro('hd', {
      from: points.dartBottomRight,
      to: points.waistSide,
      y: points.waistCenter.y + sa + 25,
      id: 'dartToSide',
    })
    macro('hd', {
      from: points.shoulderDart,
      to: points.armhole,
      y: points.shoulderDart.y - sa - 35,
      id: 'dartToArmhole',
    })

    macro('vd', {
      from: points.shoulder,
      to: points.dartTip,
      x: points.armhole.x + sa + 15,
      id: 'dartPointToShoulder',
    })
    macro('vd', {
      from: points.armhole,
      to: points.waistSide,
      x: points.armhole.x + sa + 15,
      id: 'sideToArmhole',
    })
    macro('vd', {
      from: points.shoulderDart,
      to: points.dartBottomRight,
      x: points.armhole.x + sa + 45,
      id: 'dartToDart',
    })

    if (options.dartPosition === 'shoulder') {
      macro('hd', {
        from: pLeft,
        to: points.shoulder,
        y: points.shoulderDart.y - sa - 15,
        id: 'leftToShoulder',
      })
      macro('hd', {
        from: points.shoulderDart,
        to: points.shoulder,
        y: points.shoulderDart.y - sa - 25,
        id: 'dartToShoulder',
      })
      macro('vd', {
        from: points.shoulder,
        to: points.dartTip,
        x: points.armhole.x + sa + 15,
        id: 'dartPointToShoulder',
      })
      macro('vd', {
        from: points.shoulder,
        to: points.waistSide,
        x: points.armhole.x + sa + 25,
        id: 'sideToShoulder',
      })
      macro('vd', {
        from: points.shoulder,
        to: points.dartBottomRight,
        x: points.armhole.x + sa + 35,
        id: 'dartToShoulder',
      })
    } else {
      macro('hd', {
        from: pLeft,
        to: points.shoulderDart,
        y: points.shoulderDart.y - sa - 15,
        id: 'leftToShoulder',
      })
      macro('vd', {
        from: points.shoulderDart,
        to: points.dartTip,
        x: points.armhole.x + sa + 25,
        id: 'dartPointToShoulder',
      })
      macro('vd', {
        from: points.shoulderDart,
        to: points.armhole,
        x: points.armhole.x + sa + 15,
        id: 'dartPointToShoulder',
      })
    }

    return part
  },
}
