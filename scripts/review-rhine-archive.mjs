import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const baseUrl = process.env.RHINE_REVIEW_URL || 'http://127.0.0.1:5173/?rhineBypass=1#rhine-archive'
const output = new URL(process.env.RHINE_REVIEW_OUTPUT || '../review/rhine-archive/', import.meta.url)
await mkdir(output, { recursive: true })

const browser = await chromium.launch({ headless: true, channel: process.env.RHINE_BROWSER_CHANNEL || undefined })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const failures = []

page.on('console', (message) => {
  if (message.type() === 'error') failures.push(`console: ${message.text()}`)
})
page.on('pageerror', (error) => failures.push(`page: ${error.message}`))
page.on('response', (response) => {
  if (response.status() >= 400) failures.push(`${response.status()}: ${response.url()}`)
})

await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.locator('.rhine-main-navigation').waitFor({ state: 'visible', timeout: 8000 })

const scenes = ['HOMEPAGE', 'HEADQUARTERS', 'MEMBER', 'DEPARTMENT', 'RESEARCH']
for (const [index, scene] of scenes.entries()) {
  await page.getByRole('button', { name: scene, exact: true }).click()
  await page.waitForTimeout(index === 0 ? 1400 : 1100)
  const alignment = await page.evaluate((sectionIndex) => {
    const scroller = document.querySelector('[data-rhine-scroll]')
    const section = document.querySelectorAll('[data-rhine-view]')[sectionIndex]
    return Math.abs(scroller.scrollTop - section.offsetTop)
  }, index)
  if (alignment > 2) failures.push(`${scene} alignment delta: ${alignment}`)
  if (scene === 'HEADQUARTERS') {
    const gallery = page.locator('[data-headquarters-gallery]')
    const primary = gallery.locator('.rhine-headquarters-primary > .rhine-headquarters-media')
    const sidePlates = gallery.locator('.rhine-headquarters-side button')
    if (await primary.count() !== 1 || await sidePlates.count() !== 2) failures.push('headquarters gallery does not expose one primary and two secondary plates')
    const codeBefore = await gallery.locator('.rhine-headquarters-primary figcaption > b').textContent()
    await sidePlates.first().click()
    await page.waitForTimeout(200)
    const codeAfter = await gallery.locator('.rhine-headquarters-primary figcaption > b').textContent()
    if (codeBefore === codeAfter) failures.push('headquarters gallery did not advance after selecting a plate')
    const playback = await gallery.locator('video').evaluateAll((videos) => videos.map((video) => ({ primary: Boolean(video.closest('.rhine-headquarters-primary')), paused: video.paused, muted: video.muted })))
    if (playback.some((video) => !video.muted) || playback.filter((video) => video.primary).some((video) => video.paused)) failures.push(`headquarters video playback policy is incorrect: ${JSON.stringify(playback)}`)
    if (playback.length === 0) {
      const shaderIds = new Set()
      for (let sceneIndex = 0; sceneIndex < 3; sceneIndex += 1) {
        await primary.locator('canvas').waitFor({ state: 'visible' })
        const shader = await primary.evaluate((node) => {
          const canvas = node.querySelector('canvas')
          const gl = canvas.getContext(node.dataset.shadertoyId === 'WtjyzR' ? 'webgl' : 'webgl2')
          return { id: node.dataset.shadertoyId, fallback: node.classList.contains('has-fallback'), width: canvas.width, height: canvas.height, error: gl?.getError() }
        })
        shaderIds.add(shader.id)
        if (shader.fallback || !shader.width || !shader.height || shader.error !== 0) failures.push(`headquarters shader failed: ${JSON.stringify(shader)}`)
        await sidePlates.first().click()
        await page.waitForTimeout(300)
      }
      if (shaderIds.size !== 3 || !['WtjyzR', '3cScWy', 'W3SSRm'].every((id) => shaderIds.has(id))) failures.push(`headquarters shader selection is incomplete: ${[...shaderIds]}`)
    }
  }
  await page.screenshot({ path: fileURLToPath(new URL(`${String(index + 1).padStart(2, '0')}-${scene.toLowerCase()}.png`, output)) })
}

await page.getByRole('button', { name: 'MEMBER', exact: true }).click()
await page.waitForTimeout(1000)
const memberBefore = await page.locator('.rhine-member-card.is-current .rhine-member-name b').textContent()
await page.getByRole('button', { name: 'Next member' }).click()
await page.waitForTimeout(900)
const memberAfter = await page.locator('.rhine-member-card.is-current .rhine-member-name b').textContent()
if (memberBefore === memberAfter) failures.push('member carousel did not advance')

await page.getByRole('button', { name: 'DEPARTMENT', exact: true }).click()
await page.waitForTimeout(1000)
await page.locator('.rhine-department-tile').nth(6).click()
await page.waitForTimeout(650)
const departmentSelected = await page.locator('.rhine-department-tile').nth(6).getAttribute('aria-pressed')
if (departmentSelected !== 'true') failures.push('department selection did not change')

const selectedMember = await page.locator('.rhine-member-card.is-current').count()
const selectedDepartment = await page.locator('.rhine-department-tile.is-selected').count()
if (selectedMember !== 1) failures.push(`member selection count: ${selectedMember}`)
if (selectedDepartment !== 1) failures.push(`department selection count: ${selectedDepartment}`)

console.log(JSON.stringify({ baseUrl, failures, screenshots: scenes.length }, null, 2))
await browser.close()
process.exitCode = failures.length ? 1 : 0
