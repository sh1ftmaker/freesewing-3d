import { front } from './front.mjs'
import { ringsectorPlugin } from '@freesewing/plugin-ringsector'

export const waistbandFront = {
  name: 'shale.waistband-front',
  after: front,
  measurements: [],
  optionalMeasurements: [],
  options: {
    waistbandFrontAngle: {
      deg: 25,
      min: 1,
      max: 60,
      menu: 'fit',
    },
  },
  plugins: [ringsectorPlugin],
  draft: ({ points, Path, paths, macro, measurements, options, sa, part, store }) => {
    if (!options.elasticOnlyOnBack) {
      return part.hide()
    }

    let height = store.get('waistbandWidth')
    let length = store.get('waistbandFront') * 2

    const angle = Math.min(90, Math.max(1, options.waistbandFrontAngle))

    const radius = (length / (angle * Math.PI)) * 180

    macro('ringsector', {
      id: 'waistbandFront',
      angle: angle,
      insideRadius: radius - height,
      outsideRadius: radius,
      rotate: false,
    })

    let waistTarget = store.get('waistTarget')

    let slope = (measurements.hips - measurements.waist) / measurements.waistToHips
    // Approximate portion of the waistband circumference covered by the waistFront part when worn
    const frontPart = length / waistTarget
    let idealAngle = Math.max(1, (frontPart * slope * 180) / Math.PI)
    if (Math.abs(idealAngle - angle) >= 1) {
      store.flag.info({
        msg: `shale:waistbandAngle`,
        notes: ['shale:waistbandAngleNotes'],
        replace: {
          angle: '' + Math.round(idealAngle),
        },
        suggest: {
          text: 'shale:setWaistAngle',
          icon: 'fixme',
          update: {
            settings: ['options.waistbandFrontAngle', Math.round(idealAngle)],
          },
        },
      })
    }

    paths.__macro_ringsector_waistbandFront_path.setClass('fabric')

    if (sa)
      paths.sa = macro('sa', { paths: ['__macro_ringsector_waistbandFront_path'], class: 'fabric' })

    store.cutlist.setCut({ cut: 2, from: 'fabric' })

    paths.ex = new Path()
      .move(points.__macro_ringsector_waistbandFront_ex2Flipped)
      .curve(
        points.__macro_ringsector_waistbandFront_ex2cFlipped,
        points.__macro_ringsector_waistbandFront_ex1cFlipped,
        points.__macro_ringsector_waistbandFront_ex1
      )
      .curve(
        points.__macro_ringsector_waistbandFront_ex1c,
        points.__macro_ringsector_waistbandFront_ex2c,
        points.__macro_ringsector_waistbandFront_ex2
      )
      .hide()

    paths.in = new Path()
      .move(points.__macro_ringsector_waistbandFront_in2)
      .curve(
        points.__macro_ringsector_waistbandFront_in2c,
        points.__macro_ringsector_waistbandFront_in1c,
        points.__macro_ringsector_waistbandFront_in1
      )
      .curve(
        points.__macro_ringsector_waistbandFront_in1cFlipped,
        points.__macro_ringsector_waistbandFront_in2cFlipped,
        points.__macro_ringsector_waistbandFront_in2Flipped
      )
      .hide()

    /*
     * Annotations
     */
    // Title
    points.title = points.__macro_ringsector_waistbandFront_ex2Flipped.shiftFractionTowards(
      points.__macro_ringsector_waistbandFront_in1,
      0.4
    )

    macro('title', {
      at: points.title,
      nr: 4,
      title: 'waistband-front',
      scale: Math.min(1, height / 100),
    })

    macro('grainline', {
      from: points.__macro_ringsector_waistbandFront_in1,
      to: points.__macro_ringsector_waistbandFront_ex1,
    })

    macro('pd', {
      id: 'in',
      path: paths.in,
      d: sa + 15,
    })
    macro('pd', {
      id: 'ex',
      path: paths.ex,
      d: sa + 15,
    })
    macro('ld', {
      id: 'ex',
      from: points.__macro_ringsector_waistbandFront_ex2,
      to: points.__macro_ringsector_waistbandFront_in2,
      d: sa + 15,
    })

    points.anchor = points.__macro_ringsector_waistbandFront_in1

    return part
  },
}
