import about from '../about.json' with { type: 'json' }

const scalePoint = (p, x, y, c) => {
  p.x = (p.x - c.x) * x + c.x
  p.y = (p.y - c.y) * y + c.y
  return p
}

export const plugin = {
  name: about.id,
  version: about.version,
  macros: {
    transform: function ({
      transform = Object.freeze({ rotate: 'rotate', translate: 'translate', scale: 'scale' }),
      x = 0,
      y,
      angle = 0,
      c = new this.Point(0, 0),
      clone = true,
      points = [],
      paths = [],
      prefix = 'transformed_',
    }) {
      if (y === undefined) y = x

      for (const pathId of paths) {
        // Make sure the path exists
        if (this.paths[pathId]) {
          let path = clone ? this.paths[pathId].clone() : this.paths[pathId]

          const newId = clone
            ? typeof prefix == 'function'
              ? prefix(pathId, 'path')
              : `${prefix}${pathId}`
            : pathId

          switch (transform) {
            case 'rotate':
              path = path.rotate(angle, c, true)
              break
            case 'translate':
              path = path.translate(x, y)
              break
            case 'scale':
              for (const op of path.ops) {
                switch (op.type) {
                  case 'curve':
                    op.cp1 = scalePoint(op.cp1, x, y, c)
                    op.cp2 = scalePoint(op.cp2, x, y, c)
                  case 'move':
                  case 'line':
                    op.to = scalePoint(op.to, x, y, c)
                }
              }
          }
          this.paths[newId] = path
        }
      }

      for (const pointId of points) {
        // Make sure the point exists
        if (this.points[pointId]) {
          const newId = clone
            ? typeof prefix == 'function'
              ? prefix(pointId, 'point')
              : `${prefix}${pointId}`
            : pointId

          let point = this.points[pointId]
          switch (transform) {
            case 'rotate':
              point = point.rotate(angle, c)
              break
            case 'translate':
              point = point.translate(x, y)
              break
            case 'scale':
              point = scalePoint(point, x, y, c)
              break
          }
          if (clone) {
            this.points[newId] = this.points[pointId].clone()
          }
          this.points[newId].x = point.x
          this.points[newId].y = point.y
        }
      }
    },
  },
}

// More specifically named exports
export const transformPlugin = plugin
export const pluginTransform = plugin
