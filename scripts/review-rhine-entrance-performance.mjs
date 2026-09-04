import { chromium } from 'playwright'

const baseUrl = process.env.RHINE_REVIEW_URL || 'http://127.0.0.1:5173/#rhine-archive'
const browser = await chromium.launch({ headless: true, channel: process.env.RHINE_BROWSER_CHANNEL || undefined })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const failures = []

page.on('pageerror', (error) => failures.push(`page: ${error.message}`))
page.on('response', (response) => { if (response.status() >= 400) failures.push(`${response.status()}: ${response.url()}`) })

if (process.env.RHINE_PROFILE_GL) await page.addInitScript(() => {
  window.__rhineSlowGl = []
  const getContext = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (kind, options) {
    const gl = getContext.call(this, kind, options)
    if (!gl || !kind.startsWith('webgl') || gl.__profiled) return gl
    gl.__profiled = true
    for (const method of ['compileShader', 'linkProgram', 'getProgramParameter', 'getShaderParameter', 'useProgram', 'texImage2D', 'checkFramebufferStatus', 'drawArrays']) {
      const original = gl[method].bind(gl)
      gl[method] = (...args) => {
        const started = performance.now(), result = original(...args), duration = performance.now() - started
        if (duration > 8) window.__rhineSlowGl.push({ method, at: started, duration, component: this.parentElement?.className })
        return result
      }
    }
    return gl
  }
})

await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.waitForFunction(() => document.querySelector('.rhine-entrance')?.dataset.entrancePhase === 'login-ready', null, { timeout: 12000 })
await page.locator('input[name="rhine-access-code"]').fill('9029')

await page.evaluate(() => {
  const samples = []
  let previous
  const startedAt = performance.now()
  let running = true
  const sample = (now) => {
    if (previous !== undefined) samples.push({ delta: now - previous, at: now - startedAt })
    previous = now
    if (running) requestAnimationFrame(sample)
  }
  window.__rhineEntrancePerf = {
    samples,
    startedAt,
    stop: () => { running = false },
  }
  requestAnimationFrame(sample)
})

await page.locator('.rhine-login-form button').click()
await page.locator('.rhine-entrance').waitFor({ state: 'detached', timeout: 14000 })
await page.waitForTimeout(120)

const samples = await page.evaluate(() => {
  window.__rhineEntrancePerf.stop()
  return window.__rhineEntrancePerf.samples
})
const ordered = [...samples].sort((a, b) => a.delta - b.delta)
const averageMs = samples.reduce((sum, sample) => sum + sample.delta, 0) / Math.max(samples.length, 1)
const p95Ms = ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * .95))]?.delta || 0
const maxSample = ordered.at(-1) || { delta: 0, at: 0 }
const maxMs = maxSample.delta
const over34Ms = samples.filter((sample) => sample.delta > 34).length
const over50Ms = samples.filter((sample) => sample.delta > 50).length
const slowGlCalls = await page.evaluate(() => window.__rhineSlowGl?.filter(call => call.at >= window.__rhineEntrancePerf.startedAt).map(call => ({ ...call, at: call.at - window.__rhineEntrancePerf.startedAt })))

if (averageMs > 19.5) failures.push(`post-login animation average frame time is ${averageMs.toFixed(2)}ms`)
if (p95Ms > 34) failures.push(`post-login animation p95 frame time is ${p95Ms.toFixed(2)}ms`)
if (over50Ms > 0) failures.push(`post-login animation has ${over50Ms} frames over 50ms`)

console.log(JSON.stringify({
  failures,
  frames: samples.length,
  averageMs: Number(averageMs.toFixed(2)),
  p95Ms: Number(p95Ms.toFixed(2)),
  maxMs: Number(maxMs.toFixed(2)),
  maxAtMs: Number(maxSample.at.toFixed(2)),
  over34Ms,
  over50Ms,
  slowGlCalls,
}, null, 2))

await browser.close()
process.exitCode = failures.length ? 1 : 0
