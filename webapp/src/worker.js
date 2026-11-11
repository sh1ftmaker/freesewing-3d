// Runs FreeSewing (the cloned monorepo sources) off the main thread.
import * as models from '@freesewing/models'
import { degreeMeasurements } from '@freesewing/config'

const loaders = import.meta.glob('../../designs/*/src/index.mjs')
const names = Object.keys(loaders)
  .map((p) => p.match(/designs\/([^/]+)\/src/)[1])
  .filter((n) => !['examples', 'plugintest', 'rendertest', 'legend', 'library'].includes(n))
  .sort()

const cache = {}
async function getDesign(name) {
  if (cache[name]) return cache[name]
  const key = Object.keys(loaders).find((p) => p.includes(`/designs/${name}/src/`))
  const mod = await loaders[key]()
  const Cls = mod[name.charAt(0).toUpperCase() + name.slice(1)] ||
    Object.values(mod).find((v) => typeof v === 'function' && v.prototype?.draft)
  if (!Cls) throw new Error(`No design class exported by ${name}`)
  return (cache[name] = { Cls, mod })
}

const modelNames = Object.keys(models).filter((k) => /^cis(Fe)?male/i.test(k))

const clean = (o) => JSON.parse(JSON.stringify(o))

function serializePart(part) {
  return {
    transform: part.attributes?.list?.transform || [],
    paths: Object.entries(part.paths).map(([name, p]) => ({
      name,
      ops: p.ops.map((o) => ({ type: o.type, to: o.to && { x: o.to.x, y: o.to.y }, cp1: o.cp1 && { x: o.cp1.x, y: o.cp1.y }, cp2: o.cp2 && { x: o.cp2.x, y: o.cp2.y } })),
      hidden: p.hidden,
      cls: p.attributes?.list?.class?.join(' ') || '',
      text: p.attributes?.list?.['data-text'] || null,
    })),
    points: Object.entries(part.points).map(([name, p]) => ({
      name, x: p.x, y: p.y, text: p.attributes?.list?.['data-text'] || null,
    })),
    snippets: Object.values(part.snippets).map((s) => ({ def: s.def, x: s.anchor.x, y: s.anchor.y })),
  }
}

self.onmessage = async ({ data }) => {
  const { id, type } = data
  try {
    if (type === 'index') {
      self.postMessage({ id, designs: names, models: modelNames })
      return
    }
    if (type === 'model') {
      self.postMessage({ id, values: clean(models[data.model]) })
      return
    }
    if (type === 'info') {
      const { Cls } = await getDesign(data.design)
      const cfg = new Cls().getConfig?.() || {}
      self.postMessage({ id, info: clean({
        parts: cfg.parts ? Object.keys(cfg.parts) : [],
        options: cfg.options || {},
        measurements: [...(cfg.measurements || []), ...(cfg.optionalMeasurements || [])],
        required: cfg.measurements || [],
        degrees: degreeMeasurements,
      }) })
      return
    }
    if (type === 'draft') {
      const { Cls } = await getDesign(data.design)
      const settings = {
        sa: data.sa ? 10 : 0,
        complete: data.complete,
        paperless: false,
        measurements: { ...models[data.model], ...(data.overrides || {}) },
        options: data.options || {},
        only: data.only?.length ? data.only : undefined,
      }
      const t0 = performance.now()
      const pattern = new Cls(settings)
      pattern.draft()
      const props = pattern.getRenderProps()
      const stacks = Object.entries(props.stacks).map(([name, s]) => ({
        name,
        transform: s.attributes.list.transform || [],
        parts: s.parts.map(serializePart),
      }))
      const logs = {}
      for (const lvl of ['error', 'warn']) logs[lvl] = (pattern.setStores?.[0]?.logs?.[lvl] || []).map(String)
      self.postMessage({
        id,
        result: clean({ stacks, width: props.width, height: props.height, logs, ms: performance.now() - t0 }),
      })
    }
  } catch (e) {
    self.postMessage({ id, error: String(e?.stack || e) })
  }
}
