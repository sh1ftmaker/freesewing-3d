import { pocket } from './pocket.mjs'

export const pocketFacing = {
  name: 'shale.pocket-facing',
  from: pocket,
  measurements: [],
  optionalMeasurements: [],
  draft: ({ Path, points, paths, macro, options, part, store, sa, expand }) => {
    if (options.pocket !== 'inset' || !options.splitParts || !expand) {
      return part.hide()
    }
    paths.pocketSeam = paths.waistBand
      .split(points.styleWaistOut)[1]
      .split(points.pocketTopLeft)[0]
      .line(points.pocketBottomLeft)
      .line(points.pocketBottomRight)
      .close()
      .addClass('fabric')
    if (sa) {
      paths.pocketSa = macro('sa', {
        paths: [paths.pocketSeam],
      })
    }

    store.cutlist.setCut({ cut: 2, from: 'fabric' })

    macro('title', { at: points.title, nr: 6, title: 'pocket-facing', scale: 0.5 })

    return part
  },
}
