// Approximate "sewn garment" assembly for tops: front/back (+sleeves) wrapped onto a body-like tube.
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { polylines, pickOutline, subdivide, hue } from './scene.js'

const STEP = 4
const smooth = (t) => t * t * (3 - 2 * t)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

function scan(pts, y) {
  let mn = Infinity, mx = -Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
      const x = a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1])
      if (x < mn) mn = x
      if (x > mx) mx = x
    }
  }
  return [mn, mx]
}
const bounds = (pts) => pts.reduce((b, [x, y]) => ({ x0: Math.min(b.x0, x), x1: Math.max(b.x1, x), y0: Math.min(b.y0, y), y1: Math.max(b.y1, y) }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 })

// side-seam width profile for a set of outlines (armhole pinch is bridged)
function profile(outlines, y0, N) {
  const w = new Array(N).fill(NaN)
  const all = outlines.flatMap((o) => o.pts)
  for (let i = 0; i < N; i++) for (const o of outlines) {
    const [, mx] = scan(o.pts, y0 + i * STEP + 0.01)
    if (isFinite(mx)) w[i] = Math.max(isNaN(w[i]) ? -1e9 : w[i], mx - o.cx)
  }
  let last = NaN
  for (let i = 0; i < N; i++) if (!isNaN(w[i])) { last = w[i]; break }
  for (let i = 0; i < N; i++) { if (isNaN(w[i])) w[i] = last; else last = w[i] }
  const b = bounds(all)
  const lim = Math.floor((0.6 * (b.y1 - b.y0)) / STEP)
  let iU = 0
  for (let i = 0; i <= lim; i++) if (w[i] >= w[iU] - 1e-9) iU = i
  for (let i = 0; i < iU; i++) w[i] = w[iU]
  // shoulder tip: outermost vertex in the top 30%
  let tip = null
  for (const [x, y] of all) if (y < b.y0 + 0.3 * (b.y1 - b.y0) && (!tip || x > tip[0])) tip = [x, y]
  return { w, yU: y0 + iU * STEP, tip }
}

function ellipseTable(a, k) {
  const b = a * k, M = 96, X = new Float32Array(M + 1), Y = new Float32Array(M + 1), S = new Float32Array(M + 1)
  for (let j = 0; j <= M; j++) {
    const ph = (j / M) * Math.PI
    X[j] = a * Math.sin(ph); Y[j] = -b * Math.cos(ph)
    if (j) S[j] = S[j - 1] + Math.hypot(X[j] - X[j - 1], Y[j] - Y[j - 1])
  }
  return { X, Y, S, M }
}
function lookup(t, s) {
  let lo = 0, hi = t.M
  while (hi - lo > 1) { const m = (lo + hi) >> 1; t.S[m] <= s ? (lo = m) : (hi = m) }
  const span = t.S[hi] - t.S[lo] || 1, f = clamp((s - t.S[lo]) / span, 0, 1)
  return [t.X[lo] + f * (t.X[hi] - t.X[lo]), t.Y[lo] + f * (t.Y[hi] - t.Y[lo])]
}

export function assemble(result) {
  const parts = []
  for (const st of result.stacks) {
    const name = st.name.split('.').pop()
    for (const part of st.parts) parts.push({ name, part })
  }
  const kind = (n) => (/^front$/i.test(n) ? 'front' : /^front(left|right)$/i.test(n) ? 'frontSide' : /^back$/i.test(n) ? 'back' : /^sleeve$/i.test(n) ? 'sleeve' : null)
  const placed = []
  const unplaced = []
  for (const p of parts) {
    const k = kind(p.name)
    const pts = pickOutline(p.part, ['seam', 'sa'])
    if (k && pts) {
      const b = bounds(pts)
      placed.push({ ...p, k, pts, cx: k === 'sleeve' ? 0 : b.x0 })
    } else unplaced.push(p.name)
  }
  const fronts = placed.filter((p) => p.k === 'front' || p.k === 'frontSide')
  const backs = placed.filter((p) => p.k === 'back')
  const sleeves = placed.filter((p) => p.k === 'sleeve')
  if (!fronts.length || !backs.length) return null

  const torso = [...fronts, ...backs]
  const tb = bounds(torso.flatMap((p) => p.pts))
  const y0 = tb.y0, y1 = tb.y1, N = Math.ceil((y1 - y0) / STEP) + 2
  const F = profile(fronts, y0, N), B = profile(backs, y0, N)
  const yU = (F.yU + B.yU) / 2, yT = ((F.tip?.[1] ?? y0) + (B.tip?.[1] ?? y0)) / 2
  const tables = []
  for (let i = 0; i < N; i++) {
    const y = y0 + i * STEP
    const t = smooth(clamp((yU - y) / Math.max(yU - yT, 1), 0, 1))
    const k = 0.75 + (0.04 - 0.75) * t
    const half = F.w[i] + B.w[i]
    const f = 3 * (1 + k) - Math.sqrt((3 + k) * (1 + 3 * k))
    const a = (2 * half) / (Math.PI * f)
    tables.push({ tab: ellipseTable(a, k), half })
  }
  const rowPoint = (i, isFront, x) => {
    const { tab, half } = tables[i]
    return lookup(tab, clamp(isFront ? x : half - x, 0, tab.S[tab.M]))
  }
  const torsoMap = (isFront, side) => (x, y) => {
    const r = clamp((y - y0) / STEP, 0, N - 2), i = Math.floor(r), f = r - i
    const a = rowPoint(i, isFront, x), b = rowPoint(i + 1, isFront, x)
    return [side * (a[0] + f * (b[0] - a[0])), a[1] + f * (b[1] - a[1]), y1 - y]
  }

  const group = new THREE.Group()
  const addPart = (p, map, hueShift = 0, flip = false) => {
    const shape = new THREE.Shape(p.pts.map(([x, y]) => new THREE.Vector2(x, y)))
    const geo = new THREE.ShapeGeometry(shape, 1)
    const flat = geo.index ? Array.from(geo.index.array, (i) => [geo.attributes.position.getX(i), geo.attributes.position.getY(i)]).flat() : []
    const tris = subdivide(flat, 3)
    const pos = []
    for (let i = 0; i < tris.length; i += 6) {
      const v = [0, 2, 4].map((o) => map(tris[i + o], tris[i + o + 1]))
      pos.push(...(flip ? [v[0], v[2], v[1]] : v).flat())
    }
    let g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g = mergeVertices(g, 1e-3)
    g.computeVertexNormals()
    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(((hue(p.name) + hueShift) % 360) / 360, 0.38, 0.64), roughness: 0.9, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    }))
    mesh.castShadow = true
    group.add(mesh)
    for (const path of p.part.paths) {
      if (path.hidden || path.name.startsWith('__') || /\b(sa|help|note|mark|lining|interfacing|canvas)\b/.test(path.cls) || path.name === 'sa') continue
      for (const pl of polylines(path.ops)) {
        const v = []
        for (let i = 0; i < pl.pts.length; i++) {
          const [x, y] = pl.pts[i]
          if (i) { // densify long straight segments so they follow the curved surface
            const [px, py] = pl.pts[i - 1], n = Math.ceil(Math.hypot(x - px, y - py) / 8)
            for (let j = 1; j < n; j++) v.push(new THREE.Vector3(...map(px + ((x - px) * j) / n, py + ((y - py) * j) / n)))
          }
          v.push(new THREE.Vector3(...map(x, y)))
        }
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(v), new THREE.LineBasicMaterial({ color: 0x2b3340 })))
      }
    }
  }

  for (const p of fronts) {
    const isFront = true
    const sides = /right$/i.test(p.name) ? [-1] : /left$/i.test(p.name) ? [1] : [1, -1]
    for (const s of sides) addPart(p, (x, y) => torsoMap(isFront, s)(x - p.cx, y), 0, s < 0)
  }
  for (const p of backs) for (const s of [1, -1]) addPart(p, (x, y) => torsoMap(false, s)(x - p.cx, y), 0, s > 0)

  // sleeves hang from the shoulder tips
  const tip = F.tip || B.tip
  if (sleeves.length && tip) {
    const base0 = torsoMap(true, 1)(tip[0] - fronts[0].cx, tip[1])
    const th = (18 * Math.PI) / 180
    for (const p of sleeves) {
      const b = bounds(p.pts)
      for (const s of [1, -1]) {
        const base = [s * base0[0], base0[1], base0[2]]
        const dir = [s * Math.sin(th), 0, -Math.cos(th)], out = [s * Math.cos(th), 0, Math.sin(th)]
        addPart(p, (x, y) => {
          const [mn, mx] = scan(p.pts, clamp(y, b.y0 + 0.01, b.y1 - 0.01))
          const wd = Math.max(mx - mn, 0.5)
          const ph = (clamp((x - mn) / wd, 0, 1) - 0.5) * 2 * Math.PI, r = wd / (2 * Math.PI), t = y - b.y0
          const c = Math.cos(ph) * r, sn = Math.sin(ph) * r
          return [base[0] + dir[0] * t + out[0] * c, base[1] + dir[1] * t - sn, base[2] + dir[2] * t + out[2] * c]
        }, 40, s < 0)
      }
    }
  }
  return { group, unplaced: [...new Set(unplaced)] }
}
