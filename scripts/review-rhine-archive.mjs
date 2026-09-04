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
    const tabs = gallery.getByRole('tab')
    if (await tabs.count() !== 2) failures.push('headquarters must expose two memory sequences')
    for (let sequenceIndex = 0; sequenceIndex < 2; sequenceIndex++) {
      await tabs.nth(sequenceIndex).click()
      await page.waitForTimeout(180)
      if (await tabs.nth(sequenceIndex).getAttribute('aria-selected') !== 'true') failures.push('memory selection did not change')
      if (await gallery.getAttribute('data-memory-sequence') !== String(sequenceIndex + 1).padStart(2, '0')) failures.push('memory scene did not follow selection')
      if (await gallery.locator('canvas').getAttribute('data-ready') !== 'true') failures.push('memory canvas did not render')
      if (sequenceIndex === 1 && !await gallery.getByRole('tabpanel').innerText().then(text => text.includes('FRAGMENTS'))) failures.push('fragments scene was not renumbered to 02')
    }
    await tabs.nth(1).press('ArrowRight')
    if (await tabs.nth(0).getAttribute('aria-selected') !== 'true') failures.push('memory keyboard navigation did not wrap')
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
