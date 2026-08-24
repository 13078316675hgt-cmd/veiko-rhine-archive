import { chromium } from 'playwright'

const baseUrl = process.env.RHINE_REVIEW_URL || 'http://127.0.0.1:5173/?rhineBypass=1#rhine-archive'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const cpuThrottle = Number(process.env.RHINE_CPU_THROTTLE || 1)
if (cpuThrottle > 1) {
  const client = await page.context().newCDPSession(page)
  await client.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle })
}

const failures = []
page.on('console', (message) => { if (message.type() === 'error') failures.push(`console: ${message.text()}`) })
page.on('pageerror', (error) => failures.push(`page: ${error.message}`))

await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.locator('.rhine-main-navigation').waitFor({ state: 'visible' })

const sampleFrames = async (name, duration = 1600) => page.evaluate(async ({ name, duration }) => {
  const deltas = []
  let previous = performance.now()
  const started = previous
  await new Promise((resolve) => {
    const sample = (now) => {
      deltas.push(now - previous)
      previous = now
      if (now - started < duration) requestAnimationFrame(sample)
      else resolve()
    }
    requestAnimationFrame(sample)
  })
  const values = deltas.slice(1).sort((a, b) => a - b)
  return {
    name,
    frames: values.length,
    averageMs: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
    p95Ms: Number((values[Math.floor(values.length * .95)] || 0).toFixed(2)),
    maxMs: Number(Math.max(...values).toFixed(2)),
    over34Ms: values.filter((value) => value > 34).length,
  }
}, { name, duration })

const results = []
for (const scene of ['HOMEPAGE', 'HEADQUARTERS', 'MEMBER', 'DEPARTMENT', 'RESEARCH']) {
  await page.getByRole('button', { name: scene, exact: true }).click()
  await page.waitForTimeout(800)
  results.push(await sampleFrames(scene))
  if (scene === 'MEMBER') {
    await page.getByRole('button', { name: 'Next member', exact: true }).click()
    results.push(await sampleFrames('MEMBER SWITCH', 800))
  }
}

for (const result of results) {
  const isTransition = result.name.includes('SWITCH') || result.name === 'HEADQUARTERS'
  const p95Limit = cpuThrottle > 1 ? (isTransition ? 90 : 40) : (isTransition ? 90 : 22)
  const slowFrameLimit = cpuThrottle > 1 ? (isTransition ? 12 : 4) : (isTransition ? 12 : 3)
  if (result.p95Ms > p95Limit) failures.push(`${result.name} p95 frame time: ${result.p95Ms}ms`)
  if (result.over34Ms > slowFrameLimit) failures.push(`${result.name} slow frames: ${result.over34Ms}`)
}

console.log(JSON.stringify({ cpuThrottle, results, failures }, null, 2))
await browser.close()
process.exitCode = failures.length ? 1 : 0
