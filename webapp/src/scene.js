import * as THREE from 'three'

// ---------- SVG transform strings -> 2D affine [a b c d e f]
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
]
function parseTransform(list) {
  let m = [1, 0, 0, 1, 0, 0]
  for (const str of list || []) {
    for (const [, fn, args] of str.matchAll(/(\w+)\(([^)]*)\)/g)) {
      const a = args.split(/[\s,]+/).filter(Boolean).map(Number)
      let t = null
      if (fn === 'translate') t = [1, 0, 0, 1, a[0], a[1] || 0]
      else if (fn === 'scale') t = [a[0], 0, 0, a[1] ?? a[0], 0, 0]
      else if (fn === 'matrix') t = a
      else if (fn === 'rotate') {
        const r = (a[0] * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r)
        t = [c, s, -s, c, 0, 0]
        if (a.length === 3) t = mul(mul([1, 0, 0, 1, a[1], a[2]], t), [1, 0, 0, 1, -a[1], -a[2]])
      }
      if (t) m = mul(m, t)
    }
  }
  return m
}
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]

// ---------- path -> polylines
export function polylines(ops, steps = 20) {
  const out = []
  let cur = null, start = null, closed = false
  const flush = () => { if (cur && cur.length > 1) out.push({ pts: cur, closed }); }
  for (const op of ops) {
    if (op.type === 'move') { flush(); cur = [[op.to.x, op.to.y]]; start = cur[0]; closed = false }
    else if (op.type === 'line' && cur) cur.push([op.to.x, op.to.y])
    else if (op.type === 'curve' && cur) {
      const p0 = cur[cur.length - 1]
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, u = 1 - t
        cur.push([
          u * u * u * p0[0] + 3 * u * u * t * op.cp1.x + 3 * u * t * t * op.cp2.x + t * t * t * op.to.x,
          u * u * u * p0[1] + 3 * u * u * t * op.cp1.y + 3 * u * t * t * op.cp2.y + t * t * t * op.to.y,
        ])
      }
    } else if (op.type === 'close' && cur) { closed = true; cur.push(start) }
  }
  flush()
  return out
}

const CLASS_COLOR = {
  fabric: 0xf2f4f8, lining: 0xc9a6ff, interfacing: 0xa6e3c4, canvas: 0xe8c58a,
  various: 0xdddddd, sa: 0xffc857, note: 0x6cb6ff, mark: 0xffe36e, help: 0x7d8896,
  contrast: 0xff8a8a, stroke: 0xffffff,
}
function lineStyle(cls) {
  for (const c of cls.split(' ')) if (CLASS_COLOR[c]) return { color: CLASS_COLOR[c], dashed: /\b(sa|help|note|mark|lining|interfacing|canvas)\b/.test(cls) }
  return { color: 0xcccccc, dashed: false }
}
export const hue = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h }

// midpoint-subdivide a non-indexed triangle list
export function subdivide(tris, levels) {
  for (let l = 0; l < levels; l++) {
    const out = []
    for (let i = 0; i < tris.length; i += 6) {
      const [ax, ay, bx, by, cx, cy] = tris.slice(i, i + 6)
      const abx = (ax + bx) / 2, aby = (ay + by) / 2, bcx = (bx + cx) / 2, bcy = (by + cy) / 2, cax = (cx + ax) / 2, cay = (cy + ay) / 2
      out.push(ax, ay, abx, aby, cax, cay, abx, aby, bx, by, bcx, bcy, cax, cay, bcx, bcy, cx, cy, abx, aby, bcx, bcy, cax, cay)
    }
    tris = out
  }
  return tris
}

export function pickOutline(part, candidates = ['sa', 'seam']) {
  for (const n of candidates) {
    const p = part.paths.find((x) => x.name === n && !x.hidden)
    if (p) { const pl = polylines(p.ops).find((l) => l.closed); if (pl) return pl.pts }
  }
  let best = null, bestArea = 0
  for (const p of part.paths) {
    if (/^__|help|note|mark/.test(p.cls) ) continue
    for (const pl of polylines(p.ops)) {
      if (!pl.closed) continue
      let a = 0
      for (let i = 0; i < pl.pts.length - 1; i++) a += pl.pts[i][0] * pl.pts[i + 1][1] - pl.pts[i + 1][0] * pl.pts[i][1]
      if (Math.abs(a) > bestArea) { bestArea = Math.abs(a); best = pl.pts }
    }
  }
  return best
}

export function buildScene(result, { explode, thickness, drape, showPoints, hidden }) {
  const root = new THREE.Group()
  const spread = 1 + explode * 0.6
  const cx = result.width / 2, cy = result.height / 2
  let idx = 0

  for (const stack of result.stacks) {
    if (hidden.has(stack.name)) continue
    const sM = parseTransform(stack.transform)
    for (const part of stack.parts) {
      const M = mul(sM, parseTransform(part.transform))
      const lift = explode * 70 * idx++
      const to3 = (x, y) => {
        const [wx, wy] = apply(M, x, y)
        return [cx + (wx - cx) * spread, -(cy + (wy - cy) * spread)]
      }
      // drape: bend the part like cloth over a cylinder along its own centre
      let ox = 0, oy = 0
      const outlinePts = pickOutline(part)
      const world = outlinePts?.map(([x, y]) => to3(x, y))
      if (world) { ox = world.reduce((s, p) => s + p[0], 0) / world.length; oy = world.reduce((s, p) => s + p[1], 0) / world.length }
      const R = 350
      const dz = (x, y) => drape ? drape * (((x - ox) ** 2) / (2 * R) * 0.6 + Math.sin((y - oy) / 140) * 14) : 0
      const hash = hue(stack.name)

      if (world && world.length > 2) {
        const shape = new THREE.Shape(world.map(([x, y]) => new THREE.Vector2(x, y)))
        const geo = new THREE.ShapeGeometry(shape, 1)
        const flat = geo.index ? Array.from(geo.index.array, (i) => [geo.attributes.position.getX(i), geo.attributes.position.getY(i)]).flat() : []
        const tris = subdivide(flat, drape > 0 ? 2 : 0)
        const T = Math.max(thickness, 0.5)
        const pos = []
        const push = (x, y, z) => pos.push(x, y, z)
        for (let i = 0; i < tris.length; i += 6) {
          const [ax, ay, bx, by, cx2, cy2] = tris.slice(i, i + 6)
          push(ax, ay, T + lift + dz(ax, ay)); push(bx, by, T + lift + dz(bx, by)); push(cx2, cy2, T + lift + dz(cx2, cy2))
          push(ax, ay, lift + dz(ax, ay)); push(cx2, cy2, lift + dz(cx2, cy2)); push(bx, by, lift + dz(bx, by))
        }
        for (let i = 0; i < world.length - 1; i++) {
          const [x1, y1] = world[i], [x2, y2] = world[i + 1]
          const a = [x1, y1, lift + dz(x1, y1)], b = [x2, y2, lift + dz(x2, y2)]
          const c = [x2, y2, T + lift + dz(x2, y2)], d = [x1, y1, T + lift + dz(x1, y1)]
          pos.push(...a, ...b, ...c, ...a, ...c, ...d)
        }
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
        g.computeVertexNormals()
        const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(hash / 360, 0.35, 0.62), roughness: 0.85, side: THREE.DoubleSide,
        }))
        mesh.castShadow = mesh.receiveShadow = true
        root.add(mesh)
      }

      // lines
      const zTop = Math.max(thickness, 0.5) + lift + 0.3
      for (const p of part.paths) {
        if (p.hidden || p.name.startsWith('__')) continue
        const { color, dashed } = lineStyle(p.cls)
        for (const pl of polylines(p.ops)) {
          const v = pl.pts.map(([x, y]) => { const [wx, wy] = to3(x, y); return new THREE.Vector3(wx, wy, zTop + dz(wx, wy)) })
          const geo = new THREE.BufferGeometry().setFromPoints(v)
          const line = new THREE.Line(geo, dashed
            ? new THREE.LineDashedMaterial({ color, dashSize: 6, gapSize: 4 })
            : new THREE.LineBasicMaterial({ color }))
          if (dashed) line.computeLineDistances()
          root.add(line)
        }
      }

      if (showPoints) {
        const pts = [...part.points.map((p) => [p.x, p.y, 0x5ab0ff]), ...part.snippets.map((s) => [s.x, s.y, 0xff6b6b])]
        const geo = new THREE.BufferGeometry().setFromPoints(pts.map(([x, y]) => { const [wx, wy] = to3(x, y); return new THREE.Vector3(wx, wy, zTop + 1 + dz(wx, wy)) }))
        geo.setAttribute('color', new THREE.Float32BufferAttribute(pts.flatMap(([, , c]) => new THREE.Color(c).toArray()), 3))
        root.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 5, vertexColors: true, sizeAttenuation: true })))
      }
    }
  }
  return root
}
