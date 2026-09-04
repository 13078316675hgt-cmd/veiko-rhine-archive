import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { RHINE_CLONE, RHINE_DEPARTMENTS, RHINE_MEMBERS, RHINE_RESEARCH, rhineAsset } from '../data/rhineArchiveContent'
import { FractalTunnelCanvas } from './FractalTunnelCanvas'
import { ChromaticTunnelCanvas } from './ChromaticTunnelCanvas'
import { PhasesCanvas } from './PhasesCanvas'
import { WeaveCanvas } from './WeaveCanvas'
import { WxdfzjBlackHoleCanvas } from './WxdfzjBlackHoleCanvas'

gsap.registerPlugin(ScrollTrigger)

const basePath = () => import.meta.env.BASE_URL
const RHINE_ACCESS_CODE = '9029'
const AUTHORIZATION_CANVAS_SCALE = 1.085

function InfinityLogo({ compact = false }) {
  return <svg className={compact ? 'is-compact' : ''} viewBox="0 0 310 160" aria-hidden="true">
    <path className="rhine-infinity-outline" data-logo-outline d="M154 80 113 39C91 17 54 20 36 45S23 105 48 123c23 17 53 12 72-7l34-36 35-36c19-19 49-24 72-7 25 18 30 53 12 78s-55 28-77 6L154 80Z" fill="none" stroke="currentColor" strokeWidth="20" strokeLinejoin="round" />
    <path className="rhine-infinity-glyphs" data-logo-glyphs d="M73 58v44M51 80h44M217 80h43" fill="none" stroke="currentColor" strokeWidth="13" />
  </svg>
}

function MoonProjectLogo() {
  return <svg className="rhine-moon-project-logo" viewBox="0 0 48 48" aria-hidden="true">
    <path className="is-crescent" d="M31.5 5.5A18.5 18.5 0 1 0 36 37.2A15 15 0 0 1 31.5 5.5Z" />
    <path className="is-totem" d="M24 29.5V42M16.5 42h15M20 36.5h8" />
    <circle className="is-seal" cx="24" cy="42" r="2.2" />
  </svg>
}

function PioneerWaveLogo() {
  return <svg className="rhine-pioneer-wave-logo" viewBox="0 0 150 58" aria-hidden="true">
    <path className="is-gold" d="M5 31C25 13 38 10 54 25c12 12 23 13 38-1 13-12 29-13 53-5" />
    <path className="is-white" d="M5 24c22 13 35 16 52 3 15-12 25-19 42-12 13 5 25 8 46 1" />
  </svg>
}

function FixedBrand({ light = false, section = 'home' }) {
  const departmentBrand = section === 'departments'
  const title = departmentBrand ? 'RHINE LAB' : RHINE_CLONE.brand.title
  const lineOne = departmentBrand ? 'SYNTHESIZE INFORMATION' : RHINE_CLONE.brand.lineOne
  const lineTwo = departmentBrand ? 'ANALYSLS OS' : RHINE_CLONE.brand.lineTwo
  const hasMeta = lineOne || lineTwo
  return <div className={`rhine-fixed-brand ${light ? 'is-light' : ''}`}><strong>{title}</strong>{hasMeta && <small>{lineOne}{lineTwo && <><br />{lineTwo}</>}</small>}</div>
}

function FixedFooter({ light = false }) {
  return <div className={`rhine-fixed-footer ${light ? 'is-light' : ''}`}><span>{RHINE_CLONE.brand.footer}</span><i /></div>
}

function SectionTransitionCue({ code, label, target, tone = 'paper' }) {
  return <div className={`rhine-section-transition-cue is-${tone}`} data-transition-cue={target} aria-hidden="true">
    <span>{code}</span><b>{label}</b><i /><small>SCROLL TRANSFER</small>
  </div>
}

function Entrance({ onPrepare, onComplete }) {
  const rootRef = useRef(null)
  const [canLogin, setCanLogin] = useState(false)
  const [authorizing, setAuthorizing] = useState(false)
  const [loginError, setLoginError] = useState('')

  const handleLogin = useCallback((event) => {
    event.preventDefault()
    if (!canLogin || authorizing) return

    const form = event.currentTarget
    const data = new FormData(form)
    const accessCode = String(data.get('rhine-access-code') || '').trim()
    const authorized = accessCode === RHINE_ACCESS_CODE

    if (!authorized) {
      setLoginError('访问码不正确，请重试')
      form.querySelector('input')?.focus()
      return
    }

    setLoginError('')
    setAuthorizing(true)
  }, [authorizing, canLogin])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const context = gsap.context(() => {
      const introLogo = root.querySelector('[data-intro-logo]')
      const logoRect = introLogo?.getBoundingClientRect()
      const introLogoOffset = logoRect ? (window.innerWidth / 2) - (logoRect.left + logoRect.width / 2) : 0
      const primeStroke = (path) => {
        const length = path.getTotalLength()
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
      }

      root.querySelectorAll('[data-intro-logo] [data-logo-outline], [data-intro-logo] [data-logo-glyphs], [data-welcome] [data-logo-outline], [data-welcome] [data-logo-glyphs]').forEach(primeStroke)
      gsap.set('[data-login], [data-entrance-brand], [data-entrance-footer], [data-access], [data-welcome], [data-login-phases], [data-paper-wash]', { autoAlpha: 0 })
      gsap.set('[data-intro-logo]', { x: introLogoOffset, scale: .86, autoAlpha: 0, transformOrigin: '50% 50%' })
      gsap.set('[data-logo-loader-copy]', { clipPath: 'inset(0 100% 0 0)', autoAlpha: 0 })
      gsap.set('[data-logo-dot]', { scale: 0, autoAlpha: 0, transformOrigin: '50% 50%' })
      gsap.set('[data-login-form]', { autoAlpha: 0 })
      gsap.set('[data-login-title]', { clipPath: 'inset(0 100% 0 0)', autoAlpha: 0 })
      gsap.set('[data-login-label]', { x: 14, autoAlpha: 0 })
      gsap.set('[data-login-input]', { scaleX: 0, transformOrigin: 'left center' })
      gsap.set('[data-login-error]', { y: 7, autoAlpha: 0 })
      gsap.set('[data-login-button]', { scaleX: 0, autoAlpha: 0, transformOrigin: 'left center' })
      if (reduced) {
        gsap.set(root, { background: RHINE_CLONE.colors.paper })
        gsap.set('[data-warning]', { autoAlpha: 0 })
        gsap.set('[data-login], [data-intro-logo], [data-logo-loader-copy], [data-login-form], [data-login-title], [data-login-label], [data-login-input], [data-login-error], [data-login-button], [data-entrance-brand], [data-entrance-footer]', { x: 0, y: 0, scale: 1, clipPath: 'inset(0 0% 0 0)', autoAlpha: 1 })
        root.querySelectorAll('[data-intro-logo] [data-logo-outline], [data-intro-logo] [data-logo-glyphs]').forEach((path) => gsap.set(path, { strokeDashoffset: 0 }))
        onPrepare()
        root.dataset.entrancePhase = 'login-ready'
        setCanLogin(true)
        return
      }
      const intro = gsap.timeline({ defaults: { ease: 'power2.inOut' } })
        .addLabel('warning', 0)
        .call(() => { root.dataset.entrancePhase = 'warning' }, null, 'warning')
        .fromTo('[data-warning-panel]', { xPercent: -185, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: .48, ease: 'power4.out' }, 'warning')
        .fromTo('[data-warning-title]', { clipPath: 'inset(0 100% 0 0)', x: 10, autoAlpha: 0 }, { clipPath: 'inset(0 0% 0 0)', x: 0, autoAlpha: 1, duration: .6, ease: 'power3.out' }, 'warning+=.10')
        .fromTo('[data-warning-symbol]', { scale: .72, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .36, ease: 'power2.out' }, 'warning+=.56')
        .fromTo('[data-warning-row]', { x: 12, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .3, stagger: .28, ease: 'power2.out' }, 'warning+=.82')
        .to('[data-warning]', { autoAlpha: 0, duration: .28, ease: 'power2.in' }, 2.55)
        .fromTo('[data-entrance-flash]', { scaleX: 0, scaleY: 1, autoAlpha: 0 }, { scaleX: 1, autoAlpha: 1, duration: .2, transformOrigin: 'center center', ease: 'power4.out' }, 2.72)
        .to('[data-entrance-flash]', { scaleX: 5.8, autoAlpha: 0, duration: .28, ease: 'power3.in' }, 2.92)
        .fromTo('[data-paper-wash]', { autoAlpha: 0 }, { autoAlpha: 1, duration: .62, ease: 'sine.inOut' }, 3.16)
        .set(root, { background: RHINE_CLONE.colors.paper }, 3.62)
        .set('[data-paper-wash], [data-entrance-flash]', { autoAlpha: 0 }, 3.78)
        .set('[data-login]', { autoAlpha: 1 }, 3.80)
        .call(() => { root.dataset.entrancePhase = 'logo-assembly' }, null, 3.80)
        .to('[data-intro-logo]', { autoAlpha: 1, duration: .01 }, 3.84)
        .fromTo('[data-logo-dot]', { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: .55, duration: .28, stagger: .12, ease: 'back.out(1.8)' }, 3.88)
        .to('[data-intro-logo] [data-logo-outline]', { strokeDashoffset: 0, duration: 1.0, ease: 'power2.inOut' }, 4.18)
        .to('[data-intro-logo] [data-logo-glyphs]', { strokeDashoffset: 0, duration: .48, ease: 'power2.out' }, 4.94)
        .to('[data-logo-dot]', { y: -3, autoAlpha: 0, duration: .24, stagger: .06, ease: 'power2.in' }, 5.04)
        .to('[data-logo-loader-copy]', { clipPath: 'inset(0 0% 0 0)', autoAlpha: 1, duration: .54, ease: 'power2.out' }, 5.14)
        .to('[data-intro-logo]', { x: 0, scale: 1, duration: .9, ease: 'power3.inOut' }, 5.58)
        .to('[data-entrance-brand], [data-entrance-footer]', { autoAlpha: 1, duration: .55, ease: 'power2.out' }, 5.94)
        .set('[data-login-form]', { autoAlpha: 1 }, 6.08)
        .call(() => { root.dataset.entrancePhase = 'login-reveal' }, null, 6.08)
        .to('[data-login-title]', { clipPath: 'inset(0 0% 0 0)', autoAlpha: 1, duration: .55, ease: 'power2.inOut' }, 6.14)
        .to('[data-login-label]', { x: 0, autoAlpha: 1, duration: .42, stagger: .22, ease: 'power2.out' }, 6.42)
        .to('[data-login-input]', { scaleX: 1, duration: .52, stagger: .22, ease: 'power3.inOut' }, 6.52)
        .to('[data-login-error]', { y: 0, autoAlpha: 1, duration: .28 }, 6.96)
        .to('[data-login-button]', { scaleX: 1, autoAlpha: 1, duration: .52, ease: 'power4.out' }, 7.02)
        .call(onPrepare, null, 7.72)
        .call(() => {
          setCanLogin(true)
          const loginButton = root.querySelector('[data-login-button]')
          if (loginButton) loginButton.disabled = false
          root.dataset.entrancePhase = 'login-ready'
        }, null, 7.76)
      intro.eventCallback('onComplete', () => gsap.set('[data-intro-logo], [data-login-form]', { clearProps: 'willChange' }))
    }, root)
    return () => context.revert()
  }, [onPrepare])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !authorizing) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onPrepare()
      onComplete()
      return undefined
    }
    const context = gsap.context(() => {
      root.dataset.entrancePhase = 'authorizing'
      gsap.set('[data-login-phases]', { autoAlpha: 0 })
      gsap.set('[data-login-phases] .rhine-phases-canvas', { scale: AUTHORIZATION_CANVAS_SCALE, autoAlpha: 0, transformOrigin: 'center center' })
      gsap.set('[data-phases-meta]', { y: 10, autoAlpha: 0 })
      gsap.set('[data-phases-title]', { clipPath: 'inset(0 100% 0 0)', y: 7, autoAlpha: 0 })
      gsap.set('[data-phases-rule]', { scaleX: 0, autoAlpha: 0, transformOrigin: 'left center' })
      const authorize = gsap.timeline({ defaults: { ease: 'power3.inOut' } })
        .addLabel('depart', 0)
        .to('[data-login-form]', { x: -52, scale: .94, autoAlpha: 0, duration: .56, ease: 'power3.inOut' }, 'depart')
        .to('[data-intro-logo]', { x: 52, scale: .88, autoAlpha: 0, duration: .56, ease: 'power3.inOut' }, 'depart')
        .to('[data-entrance-brand], [data-entrance-footer]', { autoAlpha: 0, duration: .34, ease: 'sine.inOut' }, 'depart+=.24')
        .to('[data-login]', { autoAlpha: 0, duration: .12, ease: 'sine.inOut' }, 'depart+=.48')
        .set('[data-login-phases]', { autoAlpha: 1 }, 'depart+=.48')
        .call(() => { root.dataset.entrancePhase = 'lunar-phases' }, null, 'depart+=.50')
        .to('[data-login-phases] .rhine-phases-canvas', { scale: 1, autoAlpha: 1, duration: 1.08, ease: 'power3.out' }, 'depart+=.50')
        .to('[data-phases-rule]', { scaleX: 1, autoAlpha: 1, duration: .56, ease: 'power3.out' }, 'depart+=1.08')
        .to('[data-phases-meta]', { y: 0, autoAlpha: 1, duration: .42, ease: 'power2.out' }, 'depart+=1.18')
        .to('[data-phases-title]', { clipPath: 'inset(0 0% 0 0)', y: 0, autoAlpha: 1, duration: .68, ease: 'power3.inOut' }, 'depart+=1.28')
        .call(() => { root.dataset.entrancePhase = 'permission-authorized' }, null, 'depart+=1.72')
        .call(onPrepare, null, 'depart+=2.30')
        .to('[data-phases-meta], [data-phases-title], [data-phases-rule]', { y: -12, autoAlpha: 0, duration: .42, stagger: .04, ease: 'power2.in' }, 'depart+=2.72')
        .to('[data-login-phases] .rhine-phases-canvas', { scale: 1.055, autoAlpha: 0, duration: .82, ease: 'power3.in' }, 'depart+=2.82')
        .to('[data-login-phases]', { autoAlpha: 0, duration: .14, ease: 'sine.inOut' }, 'depart+=3.58')
        .call(() => { root.dataset.entrancePhase = 'complete'; onComplete() }, null, 'depart+=3.74')
    }, root)
    return () => context.revert()
  }, [authorizing, onComplete, onPrepare])

  return <div className="rhine-entrance" ref={rootRef} data-entrance-phase="warning">
    <div className="rhine-warning" data-warning>
      <i className="rhine-warning-point" data-warning-point />
      <div className="rhine-warning-panel" data-warning-panel><span className="rhine-warning-symbol" data-warning-symbol><i>!</i></span><span data-warning-line /><strong data-warning-title>WARNING</strong><span data-warning-line /></div>
      <div className="rhine-warning-copy" data-warning-copy>
        <span data-warning-row><small>VEIKO ARCHIVE</small><i /></span>
        <span data-warning-row><small>ACCESS CODE REQUIRED</small><i /></span>
        <span data-warning-row><small>PROCEED TO ENTRY</small><i /></span>
      </div>
    </div>
    <i className="rhine-entrance-flash" data-entrance-flash />
    <i className="rhine-paper-wash" data-paper-wash />
    <div data-entrance-brand><FixedBrand /></div><div data-entrance-footer><FixedFooter /></div>
    <div className="rhine-login" data-login>
      <div className="rhine-login-logo" data-intro-logo><InfinityLogo /><span data-logo-loader-copy>R H I N E - L A B</span><i className="rhine-logo-dots" aria-hidden="true"><b data-logo-dot /><b data-logo-dot /><b data-logo-dot /></i></div>
      <form className={`rhine-login-form ${loginError ? 'has-error' : ''}`} data-login-form onSubmit={handleLogin} onInput={() => { if (loginError) setLoginError('') }}>
        <h1 data-login-title>WELCOME</h1>
        <label data-login-label><span>访问码：</span><input data-login-input name="rhine-access-code" type="password" inputMode="numeric" autoComplete="off" maxLength={4} aria-describedby="rhine-access-error" aria-invalid={Boolean(loginError)} required /></label>
        <p id="rhine-access-error" className="rhine-login-error" data-login-error role="alert" aria-live="polite">{loginError || '\u00a0'}</p>
        <button data-login-button type="submit" disabled={!canLogin || authorizing}>进入</button>
      </form>
    </div>
    <div className="rhine-login-phases" data-login-phases>
      <PhasesCanvas active={authorizing} resolutionScale={AUTHORIZATION_CANVAS_SCALE} />
      <div className="rhine-phases-copy">
        <small data-phases-meta>LUNAR ACCESS / PHASE SEQUENCE 01</small>
        <strong data-phases-title>LUNAR MISSION AUTHORIZED</strong>
        <i data-phases-rule />
      </div>
    </div>
    <div className="rhine-access" data-access>
      <div className="rhine-access-typing"><span data-access-copy>SCANNING LUNAR ACCESS KEY</span><span className="rhine-access-corners" aria-hidden="true"><i data-access-corner /><i data-access-corner /><i data-access-corner /><i data-access-corner /></span></div>
      <i className="rhine-access-seed" data-access-seed />
      <svg className="rhine-auth-matrix" data-auth-matrix viewBox="0 0 680 420" aria-hidden="true">
        <g className="rhine-auth-frame">
          <path d="M54 124V58H142" pathLength="1" data-auth-line data-auth-bracket />
          <path d="M538 58H626V124" pathLength="1" data-auth-line data-auth-bracket />
          <path d="M626 296V362H538" pathLength="1" data-auth-line data-auth-bracket />
          <path d="M142 362H54V296" pathLength="1" data-auth-line data-auth-bracket />
        </g>
        <g className="rhine-auth-rails">
          <path d="M54 210H270M410 210H626" pathLength="1" data-auth-line data-auth-rail />
          <path d="M340 58V145M340 275V362" pathLength="1" data-auth-line data-auth-rail />
          <path d="M120 128H236V92M560 292H444V328" pathLength="1" data-auth-line data-auth-rail />
          <path d="M120 292H236V328M560 128H444V92" pathLength="1" data-auth-line data-auth-rail />
          <path d="M278 148L244 182M402 148L436 182M278 272L244 238M402 272L436 238" pathLength="1" data-auth-line data-auth-rail />
        </g>
        <g className="rhine-auth-ticks">
          <rect x="86" y="195" width="3" height="30" data-auth-tick /><rect x="102" y="200" width="3" height="20" data-auth-tick />
          <rect x="118" y="195" width="3" height="30" data-auth-tick /><rect x="134" y="200" width="3" height="20" data-auth-tick />
          <rect x="150" y="195" width="3" height="30" data-auth-tick /><rect x="166" y="200" width="3" height="20" data-auth-tick />
          <rect x="514" y="195" width="3" height="30" data-auth-tick /><rect x="530" y="200" width="3" height="20" data-auth-tick />
          <rect x="546" y="195" width="3" height="30" data-auth-tick /><rect x="562" y="200" width="3" height="20" data-auth-tick />
          <rect x="578" y="195" width="3" height="30" data-auth-tick /><rect x="594" y="200" width="3" height="20" data-auth-tick />
        </g>
        <rect className="rhine-auth-scan" x="44" y="202" width="126" height="16" data-auth-scan />
        <g className="rhine-auth-nodes">
          <rect x="50" y="206" width="8" height="8" data-auth-node /><rect x="622" y="206" width="8" height="8" data-auth-node />
          <rect x="336" y="54" width="8" height="8" data-auth-node /><rect x="336" y="358" width="8" height="8" data-auth-node />
          <rect x="232" y="124" width="8" height="8" data-auth-node /><rect x="440" y="288" width="8" height="8" data-auth-node />
          <rect x="440" y="124" width="8" height="8" data-auth-node /><rect x="232" y="288" width="8" height="8" data-auth-node />
        </g>
        <g className="rhine-auth-lock" data-auth-lock>
          <path d="M340 166L384 210L340 254L296 210Z" />
          <path className="rhine-auth-lock-cut" d="M340 184L366 210L340 236L314 210Z" />
          <path className="rhine-auth-lock-core" d="M340 198L352 210L340 222L328 210Z" data-auth-lock-core />
        </g>
      </svg>
      <small className="rhine-auth-kicker" data-auth-kicker>THE PLAN OF THE MONTH / LUNAR GATE 01</small>
      <strong className="rhine-auth-text" data-auth-text>LUNAR MISSION AUTHORIZED</strong>
    </div>
    <div className="rhine-welcome" data-welcome>
      <strong>WELCOME TO</strong>
      <b><span data-welcome-name>{RHINE_CLONE.home.title}</span><em data-welcome-accent>{RHINE_CLONE.home.accent}</em></b>
      <InfinityLogo compact />
      <i className="rhine-welcome-rail" data-welcome-rail />
    </div>
  </div>
}

function HomeSystem() {
  return <div className="rhine-home-system" aria-hidden="true">
    <svg viewBox="0 -110 600 1220" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="rhine-black-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#000" /><stop offset=".72" stopColor="#000" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
        <linearGradient id="rhine-tile-white" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset=".58" stopColor="#f8f8f5" /><stop offset="1" stopColor="#a5a5a3" /></linearGradient>
        <linearGradient id="rhine-tile-dark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a4a49" /><stop offset="1" stopColor="#090a09" /></linearGradient>
      </defs>
      <circle className="rhine-home-black" cx="300" cy="515" r="244" fill="url(#rhine-black-glow)" />
      <g className="rhine-home-diamonds" data-home-diamonds>
        <rect className="is-white" x="109" y="445" width="75" height="75" transform="rotate(45 146.5 482.5)" />
        <rect className="is-white" x="163" y="499" width="75" height="75" transform="rotate(45 200.5 536.5)" />
        <rect className="is-dark" x="217" y="445" width="75" height="75" transform="rotate(45 254.5 482.5)" />
        <rect className="is-dark" x="217" y="553" width="75" height="75" transform="rotate(45 254.5 590.5)" />
        <rect className="is-dark" x="337" y="433" width="75" height="75" transform="rotate(45 374.5 470.5)" />
        <rect className="is-dark" x="391" y="487" width="75" height="75" transform="rotate(45 428.5 524.5)" />
        <rect className="is-white" x="391" y="595" width="75" height="75" transform="rotate(45 428.5 632.5)" />
        <rect className="is-white" x="445" y="541" width="75" height="75" transform="rotate(45 482.5 578.5)" />
        <rect className="is-white is-lower" x="255" y="669" width="67" height="67" transform="rotate(45 288.5 702.5)" />
      </g>
      <g className="rhine-home-white" data-home-white>
        <path d="M242-110V362l-23 30v718" /><path d="M257-110V401l-19 22v687" /><path d="M274-110V440l-17 18v652" />
        <path d="M468-110v1220" />
      </g>
      <g className="rhine-home-orange" data-home-orange>
        <path d="M300-110v1220" data-home-guide /><path d="M300 515 0 0" /><path d="M300 515c10-73 200-118 200-250V-110" />
      </g>
      <g className="rhine-home-nodes" data-home-nodes>
        <circle className="is-core" cx="300" cy="515" r="15" /><circle className="is-core-center" cx="300" cy="515" r="6" />
        <circle cx="242" cy="166" r="5" /><circle cx="257" cy="166" r="5" /><circle cx="274" cy="166" r="5" /><circle cx="300" cy="166" r="5" /><circle cx="500" cy="166" r="5" />
        <circle cx="219" cy="515" r="5" /><circle cx="238" cy="515" r="5" /><circle cx="257" cy="515" r="5" /><circle cx="274" cy="515" r="5" /><circle cx="468" cy="515" r="5" />
        <circle cx="219" cy="905" r="5" /><circle cx="238" cy="905" r="5" /><circle cx="257" cy="905" r="5" /><circle cx="274" cy="905" r="5" /><circle cx="468" cy="905" r="5" />
      </g>
      <g className="rhine-home-microcopy"><text x="287" y="541">M</text><text x="220" y="890">A</text><text x="238" y="890">B</text><text x="256" y="890">C</text></g>
      <text className="rhine-home-label" x="330" y="532">Tomorrow.</text>
    </svg>
  </div>
}

function HeadquartersGallery({ base, active }) {
  const scenes = RHINE_CLONE.scenes.headquarters
  const [current, setCurrent] = useState(1)
  const [activePreview, setActivePreview] = useState(null)
  const galleryRef = useRef(null)

  useEffect(() => {
    if (!active) return undefined
    const timer = window.setInterval(() => setCurrent((index) => (index + 1) % scenes.length), 14000)
    return () => window.clearInterval(timer)
  }, [active, scenes.length])

  useEffect(() => {
    const videos = galleryRef.current?.querySelectorAll('video') ?? []
    videos.forEach((video) => {
      const isPrimary = Boolean(video.closest('.rhine-headquarters-primary'))
      const isCurrentPrimary = isPrimary && Number(video.dataset.sceneIndex) === current
      if (active && isCurrentPrimary) video.play().catch(() => {})
      else video.pause()
    })
  }, [active, current])

  const setPreviewPlayback = useCallback((event, shouldPlay) => {
    const video = event.currentTarget.querySelector('video')
    if (!video) return
    if (active && shouldPlay) {
      if (video.readyState === 0) video.load()
      video.play().catch(() => {})
    } else video.pause()
  }, [active])

  const sceneAt = (offset) => scenes[(current + offset) % scenes.length]
  const primary = sceneAt(0)

  const sceneVisual = (scene, { isActive = true, preview = false, sceneIndex } = {}) => {
    const key = scene.video || scene.visual || scene.code
    if (scene.visual === 'fractal-tunnel') {
      return <FractalTunnelCanvas
        active={active && isActive}
        className={preview ? '' : `rhine-headquarters-media ${isActive ? 'is-active' : ''}`}
        fallback={rhineAsset(base, scene.poster)}
        label={scene.label}
        preview={preview}
        key={`${key}-${preview ? 'preview' : 'primary'}`}
      />
    }
    if (scene.visual === 'chromatic-tunnel') {
      return <ChromaticTunnelCanvas
        active={active && isActive}
        className={preview ? '' : `rhine-headquarters-media ${isActive ? 'is-active' : ''}`}
        fallback={rhineAsset(base, scene.poster)}
        label={scene.label}
        quality={preview ? 'low' : 'auto'}
        key={`${key}-${preview ? 'preview' : 'primary'}`}
      />
    }
    if (scene.visual === 'weave') {
      return <WeaveCanvas
        active={active && isActive}
        className={preview ? '' : `rhine-headquarters-media ${isActive ? 'is-active' : ''}`}
        fallback={rhineAsset(base, scene.poster)}
        label={scene.label}
        preview={preview}
        quality={preview ? 'low' : 'auto'}
        key={`${key}-${preview ? 'preview' : 'primary'}`}
      />
    }
    return <video
      className={preview ? '' : `rhine-headquarters-media ${isActive ? 'is-active' : ''}`}
      data-scene-index={sceneIndex}
      src={rhineAsset(base, scene.video)}
      poster={preview ? rhineAsset(base, scene.poster) : undefined}
      aria-label={preview ? undefined : scene.label}
      aria-hidden={preview || !isActive}
      muted
      loop
      playsInline
      preload={preview ? 'none' : active ? 'auto' : 'metadata'}
      key={`${key}-${preview ? 'preview' : 'primary'}`}
    />
  }

  return <div className="rhine-headquarters-gallery" data-headquarters-gallery ref={galleryRef}>
    <figure className="rhine-headquarters-primary">
      {sceneVisual(primary, { isActive: true, sceneIndex: current })}
      <figcaption><b>{primary.code}</b><span>{primary.label}<small>SECURE ENVIRONMENT / LIVE OPTICAL FEED</small></span></figcaption>
    </figure>
    <div className="rhine-headquarters-side">
      {[1, 2].map((offset) => {
        const scene = sceneAt(offset)
        const previewKey = scene.video || scene.visual || scene.code
        const activatePreview = (event) => {
          setActivePreview(previewKey)
          setPreviewPlayback(event, true)
        }
        const deactivatePreview = (event) => {
          setActivePreview((currentPreview) => currentPreview === previewKey ? null : currentPreview)
          setPreviewPlayback(event, false)
        }
        return <button type="button" onClick={() => setCurrent((current + offset) % scenes.length)} onPointerEnter={activatePreview} onPointerLeave={deactivatePreview} onFocus={activatePreview} onBlur={deactivatePreview} aria-label={`Open ${scene.label}`} key={previewKey}>
          {sceneVisual(scene, { isActive: activePreview === previewKey, preview: true })}
          <span><b>{scene.code}</b>{scene.label}</span>
        </button>
      })}
    </div>
    <div className="rhine-headquarters-index" aria-hidden="true"><span>HEADQUARTERS</span><b>BIOSAFETY LEVEL 4</b><i /></div>
    <div className="rhine-headquarters-status" aria-hidden="true"><span>{scenes.map((_, index) => <i className={index === current ? 'is-active' : ''} key={index} />)}</span><InfinityLogo compact /><b>ALL SYSTEMS NOMINAL</b></div>
  </div>
}

function DepartmentMark({ code }) {
  const lines = code.split('\n')
  return <strong>{lines.map((line) => <span key={line}>{line}</span>)}</strong>
}

const MemberCardBody = memo(function MemberCardBody({ base, member }) {
  const imageWidth = 142 * member.scale
  const imageHeight = 97 * member.scale
  const imageLeft = -21 + (member.x / 100 * 142) + ((1 - member.scale) * 71)
  const imageTop = 3 + ((member.y - 5) / 100 * 97) + ((1 - member.scale) * 53.35)
  return <>
    <div className="rhine-member-code"><DepartmentMark code={member.code} /><small>{member.section}</small></div>
    <span className="rhine-member-section">{member.section}<br />DIRECTOR PROFILE / RHINE LAB</span>
    <img src={rhineAsset(base, member.image)} alt={member.name} style={{ '--member-image-left': `${imageLeft}%`, '--member-image-top': `${imageTop}%`, '--member-image-width': `${imageWidth}%`, '--member-image-height': `${imageHeight}%` }} loading="eager" decoding="async" />
    <span className="rhine-member-profile">莱茵生命<br />科研主任<br />内部资料</span>
    <span className="rhine-member-name"><b>{member.name}</b><small>{member.role}</small></span>
    <span className="rhine-member-logos"><InfinityLogo compact /><i /></span>
  </>
})

const MEMBER_SLOT_X = { '-2': -42.6, '-1': -21.3, '0': 0, '1': 21.3, '2': 42.6 }

function MemberCarousel({ base, selected, onSelect, moving, onMoveEnd }) {
  const length = RHINE_MEMBERS.length
  const preloadRef = useRef([])
  const move = (direction) => onSelect((selected + direction + length) % length)

  useEffect(() => {
    let disposed = false
    let idleHandle = 0
    let timeoutHandle = 0
    let cursor = 0
    const images = []
    const orderedMembers = RHINE_MEMBERS
      .map((member, index) => {
        const directDistance = Math.abs(index - selected)
        return { member, distance: Math.min(directDistance, length - directDistance) }
      })
      .sort((a, b) => a.distance - b.distance)

    const schedule = () => {
      if (disposed || cursor >= orderedMembers.length) return
      if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(runBatch, { timeout: 2400 })
      } else {
        timeoutHandle = window.setTimeout(() => runBatch(null), 320)
      }
    }

    const runBatch = (deadline) => {
      idleHandle = 0
      timeoutHandle = 0
      let processed = 0
      while (cursor < orderedMembers.length && processed < 2) {
        if (processed > 0 && deadline && !deadline.didTimeout && deadline.timeRemaining() < 6) break
        const { member } = orderedMembers[cursor]
        const image = new Image()
        image.decoding = 'async'
        image.src = rhineAsset(base, member.image)
        image.decode?.().catch(() => {})
        images.push(image)
        cursor += 1
        processed += 1
      }
      preloadRef.current = images
      schedule()
    }

    schedule()
    return () => {
      disposed = true
      if (idleHandle && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleHandle)
      if (timeoutHandle) window.clearTimeout(timeoutHandle)
      preloadRef.current = []
    }
  }, [base])

  useEffect(() => {
    if (!moving) return undefined
    const fallback = window.setTimeout(() => onMoveEnd(moving.target), 5000)
    return () => window.clearTimeout(fallback)
  }, [moving, onMoveEnd])

  return <div className={`rhine-member-stage ${moving ? 'is-switching' : ''}`} data-member-stage tabIndex="0" aria-label="Member carousel" onKeyDown={(event) => { if (event.key === 'ArrowLeft') move(-1); if (event.key === 'ArrowRight') move(1) }}>
    <div className={`rhine-member-track ${moving ? `is-sliding-${moving.direction}` : ''}`} style={{ '--member-track-shift': moving ? `${moving.shift}vw` : '0vw' }} onAnimationEnd={(event) => { if (event.target === event.currentTarget && moving) onMoveEnd(moving.target) }}>
      {RHINE_MEMBERS.map((member, index) => {
        let slot = index - selected
        if (slot > length / 2) slot -= length
        if (slot < -length / 2) slot += length
        const distance = Math.abs(slot)
        if (distance > 2) return null
        const outgoing = Boolean(moving && slot === 0)
        const incoming = moving?.target === index
        const foldClass = outgoing ? `is-folding-${moving.direction}` : ''
        let sideMotionClass = ''
        if (moving?.steps === 1 && !outgoing && !incoming) {
          const nextSlot = slot + (moving.direction === 'left' ? -1 : 1)
          if (Math.abs(slot) === 2 && Math.abs(nextSlot) === 3) sideMotionClass = 'is-edge-exiting'
          else if (distance <= 2 && Math.abs(nextSlot) <= 2 && Math.abs(nextSlot) > Math.abs(slot)) sideMotionClass = 'is-side-receding'
          else if (distance <= 2 && Math.abs(nextSlot) <= 2 && Math.abs(nextSlot) < Math.abs(slot)) sideMotionClass = 'is-side-approaching'
        }
        const zIndex = incoming ? 32 : slot === 0 ? 30 : distance === 1 ? 18 : distance === 2 ? 8 : 0
        return <button className={`rhine-member-card ${slot === 0 ? 'is-current' : ''} ${outgoing ? 'is-outgoing' : ''} ${incoming ? 'is-incoming' : ''} ${foldClass} ${sideMotionClass}`} data-member-index={index} data-member-name={member.name} data-member-slot={slot} type="button" style={{ zIndex }} onClick={() => { if (slot !== 0) move(Math.sign(slot)) }} aria-pressed={slot === 0} key={member.name}>
          <MemberCardBody base={base} member={member} />
        </button>
      })}
    </div>
    <span className="rhine-member-stage-holo" aria-hidden="true" />
    <span className="rhine-member-stage-scan" aria-hidden="true" />
    <span className="rhine-member-stage-glint" aria-hidden="true" />
    <button className="rhine-carousel-control is-left" type="button" onClick={() => move(-1)} aria-label="Previous member"><i /></button>
    <button className="rhine-carousel-control is-right" type="button" onClick={() => move(1)} aria-label="Next member"><i /></button>
  </div>
}

const DEPARTMENT_LAYOUT = [
  { left: '13.1%', top: '17.2%', '--tile-angle': '0deg' }, { left: '13.1%', top: '41%', '--tile-angle': '0deg' }, { left: '13.1%', top: '64%', '--tile-angle': '0deg' },
  { left: '26.5%', top: '29.1%', '--tile-angle': '0deg' }, { left: '26.5%', top: '56.2%', '--tile-angle': '0deg' },
  { left: '65.8%', top: '28.4%', '--tile-angle': '0deg' }, { left: '66.1%', top: '52.8%', '--tile-angle': '0deg' },
  { left: '80.1%', top: '17.2%', '--tile-angle': '0deg' }, { left: '80.1%', top: '41%', '--tile-angle': '0deg' }, { left: '80.1%', top: '64%', '--tile-angle': '0deg' },
]

function DepartmentMatrix({ base, selected, onSelect }) {
  const stageRef = useRef(null)
  const pointerFrameRef = useRef(0)
  const pointerRef = useRef({ x: 0, y: 0 })
  const current = selected == null ? null : RHINE_DEPARTMENTS[selected]

  const applyPointerTrack = useCallback((x, y) => {
    const stage = stageRef.current
    if (!stage) return
    stage.style.setProperty('--department-track-x', `${(x * 28).toFixed(2)}px`)
    stage.style.setProperty('--department-track-y', `${(y * 18).toFixed(2)}px`)
    stage.style.setProperty('--department-track-r', `${(x * 1.15).toFixed(2)}deg`)
    stage.style.setProperty('--department-line-x', `${(x * 18).toFixed(2)}px`)
    stage.style.setProperty('--department-line-y', `${(y * 12).toFixed(2)}px`)
    stage.style.setProperty('--department-tile-x', `${(x * 9).toFixed(2)}px`)
    stage.style.setProperty('--department-tile-y', `${(y * 6).toFixed(2)}px`)
    stage.style.setProperty('--department-tile-r', '0deg')
    stage.style.setProperty('--department-signature-x', `${(x * 14).toFixed(2)}px`)
    stage.style.setProperty('--department-signature-y', `${(y * 9).toFixed(2)}px`)
  }, [])

  const trackPointer = useCallback((event) => {
    if (event.pointerType === 'touch') return
    const bounds = event.currentTarget.getBoundingClientRect()
    pointerRef.current.x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1))
    pointerRef.current.y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1))
    if (pointerFrameRef.current) return
    pointerFrameRef.current = window.requestAnimationFrame(() => {
      pointerFrameRef.current = 0
      applyPointerTrack(pointerRef.current.x, pointerRef.current.y)
    })
  }, [applyPointerTrack])

  const resetPointerTrack = useCallback(() => {
    pointerRef.current = { x: 0, y: 0 }
    if (pointerFrameRef.current) window.cancelAnimationFrame(pointerFrameRef.current)
    pointerFrameRef.current = 0
    applyPointerTrack(0, 0)
  }, [applyPointerTrack])

  useEffect(() => () => {
    if (pointerFrameRef.current) window.cancelAnimationFrame(pointerFrameRef.current)
  }, [])

  return <div className={`rhine-department-stage ${current ? 'has-selection' : 'is-idle'}`} data-department-stage ref={stageRef} onPointerMove={trackPointer} onPointerLeave={resetPointerTrack}>
    <div className="rhine-department-lines" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M42.9 33.2 28.7 4.2M58.7 33.2 72.9 4.2M42.9 66.8 28.7 95.8M58.7 66.8 72.9 95.8" /></svg>
      <i className="is-north-west" /><i className="is-north-east" /><i className="is-south-west" /><i className="is-south-east" />
      <span>{Array.from({ length: 6 }, (_, index) => <b key={index} />)}</span>
    </div>
    {current && <div className="rhine-department-heading"><strong>{current.title}</strong><span>{current.label}</span></div>}
    <div className="rhine-department-console" data-department-preview>
      <div className="rhine-department-tracker" data-department-tracker>
        <div className="rhine-department-placeholder" aria-label="Select a department"><i /><InfinityLogo /></div>
        <span className="rhine-department-corners" aria-hidden="true"><i /><i /><i /><i /></span>
        {current && <div className="rhine-department-media" key={current.preview}>
          <img src={rhineAsset(base, current.preview)} alt={`${current.label} interior`} loading="lazy" decoding="async" />
        </div>}
      </div>
    </div>
    <div className="rhine-department-tiles">
      {RHINE_DEPARTMENTS.map((department, index) => <button className={`rhine-department-tile ${selected === index ? 'is-selected' : ''}`} style={{ ...DEPARTMENT_LAYOUT[index], '--tile-order': index, '--tile-delay': `${index * -.47}s` }} type="button" onPointerEnter={() => onSelect(index)} onPointerLeave={() => onSelect(null)} onFocus={() => onSelect(index)} onBlur={() => onSelect(null)} onClick={() => onSelect(index)} aria-pressed={selected === index} key={department.code}>
        <span className="rhine-department-orbit" aria-hidden="true"><i /><i /><i /></span><span className="rhine-department-trace" aria-hidden="true" />
        <DepartmentMark code={department.code} /><small>{department.label}</small>
      </button>)}
    </div>
    <div className="rhine-department-signatures" aria-hidden="true">
      <span className="is-pioneer"><PioneerWaveLogo /><small>PIONEER PROJECT</small></span>
      <span className="is-rhine"><InfinityLogo compact /><small>RHINE LAB</small></span>
    </div>
  </div>
}

function BlackHoleSystem({ active, prepare }) {
  return <figure className="rhine-blackhole-visual" aria-label="Original Kerr-Newman black hole rendering">
    <WxdfzjBlackHoleCanvas className="rhine-blackhole-field" active={active} prepare={prepare} />
  </figure>
}

const RHINE_TIME_CODES = [
  'T−00:00:00',
  'T+00:00:37',
  'T+00:01:13',
  'T−00:00:21',
  'T+08:41:13',
  'T−03:12:44',
  'T+14:03:27',
  'T±00:00:01',
]

const createTimeDots = (layer) => Array.from({ length: 121 }, (_, index) => {
  const x = index % 11
  const y = Math.floor(index / 11)
  const visible = ((x - 5) ** 2) + ((y - 5) ** 2) <= 25
  return <i className={visible ? 'is-visible' : ''} style={{ '--grain-index': index }} key={`${layer}-${index}`} />
})

const RHINE_TIME_DOTS = {
  source: createTimeDots('source'),
  target: createTimeDots('target'),
}

function ResearchScene({ active, prepareBlackHole, onContinue }) {
  return <div className="rhine-research-scene">
    <BlackHoleSystem active={active} prepare={prepareBlackHole} />
    <div className="rhine-pioneer-mark" data-research-ui><span>{RHINE_RESEARCH.title}<small>{RHINE_RESEARCH.english}</small></span><MoonProjectLogo /></div>
    <div className="rhine-progress-system" data-research-ui><div className="rhine-time-meter" aria-label="Particle time transfer progress"><svg className="rhine-time-dial" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="53" /><path d="M60 2v8M60 110v8M2 60h8M110 60h8M18.3 18.3l5.7 5.7M96 96l5.7 5.7M101.7 18.3L96 24M24 96l-5.7 5.7" /><path className="is-sweep" d="M60 7a53 53 0 0 1 45.9 26.5" /></svg><span className="rhine-time-mass is-source" aria-hidden="true">{RHINE_TIME_DOTS.source}</span><span className="rhine-time-mass is-target" aria-hidden="true">{RHINE_TIME_DOTS.target}</span><span className="rhine-time-transfer" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <i style={{ '--transfer-index': index }} key={index} />)}</span><i className="rhine-time-core" aria-hidden="true" /></div><strong className="rhine-timecode" aria-label="Temporal anomaly clock">{RHINE_TIME_CODES.map((value, index) => <span data-time-frame={value} style={{ '--time-delay': `${index * .8}s` }} aria-hidden="true" key={value}><i>{value}</i></span>)}</strong></div>
    <div className="rhine-research-copy" data-research-ui><p>{RHINE_RESEARCH.copy.map((line) => <span key={line}>{line}</span>)}</p><button type="button" onClick={onContinue}>{RHINE_RESEARCH.button}<i /></button></div>
    <div className="rhine-research-readout" data-research-ui><b>R / 01 — 037</b><span>{RHINE_RESEARCH.readout.slice(1).map((line) => <small key={line}>{line}</small>)}</span><i /></div>
  </div>
}

export function RhineArchivePrototype() {
  const bypass = new URLSearchParams(window.location.search).get('rhineBypass') === '1'
  const initialHashView = window.location.hash.replace(/^#rhine-/, '')
  const initialView = RHINE_CLONE.sections.some((section) => section.id === initialHashView) ? initialHashView : 'home'
  const rootRef = useRef(null)
  const [entered, setEntered] = useState(bypass)
  const homeIntroRef = useRef(null)
  const [siteMounted, setSiteMounted] = useState(bypass)
  const [active, setActive] = useState(initialView)
  const [gliding, setGliding] = useState(false)
  const [memberIndex, setMemberIndex] = useState(1)
  const [memberMove, setMemberMove] = useState(null)
  const [departmentIndex, setDepartmentIndex] = useState(null)
  const base = basePath()
  const prepareSite = useCallback(() => setSiteMounted(true), [])
  const finishEntrance = useCallback(() => setEntered(true), [])
  const finishMemberMove = useCallback((target) => {
    setMemberIndex(target)
    setMemberMove((current) => current?.target === target ? null : current)
  }, [])
  const chooseMember = useCallback((nextIndex) => {
    if (memberMove || nextIndex === memberIndex) return
    const length = RHINE_MEMBERS.length
    let slot = nextIndex - memberIndex
    if (slot > length / 2) slot -= length
    if (slot < -length / 2) slot += length
    const limitedSlot = Math.max(-2, Math.min(2, slot))
    const mobileSlots = { '-2': -60, '-1': -30, '0': 0, '1': 30, '2': 60 }
    const slots = window.matchMedia('(max-width: 900px)').matches ? mobileSlots : MEMBER_SLOT_X
    const x = slots[String(limitedSlot)] ?? (limitedSlot * 21.3)
    setMemberMove({ target: nextIndex, direction: slot > 0 ? 'left' : 'right', shift: -x, steps: Math.abs(limitedSlot) })
  }, [memberMove, memberIndex])

  useLayoutEffect(() => {
    if (!entered || !siteMounted) return undefined
    const root = rootRef.current
    const scroller = root?.querySelector('[data-rhine-scroll]')
    if (!scroller) return undefined
    let frame = 0

    const syncHashView = () => {
      const hashView = window.location.hash.replace(/^#rhine-/, '')
      if (!RHINE_CLONE.sections.some((section) => section.id === hashView)) return
      const target = root.querySelector(`#rhine-${hashView}`)
      if (!target) return
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        scroller.scrollTop = target.offsetTop
        setActive(hashView)
        ScrollTrigger.update()
      })
    }

    syncHashView()
    window.addEventListener('hashchange', syncHashView)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('hashchange', syncHashView)
    }
  }, [entered, siteMounted])

  useEffect(() => {
    if (!entered) return undefined
    const root = rootRef.current
    const scroller = root?.querySelector('[data-rhine-scroll]')
    if (!scroller) return undefined
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible) setActive(visible.target.dataset.rhineView)
    }, { root: scroller, threshold: [.45, .6, .75] })
    root.querySelectorAll('[data-rhine-view]').forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [entered])

  useEffect(() => {
    if (!entered || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const scroller = rootRef.current?.querySelector('[data-rhine-scroll]')
    if (!scroller) return undefined
    const sections = [...scroller.querySelectorAll('[data-rhine-view]')]
    let scrollTween = null
    let previousScrollBehavior = ''
    let previousScrollSnapType = ''

    const finishGlide = () => {
      scroller.classList.remove('is-gliding')
      scroller.style.scrollBehavior = previousScrollBehavior
      scroller.style.scrollSnapType = previousScrollSnapType
      scrollTween = null
      setGliding(false)
    }

    const onWheel = (event) => {
      if (event.ctrlKey || Math.abs(event.deltaY) < 4) return
      event.preventDefault()
      if (scrollTween?.isActive()) return

      const currentTop = scroller.scrollTop
      const currentIndex = sections.reduce((nearest, section, index) => (
        Math.abs(section.offsetTop - currentTop) < Math.abs(sections[nearest].offsetTop - currentTop) ? index : nearest
      ), 0)
      const targetIndex = Math.max(0, Math.min(sections.length - 1, currentIndex + Math.sign(event.deltaY)))
      const targetTop = sections[targetIndex]?.offsetTop ?? currentTop
      if (Math.abs(targetTop - currentTop) < 1) return

      previousScrollBehavior = scroller.style.scrollBehavior
      previousScrollSnapType = scroller.style.scrollSnapType
      setGliding(true)
      scroller.classList.add('is-gliding')
      scroller.style.scrollBehavior = 'auto'
      scroller.style.scrollSnapType = 'none'
      scrollTween = gsap.to(scroller, {
        scrollTop: targetTop,
        duration: 1.18,
        ease: 'power3.inOut',
        overwrite: 'auto',
        onComplete: () => {
          ScrollTrigger.update()
          finishGlide()
        },
      })
    }

    scroller.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      scroller.removeEventListener('wheel', onWheel)
      scrollTween?.kill()
      finishGlide()
    }
  }, [entered])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !siteMounted || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const scroller = root.querySelector('[data-rhine-scroll]')
    const context = gsap.context(() => {
      // Prepare geometry before authorization ends; preserve the original
      // homepage start time by keeping its entrance timeline paused.
      homeIntroRef.current = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
        .addLabel('home-enter', 0)
        .fromTo('[data-main-chrome]', { autoAlpha: 0 }, { autoAlpha: 1, duration: .42, stagger: .045 }, 'home-enter')
        .fromTo('.rhine-home-copy', { x: -34, autoAlpha: 0, transformOrigin: 'left center' }, { x: 0, autoAlpha: 1, duration: .74, ease: 'power3.out' }, 'home-enter+=.08')
        .fromTo('.rhine-home-copy > :not(h1)', { x: -12, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .42, stagger: .07, ease: 'power2.out' }, 'home-enter+=.40')
        .fromTo('.rhine-home-system', { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .54, ease: 'power3.out' }, 'home-enter+=.18')
        .fromTo('.rhine-home-black', { scale: .82, autoAlpha: 0, transformOrigin: 'center' }, { scale: 1, autoAlpha: 1, duration: .82, ease: 'power3.out' }, 'home-enter+=.28')
        .fromTo('[data-home-orange] path, [data-home-white] path', { strokeDasharray: 1180, strokeDashoffset: 1180 }, { strokeDashoffset: 0, duration: 1.18, stagger: .045, ease: 'power2.inOut' }, 'home-enter+=.34')
        .fromTo('[data-home-diamonds] rect, [data-home-nodes] circle', { scale: .72, autoAlpha: 0, transformOrigin: 'center' }, { scale: 1, autoAlpha: 1, duration: .42, stagger: .035, ease: 'power3.out' }, 'home-enter+=.78')

      gsap.timeline({
        scrollTrigger: { trigger: '#rhine-home', scroller, start: 'top top', end: 'bottom top', scrub: .26 },
        defaults: { ease: 'none' },
      })
        .to('.rhine-home-copy', { x: -40, autoAlpha: 0, duration: .52 }, 0)
        .to('.rhine-home-black, [data-home-diamonds], [data-home-white], [data-home-orange] path:not([data-home-guide]), [data-home-nodes], .rhine-home-microcopy, .rhine-home-label', { autoAlpha: 0, duration: .55 }, 0)
        .to('[data-home-guide]', { y: '122vh', autoAlpha: 1, duration: .78 }, 0)
        .to('[data-home-guide]', { y: '150vh', autoAlpha: 0, duration: .22 }, .78)

      gsap.fromTo('#rhine-headquarters [data-headquarters-gallery]', { y: '3.5vh', scale: .975, autoAlpha: .55 }, { y: 0, scale: 1, autoAlpha: 1, ease: 'none', scrollTrigger: { trigger: '#rhine-headquarters', scroller, start: 'top bottom', end: 'top 8%', scrub: .85 } })

      gsap.timeline({
        scrollTrigger: { trigger: '#rhine-headquarters', scroller, start: 'top top', end: 'bottom top', scrub: .38 },
        defaults: { ease: 'none' },
      })
        .to('.rhine-headquarters-primary', { x: '-9vw', y: '-4vh', rotation: -.65, scale: .94, autoAlpha: 0, duration: .7 }, 0)
        .to('.rhine-headquarters-side button', { x: (index) => `${6 + index * 2.5}vw`, y: (index) => index ? '-6vh' : '5vh', rotation: (index) => index ? 1.4 : -1.1, scale: .94, autoAlpha: 0, duration: .64, stagger: .055 }, .035)
        .to('.rhine-headquarters-index', { x: -24, y: -18, autoAlpha: 0, duration: .38 }, 0)
        .to('.rhine-headquarters-status', { x: 28, y: 20, autoAlpha: 0, duration: .4 }, .06)
        .to('#rhine-headquarters [data-headquarters-gallery]', { y: '-3vh', scale: .975, clipPath: 'inset(0 0 14% 0)', duration: .78 }, 0)
        .fromTo('[data-transition-cue="members"]', { y: 20, autoAlpha: 0 }, { y: -8, autoAlpha: 1, duration: .34 }, .08)
        .to('[data-transition-cue="members"]', { y: -66, autoAlpha: 0, duration: .4 }, .5)
        .fromTo('[data-member-stage]', { x: '2vw', y: '12vh', rotation: .4, scale: .91, autoAlpha: 0, clipPath: 'inset(13% 7% 13% 7%)' }, { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: .62 }, .36)
        .fromTo('.rhine-member-track', { autoAlpha: .08 }, { autoAlpha: 1, duration: .46 }, .46)
        .fromTo('.rhine-carousel-control', { x: (index) => index ? 34 : -34, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .38, stagger: .045 }, .54)

      gsap.timeline({
        scrollTrigger: { trigger: '#rhine-members', scroller, start: 'top top', end: 'bottom top', scrub: .4 },
        defaults: { ease: 'none' },
      })
        .to('.rhine-member-track', { autoAlpha: 0, duration: .56 }, .08)
        .to('.rhine-member-stage-holo, .rhine-member-stage-scan, .rhine-member-stage-glint', { autoAlpha: 0, duration: .46, stagger: .045 }, 0)
        .to('.rhine-carousel-control.is-left', { x: '-7vw', y: '3vh', autoAlpha: 0, duration: .5 }, .03)
        .to('.rhine-carousel-control.is-right', { x: '7vw', y: '-3vh', autoAlpha: 0, duration: .5 }, .03)
        .to('[data-member-stage]', { x: '-8vw', y: '-4vh', rotation: -.45, scale: .92, autoAlpha: 0, clipPath: 'inset(2% 15% 2% 0)', duration: .8 }, 0)
        .fromTo('[data-transition-cue="departments"]', { x: 24, y: 16, autoAlpha: 0 }, { x: 0, y: -8, autoAlpha: 1, duration: .34 }, .08)
        .to('[data-transition-cue="departments"]', { x: -28, y: -64, autoAlpha: 0, duration: .4 }, .5)
        .fromTo('[data-department-stage]', { x: '7vw', y: '4vh', rotation: .5, scale: .91, autoAlpha: 0, clipPath: 'inset(10% 8% 10% 8%)' }, { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: .64 }, .36)
        .fromTo('.rhine-department-lines, .rhine-department-console, .rhine-department-tiles, .rhine-department-signatures', { autoAlpha: 0 }, { autoAlpha: 1, duration: .42, stagger: .045 }, .44)
        .fromTo('[data-department-preview]', { scale: .88 }, { scale: 1, duration: .46 }, .48)

      gsap.timeline({
        scrollTrigger: { trigger: '#rhine-departments', scroller, start: 'top top', end: 'bottom top', scrub: .42 },
        defaults: { ease: 'none' },
      })
        .to('.rhine-department-lines', { autoAlpha: 0, duration: .38 }, 0)
        .to('.rhine-department-tiles', { autoAlpha: 0, duration: .48 }, .06)
        .to('.rhine-department-heading, .rhine-department-console', { autoAlpha: 0, duration: .44, stagger: .06 }, .08)
        .to('.rhine-department-signatures', { autoAlpha: 0, duration: .38 }, .16)
        .to('[data-department-stage]', { x: '2vw', y: '-6vh', rotation: .55, scale: .84, autoAlpha: 0, clipPath: 'inset(11% 11% 11% 11%)', duration: .8 }, 0)
        .fromTo('[data-transition-cue="research"]', { y: 18, autoAlpha: 0 }, { y: -9, autoAlpha: 1, duration: .34 }, .08)
        .to('[data-transition-cue="research"]', { y: -70, autoAlpha: 0, duration: .42 }, .48)
        .fromTo('.rhine-research-scene', { y: '7vh', scale: .88, autoAlpha: .16, clipPath: 'inset(14% 7% 14% 7%)' }, { y: 0, scale: 1, autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: .66 }, .32)
        .fromTo('.rhine-blackhole-field', { x: '7vw', scale: .88, autoAlpha: .24 }, { x: 0, scale: 1, autoAlpha: 1, duration: .56 }, .38)
        .fromTo('[data-research-ui]', { x: (index) => index % 2 ? 34 : -34, y: (index) => index > 1 ? 18 : -12, autoAlpha: 0 }, { x: 0, y: 0, autoAlpha: 1, duration: .48, stagger: .045 }, .46)
      ScrollTrigger.refresh()
    }, root)
    return () => {
      homeIntroRef.current = null
      context.revert()
    }
  }, [siteMounted])

  useLayoutEffect(() => {
    if (entered && siteMounted) homeIntroRef.current?.play(0)
  }, [entered, siteMounted])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !entered || departmentIndex == null || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const preview = root.querySelector('[data-department-preview] img')
    if (!preview) return undefined
    const context = gsap.context(() => {
      gsap.fromTo(preview, { autoAlpha: 0, scale: 1.035 }, { autoAlpha: 1, scale: 1, duration: .42, ease: 'power3.out' })
    }, root)
    return () => context.revert()
  }, [departmentIndex, entered])

  const jumpTo = (id) => {
    setActive(id)
    rootRef.current?.querySelector(`#rhine-${id}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }

  return <main className={`rhine-prototype rhine-active-${active}${gliding ? ' rhine-is-gliding' : ''}`} ref={rootRef} style={{ '--rhine-paper': RHINE_CLONE.colors.paper, '--rhine-ink': RHINE_CLONE.colors.ink, '--rhine-accent': RHINE_CLONE.colors.accent, '--rhine-pale': RHINE_CLONE.colors.pale, '--rhine-cyan': RHINE_CLONE.colors.cyan }}>
    {!entered && <Entrance onPrepare={prepareSite} onComplete={finishEntrance} />}
    {siteMounted && <>
      <header data-main-chrome><FixedBrand light={active === 'research'} section={active} /></header>
      <nav className={`rhine-main-navigation ${active === 'research' ? 'is-light' : ''}`} data-main-chrome aria-label="Rhine Lab navigation">{RHINE_CLONE.sections.map((section) => <button type="button" className={active === section.id ? 'is-active' : ''} onClick={() => jumpTo(section.id)} aria-pressed={active === section.id} key={section.id}>{section.label}</button>)}</nav>
      <div data-main-chrome><FixedFooter light={active === 'research'} /></div>
      <div className="rhine-scroll" data-rhine-scroll>
        <section id="rhine-home" className="rhine-view rhine-home" data-rhine-view="home">
          <div className="rhine-home-copy"><h1><span>{RHINE_CLONE.home.eyebrow}</span>{RHINE_CLONE.home.title}<b>{RHINE_CLONE.home.accent}</b></h1><p>{RHINE_CLONE.home.copy}</p><strong><i />{RHINE_CLONE.home.partner}</strong></div>
          <HomeSystem />
        </section>
        <section id="rhine-headquarters" className="rhine-view rhine-headquarters" data-rhine-view="headquarters"><HeadquartersGallery base={base} active={active === 'headquarters' && !gliding} /><SectionTransitionCue code="02" label="MEMBER ARCHIVE" target="members" /></section>
        <section id="rhine-members" className="rhine-view rhine-members" data-rhine-view="members"><MemberCarousel base={base} selected={memberIndex} onSelect={chooseMember} moving={memberMove} onMoveEnd={finishMemberMove} /><SectionTransitionCue code="03" label="DEPARTMENT MATRIX" target="departments" /></section>
        <section id="rhine-departments" className="rhine-view rhine-departments" data-rhine-view="departments"><DepartmentMatrix base={base} selected={departmentIndex} onSelect={setDepartmentIndex} /><SectionTransitionCue code="04" label="RESEARCH / EVENT HORIZON" target="research" tone="dark" /></section>
        <section id="rhine-research" className="rhine-view rhine-research" data-rhine-view="research"><ResearchScene active={active === 'research' && !gliding} prepareBlackHole={!entered || (!gliding && (active === 'members' || active === 'departments'))} onContinue={() => jumpTo('home')} /></section>
      </div>
    </>}
  </main>
}

export default RhineArchivePrototype
