import { measurements } from '@freesewing/i18n'
import { front } from './front.mjs'
import { capitalize } from '@freesewing/core'

export const waistbandBack = {
  name: 'shale.waistband-back',
  after: front,
  measurements: [],
  optionalMeasurements: [],
  options: {
    elasticOnlyOnBack: {
      bool: true,
      menu: 'construction',
    },
  },
  draft: ({
    Point,
    points,
    Path,
    paths,
    macro,
    expand,
    measurements,
    options,
    scale,
    complete,
    sa,
    units,
    part,
    store,
  }) => {
    let height = store.get('waistbandWidth')
    let length = options.elasticOnlyOnBack
      ? store.get('waistbandBack')
      : store.get('waistbandBack') + store.get('waistbandFront')
    let waistTarget = store.get('waistTarget')

    // Wider elastic bands tend to compress more, so we need less stretch
    let elasticStretch = Math.max(0.5, 1 - 4 / store.get('waistbandWidth'))
    const frontWidth = options.elasticOnlyOnBack ? store.get('waistbandFront') * 2 : 0
    let elasticLengthMax = Math.max(measurements.waist, measurements.hips) - frontWidth
    let elasticLengthEst = waistTarget * elasticStretch - frontWidth
    let elasticMinStretch = (length * 2) / elasticLengthEst - 1
    if (measurements.hips > measurements.seat) {
      store.flag.warn({
        msg: `shale:hipsSeatRatio`,
      })
    } else if (
      options.waistHeight > 0.2 &&
      (measurements.waist > measurements.hips || elasticMinStretch < 0)
    ) {
      store.flag.warn({
        msg: `shale:waistHipsRatio`,
      })
    }
    if (elasticMinStretch < 0) {
      elasticMinStretch = 0
    }
    store.flag.info({
      msg: `shale:cutElasticLength`,
      replace: {
        length: units(elasticLengthEst),
        max: units(elasticLengthMax),
        fac: (elasticMinStretch * 100).toFixed(0),
      },
    })

    if (expand) {
      store.flag.preset('expandIsOn')
    } else {
      // Expand is off, do not draw the part but flag this to the user
      const extraSa = sa ? 2 * sa : 0
      store.flag.note({
        msg: `shale:cut${capitalize(part.name.split('.')[1])}`,
        notes: [sa ? 'flag:saIncluded' : 'flag:saExcluded', 'flag:partHiddenByExpand'],
        replace: {
          w: units(2 * height + extraSa),
          l: units(2 * length + extraSa),
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
    points.bottomLeft = new Point(0, height * 2)
    points.leftFold = new Point(0, height)
    points.topRight = new Point(length, 0)
    points.bottomRight = new Point(length, points.bottomLeft.y)
    points.rightFold = new Point(length, points.leftFold.y)

    paths.seam = new Path()
      .move(points.bottomLeft)
      .line(points.bottomRight)
      .line(points.topRight)
      .line(points.topLeft)
      .addClass('fabric')

    if (complete)
      paths.fold = new Path().move(points.leftFold).line(points.rightFold).addClass('various help')

    if (sa) paths.sa = macro('sa', { paths: ['seam', null], class: 'fabric' })

    paths.seam.close()

    store.cutlist.setCut({ cut: 1, from: 'fabric', onFold: true })

    /*
     * Annotations
     */
    // Title
    points.title = new Point(30 * scale, points.bottomRight.y * 0.6)

    macro('title', {
      at: points.title,
      nr: 3,
      title: options.elasticOnlyOnBack ? 'waistband-back' : 'waistband',
      scale: Math.min(1, height / 50),
    })

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
    macro('cutOnFold', {
      from: points.topLeft,
      to: points.bottomLeft,
      grainline: true,
    })

    return part
  },
}
