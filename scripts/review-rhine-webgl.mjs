import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const origin = new URL(process.env.RHINE_REVIEW_URL || 'http://127.0.0.1:5173/').origin
const output = new URL(process.env.RHINE_REVIEW_OUTPUT || '../review/rhine-webgl/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.RHINE_BROWSER_CHANNEL || undefined })
const results = []
const failures = []

// Instrument the real GL calls without changing shader sources or normal pixels.
function instrument() {
  const getContext = HTMLCanvasElement.prototype.getContext
  window.__glReview = { contexts: [], fixedTime: null, fullPasses: false }
  HTMLCanvasElement.prototype.getContext = function (kind, options) {
    const gl = getContext.call(this, kind, options)
    if (kind !== 'webgl2' || !gl || gl.__review) return gl
    const info = { gl, canvas: this, draws: 0, imageDraws: 0, compiles: 0, allocations: 0, shaderTime: 0, shaderFrame: 0, live: {}, errors: [], capture: false }
    gl.__review = info
    window.__glReview.contexts.push(info)
    for (const type of ['Texture', 'Framebuffer', 'Program', 'Shader', 'Buffer', 'VertexArray']) {
      const live = new Set()
      info.live[type] = live
      const create = gl['create' + type].bind(gl), destroy = gl['delete' + type].bind(gl)
      gl['create' + type] = (...args) => { const item = create(...args); if (item) live.add(item); return item }
      gl['delete' + type] = (item) => { live.delete(item); return destroy(item) }
    }
    const locations = new Map()
    const location = gl.getUniformLocation.bind(gl)
    gl.getUniformLocation = (program, name) => { const item = location(program, name); if (item) locations.set(item, name); return item }
    const uniform1f = gl.uniform1f.bind(gl), uniform1i = gl.uniform1i.bind(gl)
    gl.uniform1f = (loc, value) => {
      if (locations.get(loc) === 'iTime') { value = window.__glReview.fixedTime ?? value; info.shaderTime = value }
      return uniform1f(loc, value)
    }
    gl.uniform1i = (loc, value) => { if (locations.get(loc) === 'iFrame') { value = window.__glReview.fixedFrame ?? value; info.shaderFrame = value }; return uniform1i(loc, value) }
    const compile = gl.compileShader.bind(gl), allocate = gl.texImage2D.bind(gl), enable = gl.enable.bind(gl)
    gl.compileShader = (...args) => { info.compiles++; return compile(...args) }
    gl.texImage2D = (...args) => { info.allocations++; return allocate(...args) }
    gl.enable = (flag) => { if (flag !== gl.SCISSOR_TEST || !window.__glReview.fullPasses) enable(flag) }
    const draw = gl.drawArrays.bind(gl)
    gl.drawArrays = (...args) => {
      draw(...args); info.draws++
      if (gl.getParameter(gl.FRAMEBUFFER_BINDING) !== null) return
      info.imageDraws++
      if (info.frameTimes) info.frameTimes.push(performance.now())
      if (!info.capture) return
      info.capture = false
      const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4)
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      info.pixels = pixels
      info.errors.push(gl.getError())
    }
    return gl
  }
}

async function run(name, callback) {
  try { const detail = await callback(); results.push({ name, detail }); console.log('PASS', name) }
  catch (error) { failures.push({ name, error: error.message }); console.error('FAIL', name, error.message) }
}

const page = await browser.newPage({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', e => errors.push(e.message))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`) })
await page.addInitScript(instrument)
const selector = '.rhine-wxdfzj-blackhole'
const ready = () => page.waitForFunction(() => document.querySelector('.rhine-wxdfzj-blackhole')?.dataset.blackHoleStatus === 'ready', null, { timeout: 90000 })
const state = () => page.evaluate(() => {
  const root = document.querySelector('.rhine-wxdfzj-blackhole'), c = root.querySelector('canvas'), d = c.getContext('webgl2').__review
  return { status: root.dataset.blackHoleStatus, width: c.width, height: c.height, cssWidth: c.clientWidth, cssHeight: c.clientHeight, draws: d.imageDraws, time: d.shaderTime, frame: d.shaderFrame, compiles: d.compiles, allocations: d.allocations, live: Object.fromEntries(Object.entries(d.live).map(([k,v])=>[k,v.size])), error: d.gl.getError() }
})
const capture = async () => {
  await page.evaluate(() => { const d = document.querySelector('.rhine-wxdfzj-blackhole canvas').getContext('webgl2').__review; d.pixels = null; d.capture = true })
  await page.waitForFunction(() => document.querySelector('.rhine-wxdfzj-blackhole canvas').getContext('webgl2').__review.pixels !== null, null, { timeout: 15000 })
  return page.evaluate(() => {
    const d = document.querySelector('.rhine-wxdfzj-blackhole canvas').getContext('webgl2').__review
    let lit = 0
    for(let i=0;i<d.pixels.length;i+=4) if(Math.max(d.pixels[i],d.pixels[i+1],d.pixels[i+2])>24) lit++
    return { litFraction: lit/(d.pixels.length/4), errors: d.errors }
  })
}
try {
  if (process.env.RHINE_WEBGL_ONLY !== 'fixture') {
  await page.goto(origin + '/?rhineBypass=1#rhine-research')
  await ready()
  await run('five-pass initialization, floating targets, visible output and DPR cap', async () => {
    const pixels = await capture(), s = await state()
    assert.equal(s.error, 0); assert.equal(s.compiles, 6)
    assert.equal(s.live.Framebuffer, 6); assert.equal(s.live.Program, 5)
    assert.equal(s.live.Texture, 8); assert.ok(s.width * s.height <= 1_002_000)
    assert.ok(s.width <= s.cssWidth && s.height <= s.cssHeight)
    assert.ok(pixels.litFraction > .05); assert.ok(pixels.errors.every(x=>x===0))
    await page.screenshot({ path: fileURLToPath(new URL('research-desktop.png', output)) })
    return { ...s, ...pixels }
  })
  await run('navigation pause/resume freezes simulation time and reuses resources', async () => {
    await page.getByRole('button', { name: 'HOMEPAGE', exact: true }).click()
    await page.waitForTimeout(1300)
    const paused = await state()
    await page.waitForTimeout(1800)
    assert.equal((await state()).draws, paused.draws)
    await page.getByRole('button', { name: 'RESEARCH', exact: true }).click()
    await page.waitForTimeout(1200)
    const resumed = await state()
    assert.ok(resumed.draws > paused.draws)
    assert.ok(resumed.time - paused.time < 1.8, 'paused wall time leaked into shader time')
    assert.equal(resumed.compiles, paused.compiles); assert.equal(resumed.allocations, paused.allocations)
    return { paused, resumed }
  })
  await run('hidden document pause and resume', async () => {
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
    const before = await state(); await page.waitForTimeout(1100)
    assert.equal((await state()).draws, before.draws)
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) })
    await page.waitForTimeout(500); assert.ok((await state()).draws > before.draws)
  })
  await run('resize reallocates six targets once, resets history and preserves aspect', async () => {
    const before = await state()
    await page.setViewportSize({ width: 760, height: 520 }); await page.waitForTimeout(900)
    const after = await state()
    assert.equal(after.allocations-before.allocations, 6); assert.equal(after.compiles, before.compiles)
    assert.equal(after.live.Framebuffer, 6); assert.equal(after.live.Texture, 8)
    assert.ok(Math.abs(after.width/after.height-after.cssWidth/after.cssHeight)<.01)
    await page.setViewportSize({ width: 760, height: 520 }); await page.waitForTimeout(300)
    assert.equal((await state()).allocations, after.allocations)
    assert.ok((await capture()).litFraction>.05)
    await page.screenshot({path:fileURLToPath(new URL('research-resized.png', output))})
    return after
  })
  await run('mouse and keyboard preserve live rendering', async () => {
    await page.mouse.move(420,280); await page.mouse.down(); await page.mouse.move(440,290,{steps:5}); await page.mouse.up()
    await page.keyboard.down('w'); await page.waitForTimeout(120); await page.keyboard.up('w')
    assert.ok((await capture()).litFraction>.05); assert.equal((await state()).error,0)
  })
  await run('shader frame scheduling respects the selected quality cap', async () => {
    await page.evaluate(() => { document.querySelector('.rhine-wxdfzj-blackhole canvas').getContext('webgl2').__review.frameTimes=[] })
    await page.waitForTimeout(2400)
    const timing=await page.evaluate(() => {
      const root=document.querySelector('.rhine-wxdfzj-blackhole')
      const d=root.querySelector('canvas').getContext('webgl2').__review
      const times=d.frameTimes; d.frameTimes=null
      const intervals=times.slice(1).map((t,i)=>t-times[i]).sort((a,b)=>a-b)
      return {quality:root.dataset.blackHoleQuality, frames:times.length, fps:1000*(times.length-1)/(times.at(-1)-times[0]), p95Ms:intervals[Math.floor(intervals.length*.95)]}
    })
    assert.ok(timing.frames>2)
    assert.ok(timing.fps <= {low:10,medium:18,high:24}[timing.quality]+1, JSON.stringify(timing))
    return timing
  })
  await run('context loss shows existing poster and restoration returns to canvas', async () => {
    await page.evaluate(() => { window.__lostExtension=document.querySelector('.rhine-wxdfzj-blackhole canvas').getContext('webgl2').getExtension('WEBGL_lose_context'); window.__lostExtension.loseContext() })
    await page.locator(selector+' .rhine-blackhole-fallback').waitFor({state:'visible'})
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.rhine-wxdfzj-blackhole canvas')).opacity === '0')
    assert.equal(await page.locator(selector+' canvas').evaluate(c=>getComputedStyle(c).opacity),'0')
    await page.evaluate(() => window.__lostExtension.restoreContext())
    await ready(); await capture()
    assert.equal(await page.locator(selector+' .rhine-blackhole-fallback').count(),0)
    const s=await state(); assert.equal(s.live.Framebuffer,6); assert.equal(s.live.Program,5); assert.equal(s.live.Texture,8); assert.equal(s.error,0)
    return s
  })
  await run('mobile resize', async () => {
    await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(1000)
    const s=await state(); assert.ok(Math.abs(s.width/s.height-390/844)<.01)
    assert.ok((await capture()).litFraction>.05)
    await page.screenshot({path:fileURLToPath(new URL('research-mobile.png',output))})
    return s
  })
  await run('console, network and WebGL errors', async () => assert.deepEqual(errors,[]))
  await run('restricted bloom passes match full-frame passes at mobile resolution', async () => {
    await page.evaluate(() => { window.__glReview.fixedTime=4; window.__glReview.fixedFrame=0 })
    await page.waitForTimeout(600); await capture()
    await page.evaluate(() => {
      const d=document.querySelector('.rhine-wxdfzj-blackhole canvas').getContext('webgl2').__review
      d.restrictedPixels=d.pixels.slice(); window.__glReview.fullPasses=true
    })
    await page.waitForTimeout(600); await capture()
    const comparison=await page.evaluate(() => {
      const d=document.querySelector('.rhine-wxdfzj-blackhole canvas').getContext('webgl2').__review
      let different=0,maxDelta=0
      for(let i=0;i<d.pixels.length;i++) {const delta=Math.abs(d.pixels[i]-d.restrictedPixels[i]);if(delta>1)different++;maxDelta=Math.max(maxDelta,delta)}
      return {different,maxDelta}
    })
    assert.equal(comparison.different,0,JSON.stringify(comparison))
    return comparison
  })
  }
  // A separate development fixture exercises React unmount and forced failures.
  // It imports the same component; no alternate renderer is substituted.
  const [componentModule, entryModule] = await Promise.all([
    fetch(origin + '/src/components/WxdfzjBlackHoleCanvas.jsx').then(r => r.text()),
    fetch(origin + '/src/rhine-main.jsx').then(r => r.text()),
  ])
  // Reuse Vite's exact optimized dependency URLs and CJS default exports.
  const reactUrl = componentModule.match(/"([^"\n]*\/react\.js[^"\n]*)"/)[1]
  const reactDomUrl = entryModule.match(/"([^"\n]*\/react-dom_client\.js[^"\n]*)"/)[1]
  const fixtureHtml = `<!doctype html><html><head><link rel="stylesheet" href="/src/rhine-archive-prototype.css"><style>#fixture,.rhine-wxdfzj-blackhole{position:fixed;inset:0}</style></head><body><div id="fixture"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
    const [{default:React},{default:ReactDOM},{WxdfzjBlackHoleCanvas}]=await Promise.all([import(${JSON.stringify(reactUrl)}),import(${JSON.stringify(reactDomUrl)}),import('/src/components/WxdfzjBlackHoleCanvas.jsx')]);
    const root=ReactDOM.createRoot(document.getElementById('fixture'));
    window.__unmount=()=>root.unmount();
    const render=(active)=>root.render(React.createElement(WxdfzjBlackHoleCanvas,{active,prepare:true,className:'rhine-blackhole-field',quality:'low'}));
    window.__activate=()=>render(true);
    render(__INITIAL_ACTIVE__);
  </script></body></html>`
  const fixture = async (mode, initiallyActive = true) => {
    const p=await browser.newPage({viewport:{width:480,height:320}})
    p.on('pageerror',error=>console.error('fixture:',error.message))
    await p.route(origin+'/__rhine-webgl-review',route=>route.fulfill({contentType:'text/html',body:fixtureHtml.replace('__INITIAL_ACTIVE__',String(initiallyActive))}))
    await p.addInitScript(instrument)
    if(mode) await p.addInitScript((mode)=>{
      const getContext=HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext=function(kind,options){
        if(kind==='webgl2' && mode==='webgl')return null
        const gl=getContext.call(this,kind,options)
        if(kind==='webgl2' && gl){
          const extension=gl.getExtension.bind(gl)
          gl.getExtension=(name)=>mode==='float' && name==='EXT_color_buffer_float'?null:extension(name)
          if(mode==='compile'){
            const source=gl.shaderSource.bind(gl)
            gl.shaderSource=(shader,text)=>source(shader,text.includes('RenderTopologyMap')?'deliberately invalid GLSL for failure-path validation':text)
          }
        }
        return gl
      }
    },mode)
    await p.goto(origin+'/__rhine-webgl-review')
    return p
  }
  await run('React unmount releases every GL resource',async()=>{
    const p=await fixture()
    try {
      await p.waitForFunction(()=>document.querySelector('.rhine-wxdfzj-blackhole')?.dataset.blackHoleStatus==='ready',null,{timeout:90000})
      await p.evaluate(()=>window.__unmount())
      await p.waitForFunction(()=>!document.querySelector('.rhine-wxdfzj-blackhole'))
      const live=await p.evaluate(()=>window.__glReview.contexts.map(d=>Object.fromEntries(Object.entries(d.live).map(([name,set])=>[name,set.size]))))
      assert.ok(live.every(context=>Object.values(context).every(count=>count===0)),JSON.stringify(live))
      return live
    } finally {await p.close()}
  })
  await run('inactive preparation does not draw; activation reuses prepared programs',async()=>{
    const p=await fixture(undefined,false)
    try {
      await p.waitForFunction(()=>document.querySelector('.rhine-wxdfzj-blackhole')?.dataset.blackHoleStatus==='ready',null,{timeout:90000})
      await p.waitForTimeout(300)
      const before=await p.evaluate(()=>{const d=window.__glReview.contexts[0];return {draws:d.imageDraws,compiles:d.compiles}})
      assert.equal(before.draws,0)
      await p.evaluate(()=>window.__activate())
      await p.waitForFunction(()=>window.__glReview.contexts[0].imageDraws>2)
      assert.equal(await p.evaluate(()=>window.__glReview.contexts[0].compiles),before.compiles)
    } finally {await p.close()}
  })
  for(const mode of ['webgl','float','compile']) await run(mode+' failure uses existing poster',async()=>{
    const p=await fixture(mode)
    try {
      await p.locator('.rhine-blackhole-fallback').waitFor({state:'visible',timeout:90000})
      await p.waitForFunction(()=>document.querySelector('.rhine-blackhole-fallback')?.naturalWidth>0)
      const detail=await p.locator('.rhine-wxdfzj-blackhole').evaluate(el=>({...el.dataset}))
      assert.equal(detail.blackHoleStatus,'error');assert.ok(detail.blackHoleError)
      return detail
    } finally {await p.close()}
  })
} catch (error) {
  failures.push({ name: 'review setup', error: error.message })
  console.error(error)
} finally {
  await browser.close()
  await writeFile(new URL('validation.json',output),JSON.stringify({results,failures},null,2))
}
process.exitCode=failures.length?1:0
