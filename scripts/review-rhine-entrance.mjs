import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const baseUrl = process.env.RHINE_REVIEW_URL || 'http://127.0.0.1:5173/#rhine-archive'
const output = new URL(process.env.RHINE_REVIEW_OUTPUT || '../review/rhine-archive/entrance/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.RHINE_BROWSER_CHANNEL || undefined })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const failures = []
page.on('console', (message) => { if (message.type() === 'error') failures.push(`console: ${message.text()}`) })
page.on('pageerror', (error) => failures.push(`page: ${error.message}`))
page.on('response', (response) => { if (response.status() >= 400) failures.push(`${response.status()}: ${response.url()}`) })

const shot = async (name) => page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)) })
await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await shot('01-warning')
const warningGeometry = await page.locator('.rhine-warning-panel').evaluate((panel) => {
  const symbol = panel.querySelector('.rhine-warning-symbol')
  const panelRect = panel.getBoundingClientRect()
  const symbolRect = symbol.getBoundingClientRect()
  return {
    centerDelta: Math.abs((panelRect.left + panelRect.width / 2) - (symbolRect.left + symbolRect.width / 2)),
    gap: panelRect.top - symbolRect.bottom,
  }
})
if (warningGeometry.centerDelta > .5 || warningGeometry.gap < 35 || warningGeometry.gap > 37) failures.push(`warning symbol drifted from the reference anchor: ${JSON.stringify(warningGeometry)}`)
await page.waitForTimeout(1720)
await shot('02-flash')
await page.waitForTimeout(1400)
await shot('03-logo-seed')
await page.waitForTimeout(1100)
await shot('04-logo-lockup')
await page.waitForTimeout(1200)
await shot('05-login-reveal')
if (await page.locator('.rhine-entrance').getAttribute('data-entrance-phase') !== 'login-ready' && !await page.locator('.rhine-login-form button').isDisabled()) failures.push('entry unlocked before the form choreography completed')
await page.waitForFunction(() => document.querySelector('.rhine-entrance')?.dataset.entrancePhase === 'login-ready', null, { timeout: 10000 })
await page.waitForTimeout(120)
if (await page.locator('.rhine-login-form button').isDisabled()) failures.push('login remained locked after the form choreography completed')
await shot('06-login-ready')
await page.locator('.rhine-login-form button').click()
await page.waitForTimeout(120)
const invalidFields = await page.locator('.rhine-login-form input:invalid').count()
if (invalidFields !== 1 || await page.locator('.rhine-login').isHidden()) failures.push('empty access code did not retain the native validation state')
if (await page.locator('input[name="rhine-username"], input[name="rhine-password"], [data-login-register]').count()) failures.push('obsolete account or registration controls remain')
await page.locator('input[name="rhine-access-code"]').fill('0000')
await page.locator('.rhine-login-form button').click()
await page.waitForTimeout(120)
if (await page.locator('.rhine-login-error').textContent() !== '访问码不正确，请重试') failures.push('incorrect access code did not show the error')
if (await page.locator('.rhine-login').isHidden()) failures.push('incorrect access code incorrectly entered the site')
await page.locator('input[name="rhine-access-code"]').fill('9029')
await page.locator('input[name="rhine-access-code"]').press('Enter')
await page.waitForTimeout(920)
await shot('07-lunar-phases')
await page.waitForFunction(() => document.querySelector('.rhine-entrance')?.dataset.entrancePhase === 'permission-authorized', null, { timeout: 5000 })
await page.waitForTimeout(200)
const authorizedText = page.locator('[data-phases-title]')
if (await authorizedText.textContent() !== 'LUNAR MISSION AUTHORIZED') failures.push('authorization copy is incomplete or uses the old project name')
if (!await authorizedText.isVisible() || await authorizedText.evaluate(el => Number(getComputedStyle(el).opacity)) < .95) failures.push('authorization copy did not remain visible for its hold')
const phases = await page.locator('[data-login-phases] canvas').evaluate(canvas => ({
  width: canvas.width, height: canvas.height,
  fallback: !!canvas.closest('.has-fallback'),
  error: canvas.getContext('webgl2')?.getError(),
}))
if (!phases.width || !phases.height || phases.fallback || phases.error !== 0) failures.push(`authorization Phases shader is not rendering: ${JSON.stringify(phases)}`)
await shot('08-permission-authorized')
if (await page.locator('.rhine-entry-transition').count()) failures.push('removed entrance transition video is still mounted')
await page.locator('.rhine-entrance').waitFor({ state: 'detached', timeout: 9000 })
await page.locator('.rhine-main-navigation').waitFor({ state: 'visible', timeout: 9000 })
await page.waitForTimeout(60)
const homeTitle = (await page.locator('.rhine-home-copy h1').textContent()).replace(/\s+/g, ' ').trim()
if (!homeTitle.includes('WELCOME TO') || !homeTitle.includes('STEAL THE MOON')) failures.push('homepage title does not preserve the entrance title wording')
const homeCopy = await page.locator('.rhine-home-copy').textContent()
if (!homeCopy.includes('VEIKO') || /fserant/i.test(homeCopy)) failures.push('homepage owner label was not updated')
await shot('09-home-title-handoff')
await page.waitForTimeout(840)
await shot('10-home-entered')
console.log(JSON.stringify({ failures, screenshots: 10 }, null, 2))
await browser.close()
process.exitCode = failures.length ? 1 : 0
