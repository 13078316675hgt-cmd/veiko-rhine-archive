import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const baseUrl = process.env.RHINE_REVIEW_URL || 'http://127.0.0.1:5173/?rhineBypass=1#rhine-archive'
const output = new URL('../review/rhine-archive/motion/', import.meta.url)
await mkdir(output, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const failures = []
page.on('console', (message) => { if (message.type() === 'error') failures.push(`console: ${message.text()}`) })
page.on('pageerror', (error) => failures.push(`page: ${error.message}`))
page.on('response', (response) => { if (response.status() >= 400) failures.push(`${response.status()}: ${response.url()}`) })

const styleOf = (selector, properties) => page.locator(selector).evaluate((node, names) => {
  const style = getComputedStyle(node)
  return Object.fromEntries(names.map((name) => [name, style[name]]))
}, properties)

await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.locator('.rhine-main-navigation').waitFor({ state: 'visible' })

const homeStart = await styleOf('[data-home-orange] path:first-child', ['strokeDashoffset'])
await page.waitForTimeout(360)
const homeMiddle = await styleOf('[data-home-orange] path:first-child', ['strokeDashoffset'])
await page.screenshot({ path: fileURLToPath(new URL('01-home-assembly-mid.png', output)) })
await page.waitForTimeout(900)
const homeEnd = await styleOf('[data-home-orange] path:first-child', ['strokeDashoffset'])

await page.getByRole('button', { name: 'MEMBER', exact: true }).click()
await page.waitForTimeout(1100)
const memberLayout = await page.locator('.rhine-member-card').evaluateAll((nodes) => nodes.map((node) => {
  const style = getComputedStyle(node)
  return {
    slot: Number(node.dataset.memberSlot),
    hidden: node.getAttribute('aria-hidden') === 'true',
    opacity: Number(style.opacity),
    transform: style.transform,
  }
}))
const visibleMemberLayout = memberLayout.filter((card) => !card.hidden && card.opacity > 0)
if (visibleMemberLayout.length !== 5) failures.push(`member stack visible card count: ${visibleMemberLayout.length}`)
if (visibleMemberLayout.some((card) => Math.abs(card.slot) > 2)) failures.push('member stack exposed a card outside the five-card film strip')
const memberHolo = page.locator('.rhine-member-stage-scan')
await memberHolo.evaluate((node) => node.getAnimations().filter((animation) => animation.effect?.target === node).forEach((animation) => { animation.pause(); animation.currentTime = 0 }))
const holoBeforePointer = await styleOf('.rhine-member-stage-scan', ['transform', 'filter'])
await page.mouse.move(80, 80)
await page.waitForTimeout(30)
const holoAfterPointer = await styleOf('.rhine-member-stage-scan', ['transform', 'filter'])
await memberHolo.evaluate((node) => node.getAnimations().filter((animation) => animation.effect?.target === node).forEach((animation) => { animation.currentTime = 17000 }))
const holoAfterEase = await styleOf('.rhine-member-stage-scan', ['transform', 'filter'])
if (holoBeforePointer.transform !== holoAfterPointer.transform) failures.push('member hologram changed in response to pointer movement')
if (holoBeforePointer.transform === holoAfterEase.transform) failures.push('member hologram has no autonomous easing motion')
const freezeFoldStyle = await page.addStyleTag({ content: '.rhine-member-track:is(.is-sliding-left,.is-sliding-right), .rhine-member-card:is(.is-folding-left,.is-folding-right,.is-incoming) { animation-play-state: paused !important; }' })
await page.getByRole('button', { name: 'Next member', exact: true }).click()
const memberTrack = page.locator('.rhine-member-track:is(.is-sliding-left,.is-sliding-right)')
const outgoingCard = page.locator('.rhine-member-card:is(.is-folding-left, .is-folding-right)')
const incomingCard = page.locator('.rhine-member-card.is-incoming')
await memberTrack.waitFor({ state: 'attached' })
await outgoingCard.waitFor({ state: 'attached' })
await incomingCard.waitFor({ state: 'attached' })
const setMemberTime = async (time) => {
  await Promise.all([memberTrack, outgoingCard, incomingCard].map((locator) => locator.evaluate((node, currentTime) => node.getAnimations().filter((animation) => animation.effect?.target === node).forEach((animation) => { animation.pause(); animation.currentTime = currentTime }), time)))
}
await setMemberTime(0)
const outgoingCount = await outgoingCard.count()
const incomingMotionCount = await incomingCard.count()
const fullOutgoingCard = await outgoingCard.locator(':scope > .rhine-member-code, :scope > .rhine-member-name').count()
const fullIncomingCard = await incomingCard.locator(':scope > .rhine-member-code, :scope > .rhine-member-name').count()
const memberStart = {
  track: await styleOf('.rhine-member-track', ['transform', 'animationName']),
  incoming: await styleOf('.rhine-member-card.is-incoming', ['transform', 'filter', 'opacity', 'animationName']),
  outgoing: await outgoingCard.evaluate((node) => { const style = getComputedStyle(node); return { transform: style.transform, filter: style.filter, opacity: style.opacity, animationName: style.animationName, animationDuration: style.animationDuration } }),
}
await page.screenshot({ path: fileURLToPath(new URL('02a-member-fold-start.png', output)) })
await setMemberTime(230)
const memberMiddle = {
  track: await styleOf('.rhine-member-track', ['transform', 'animationName']),
  incoming: await styleOf('.rhine-member-card.is-incoming', ['transform', 'filter', 'opacity', 'animationName']),
  outgoing: await outgoingCard.evaluate((node) => { const style = getComputedStyle(node); return { transform: style.transform, filter: style.filter, opacity: style.opacity, animationName: style.animationName, animationDuration: style.animationDuration } }),
}
await page.screenshot({ path: fileURLToPath(new URL('02b-member-fold-mid.png', output)) })
await setMemberTime(459)
const memberEnd = {
  track: await styleOf('.rhine-member-track', ['transform', 'animationName']),
  incoming: await styleOf('.rhine-member-card.is-incoming', ['transform', 'filter', 'opacity', 'animationName']),
  outgoing: await outgoingCard.evaluate((node) => { const style = getComputedStyle(node); return { transform: style.transform, filter: style.filter, opacity: style.opacity, animationName: style.animationName } }),
}
await page.screenshot({ path: fileURLToPath(new URL('02c-member-fold-end.png', output)) })
await memberTrack.evaluate((node) => node.dispatchEvent(new AnimationEvent('animationend', { animationName: getComputedStyle(node).animationName, bubbles: true })))
await freezeFoldStyle.evaluate((node) => node.remove())
await page.waitForTimeout(40)
const selectedMember = await page.locator('.rhine-member-card.is-current .rhine-member-name b').textContent()
if (outgoingCount !== 1) failures.push(`member outgoing animation count: ${outgoingCount}`)
if (incomingMotionCount !== 1) failures.push(`member incoming animation count: ${incomingMotionCount}`)
if (fullOutgoingCard !== 2 || fullIncomingCard !== 2) failures.push('member switch did not keep both complete card compositions')
if (new Set([memberStart.track.transform, memberMiddle.track.transform, memberEnd.track.transform]).size < 3) failures.push('member stack has no coherent horizontal track motion')
if (new Set([memberStart.outgoing.transform, memberMiddle.outgoing.transform, memberEnd.outgoing.transform]).size < 3) failures.push('outgoing member card has no fold progression')
if (new Set([memberStart.incoming.transform, memberMiddle.incoming.transform, memberEnd.incoming.transform]).size < 3) failures.push('incoming member card has no depth promotion')
if (selectedMember?.trim() !== 'KRISTEN WRIGHT') failures.push(`member carousel ended on ${selectedMember}`)
await page.getByRole('button', { name: 'Next member', exact: true }).click()
await page.getByRole('button', { name: 'Next member', exact: true }).click()
await page.waitForTimeout(520)
const rapidMember = await page.locator('.rhine-member-card.is-current .rhine-member-name b').textContent()
if (rapidMember?.trim() !== 'JARA. B. WILSON JR.') failures.push(`rapid member click bypassed the transition lock and ended on ${rapidMember}`)
await page.getByRole('button', { name: 'Previous member', exact: true }).click()
await page.waitForTimeout(20)
if (await page.locator('.rhine-member-card.is-folding-right').count() !== 1) failures.push('previous member did not produce one reverse fold')
await page.waitForTimeout(650)
const reverseMember = await page.locator('.rhine-member-card.is-current .rhine-member-name b').textContent()
if (reverseMember?.trim() !== 'KRISTEN WRIGHT') failures.push(`reverse member fold ended on ${reverseMember}`)

await page.getByRole('button', { name: 'DEPARTMENT', exact: true }).click()
await page.waitForTimeout(1100)
const departmentIdleRect = await page.locator('[data-department-preview]').evaluate((node) => { const rect = node.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, centerX: rect.x + rect.width / 2, centerY: rect.y + rect.height / 2 } })
await page.locator('.rhine-department-tile').nth(6).hover()
await page.waitForTimeout(40)
const departmentStart = await styleOf('[data-department-preview] img', ['transform', 'opacity'])
await page.waitForTimeout(190)
const departmentMiddle = await styleOf('[data-department-preview] img', ['transform', 'opacity'])
await page.screenshot({ path: fileURLToPath(new URL('03-department-preview-mid.png', output)) })
await page.waitForTimeout(420)
const departmentEnd = await styleOf('[data-department-preview] img', ['transform', 'opacity'])
const departmentSelectedRect = await page.locator('[data-department-preview]').evaluate((node) => { const rect = node.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, centerX: rect.x + rect.width / 2, centerY: rect.y + rect.height / 2 } })
const departmentMediaRect = await page.locator('.rhine-department-media').evaluate((node) => { const rect = node.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, centerX: rect.x + rect.width / 2, centerY: rect.y + rect.height / 2 } })
if (new Set([departmentStart.transform, departmentMiddle.transform, departmentEnd.transform]).size < 3) failures.push('department preview has no continuous scale states')
if (departmentEnd.opacity !== '1') failures.push(`department preview final opacity is ${departmentEnd.opacity}`)
if (Math.abs(departmentIdleRect.centerX - departmentSelectedRect.centerX) > .5 || Math.abs(departmentIdleRect.centerY - departmentSelectedRect.centerY) > .5) failures.push('department console shifted between idle and selected states')
if (Math.abs(departmentIdleRect.centerX - departmentMediaRect.centerX) > .5 || Math.abs(departmentIdleRect.centerY - departmentMediaRect.centerY) > .5) failures.push('department media did not open from the idle console anchor')
await page.mouse.move(1, 1)
await page.waitForTimeout(80)
if (await page.locator('.rhine-department-media').count()) failures.push('department media remained open after pointer left the tile')

await page.getByRole('button', { name: 'RESEARCH', exact: true }).click()
await page.waitForTimeout(420)
await page.screenshot({ path: fileURLToPath(new URL('04-research-entry-mid.png', output)) })
await page.waitForTimeout(900)
const researchEnd = await styleOf('.rhine-progress-system', ['transform', 'opacity'])
if (researchEnd.opacity !== '1') failures.push(`research UI final opacity is ${researchEnd.opacity}`)

console.log(JSON.stringify({
  failures,
  states: {
    home: [homeStart, homeMiddle, homeEnd],
    member: { motion: [memberStart, memberMiddle, memberEnd], hologram: { beforePointer: holoBeforePointer, afterPointer: holoAfterPointer, afterEase: holoAfterEase } },
    department: { motion: [departmentStart, departmentMiddle, departmentEnd], idleRect: departmentIdleRect, selectedRect: departmentSelectedRect, mediaRect: departmentMediaRect },
    research: researchEnd,
  },
  screenshots: 6,
}, null, 2))

await browser.close()
process.exitCode = failures.length ? 1 : 0
