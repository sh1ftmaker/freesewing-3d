import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { buildScene } from './scene.js'

const $ = (id) => document.getElementById(id)
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
let seq = 0
const pending = new Map()
worker.onmessage = ({ data }) => {
  const p = pending.get(data.id)
  if (!p) return
  pending.delete(data.id)
  data.error ? p.reject(new Error(data.error)) : p.resolve(data)
}
const call = (msg) => new Promise((resolve, reject) => {
  const id = ++seq
  pending.set(id, { resolve, reject })
  worker.postMessage({ id, ...msg })
})

// ---- three.js
const view = $('view')
let renderer
try { renderer = new THREE.WebGLRenderer({ antialias: true }) } catch (e) {
  $('status').textContent = 'WebGL is not available in this browser — 3D preview disabled.'
  renderer = { domElement: document.createElement('canvas'), setPixelRatio() {}, setSize() {}, setAnimationLoop() {}, render() {}, shadowMap: {} }
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
view.appendChild(renderer.domElement)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x14171c)
const camera = new THREE.PerspectiveCamera(45, 1, 1, 20000)
camera.position.set(0, -900, 900)
camera.up.set(0, 0, 1)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
scene.add(new THREE.HemisphereLight(0xffffff, 0x333344, 1.1))
const sun = new THREE.DirectionalLight(0xffffff, 1.4)
sun.position.set(400, -600, 1200)
sun.castShadow = true
sun.shadow.bias = -0.0005
sun.shadow.normalBias = 1.5
sun.shadow.mapSize.set(2048, 2048)
Object.assign(sun.shadow.camera, { left: -1500, right: 1500, top: 1500, bottom: -1500, far: 4000 })
scene.add(sun)
const table = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.ShadowMaterial({ opacity: 0.35 }))
table.position.z = -0.5
table.receiveShadow = true
scene.add(table)
const grid = new THREE.GridHelper(4000, 40, 0x3a4352, 0x242b35)
grid.rotation.x = Math.PI / 2
scene.add(grid)

function resize() {
  const w = view.clientWidth, h = view.clientHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
addEventListener('resize', resize)
resize()
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera) })

// ---- state / UI
let current = null // result from worker
let group = null
let hiddenParts = new Set()
let options = {}
let busy = false, again = false

function show() {
  if (!current) return
  if (group) { scene.remove(group); group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.() }) }
  group = buildScene(current, {
    explode: +$('explode').value,
    thickness: +$('thick').value,
    drape: +$('drape').value,
    showPoints: $('points').checked,
    hidden: hiddenParts,
  })
  scene.add(group)
}

function frame() {
  if (!current) return
  const cx = current.width / 2, cy = -current.height / 2
  controls.target.set(cx, cy, 0)
  const d = Math.max(current.width, current.height * 1.3)
  camera.position.set(cx, cy - d * 0.55, d * 1.05)
  controls.update()
}

async function redraw(reframe = false) {
  if (busy) { again = true; return }
  busy = true
  $('status').textContent = 'Drafting…'
  try {
    const { result } = await call({
      type: 'draft', design: $('design').value, model: $('model').value,
      sa: $('sa').checked, complete: $('complete').checked, options,
    })
    current = result
    const errs = [...result.logs.error, ...result.logs.warn]
    $('log').textContent = errs.slice(0, 6).join('\n')
    $('status').textContent = `${result.stacks.length} stacks · drafted in ${result.ms.toFixed(0)} ms`
    show()
    if (reframe) frame()
  } catch (e) {
    $('status').textContent = 'Draft failed'
    $('log').textContent = e.message.slice(0, 800)
  }
  busy = false
  if (again) { again = false; redraw() }
}

function renderPartsList() {
  const box = $('parts')
  box.innerHTML = ''
  for (const st of current.stacks) {
    const l = document.createElement('label')
    const c = Object.assign(document.createElement('input'), { type: 'checkbox', checked: !hiddenParts.has(st.name) })
    c.onchange = () => { c.checked ? hiddenParts.delete(st.name) : hiddenParts.add(st.name); show() }
    l.append(st.name, c)
    box.append(l)
  }
}

function renderOptions(info) {
  const box = $('options')
  box.innerHTML = ''
  options = {}
  for (const [name, o] of Object.entries(info.options)) {
    const isPct = o.pct !== undefined, isMm = o.mm !== undefined, isDeg = o.deg !== undefined
    const l = document.createElement('label')
    const t = document.createElement('span'); t.textContent = name; l.append(t)
    let input
    if (isPct || isMm || isDeg) {
      const def = o.pct ?? o.mm ?? o.deg
      input = Object.assign(document.createElement('input'), { type: 'range', min: o.min ?? 0, max: o.max ?? 100, step: isPct ? 0.5 : 1, value: def })
      input.oninput = () => { options[name] = isPct ? +input.value / 100 : +input.value; redraw() }
    } else if (o.bool !== undefined) {
      input = Object.assign(document.createElement('input'), { type: 'checkbox', checked: o.bool })
      input.onchange = () => { options[name] = input.checked; redraw() }
    } else if (o.list) {
      input = document.createElement('select')
      for (const v of o.list) input.add(new Option(v, v, false, v === o.dflt))
      input.onchange = () => { options[name] = input.value; redraw() }
    } else continue
    l.append(input)
    box.append(l)
  }
}

async function loadDesign() {
  hiddenParts = new Set()
  $('status').textContent = 'Loading design…'
  try {
    const { info } = await call({ type: 'info', design: $('design').value })
    renderOptions(info)
  } catch { $('options').innerHTML = '' }
  await redraw(true)
  if (current) renderPartsList()
}

async function init() {
  const { designs, models } = await call({ type: 'index' })
  for (const d of designs) $('design').add(new Option(d, d))
  for (const m of models) $('model').add(new Option(m.replace(/^cis/, ''), m))
  const q = new URLSearchParams(location.search)
  $('design').value = designs.includes(q.get('design')) ? q.get('design') : 'aaron'
  $('model').value = models.includes('cisFemaleAdult36') ? 'cisFemaleAdult36' : models[0]
  for (const [k, id] of [['explode', 'explode'], ['drape', 'drape'], ['thick', 'thick']]) if (q.has(k)) $(id).value = q.get(k)
  if (q.get('points')) $('points').checked = true
  $('design').onchange = loadDesign
  $('model').onchange = () => redraw()
  for (const id of ['sa', 'complete']) $(id).onchange = () => redraw()
  for (const id of ['explode', 'thick', 'drape', 'points']) $(id).oninput = show
  loadDesign()
}
init()
