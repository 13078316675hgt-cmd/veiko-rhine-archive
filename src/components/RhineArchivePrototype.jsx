import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { RHINE_CLONE, RHINE_DEPARTMENTS, RHINE_MEMBERS, RHINE_RESEARCH, rhineAsset } from '../data/rhineArchiveContent'

gsap.registerPlugin(ScrollTrigger)

const basePath = () => import.meta.env.BASE_URL
const RHINE_LOGIN = Object.freeze({ username: 'Marlsa', password: '9029' })

function InfinityLogo({ compact = false }) {
  return <svg className={compact ? 'is-compact' : ''} viewBox="0 0 310 160" aria-hidden="true">
    <path className="rhine-infinity-outline" data-logo-outline d="M154 80 113 39C91 17 54 20 36 45S23 105 48 123c23 17 53 12 72-7l34-36 35-36c19-19 49-24 72-7 25 18 30 53 12 78s-55 28-77 6L154 80Z" fill="none" stroke="currentColor" strokeWidth="20" strokeLinejoin="round" />
    <path className="rhine-infinity-glyphs" data-logo-glyphs d="M73 58v44M51 80h44M217 80h43" fill="none" stroke="currentColor" strokeWidth="13" />
  </svg>
}

function MoonProjectLogo() {
  return <svg className="rhine-moon-project-logo" viewBox="0 0 92 34" aria-hidden="true">
    <path className="is-crescent" d="M19 3a14 14 0 1 0 14 22A11.5 11.5 0 0 1 19 3Z" />
    <path className="is-orbit" d="M4 22C21 11 49 8 82 14C61 14 37 20 17 31" />
    <circle cx="80" cy="14" r="3" />
    <path className="is-mark" d="M44 24h19M52 20v8M59 20v8" />
  </svg>
}

function FixedBrand({ light = false }) {
  const hasMeta = RHINE_CLONE.brand.lineOne || RHINE_CLONE.brand.lineTwo
  return <div className={`rhine-fixed-brand ${light ? 'is-light' : ''}`}><strong>{RHINE_CLONE.brand.title}</strong>{hasMeta && <small>{RHINE_CLONE.brand.lineOne}{RHINE_CLONE.brand.lineTwo && <><br />{RHINE_CLONE.brand.lineTwo}</>}</small>}</div>
}

function FixedFooter({ light = false }) {
  return <div className={`rhine-fixed-footer ${light ? 'is-light' : ''}`}><span>{RHINE_CLONE.brand.footer}</span><i /></div>
}

function Entrance({ onComplete }) {
  const rootRef = useRef(null)
  const [canLogin, setCanLogin] = useState(false)
  const [authorizing, setAuthorizing] = useState(false)
  const [loginError, setLoginError] = useState('')

  const handleLogin = useCallback((event) => {
    event.preventDefault()
    if (!canLogin || authorizing) return

    const form = event.currentTarget
    const data = new FormData(form)
    const username = String(data.get('rhine-username') || '').trim()
    const password = String(data.get('rhine-password') || '')
    const authorized = username === RHINE_LOGIN.username && password === RHINE_LOGIN.password

    if (!authorized) {
      setLoginError('INCORRECT USERNAME OR PASSWORD')
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
      gsap.set('[data-login], [data-entrance-brand], [data-entrance-footer], [data-access], [data-welcome], [data-paper-wash]', { autoAlpha: 0 })
      gsap.set('[data-intro-logo]', { x: introLogoOffset, scale: .86, autoAlpha: 0, transformOrigin: '50% 50%' })
      gsap.set('[data-logo-loader-copy]', { clipPath: 'inset(0 100% 0 0)', autoAlpha: 0 })
      gsap.set('[data-logo-dot]', { scale: 0, autoAlpha: 0, transformOrigin: '50% 50%' })
      gsap.set('[data-login-form]', { autoAlpha: 0, clipPath: 'inset(0 100% 0 0)' })
      gsap.set('[data-login-form] > *', { x: 14, autoAlpha: 0 })
      if (reduced) {
        gsap.set(root, { background: RHINE_CLONE.colors.paper })
        gsap.set('[data-warning]', { autoAlpha: 0 })
        gsap.set('[data-login], [data-intro-logo], [data-logo-loader-copy], [data-login-form], [data-login-form] > *, [data-entrance-brand], [data-entrance-footer]', { x: 0, scale: 1, clipPath: 'inset(0 0% 0 0)', autoAlpha: 1 })
        root.querySelectorAll('[data-intro-logo] [data-logo-outline], [data-intro-logo] [data-logo-glyphs]').forEach((path) => gsap.set(path, { strokeDashoffset: 0 }))
        setCanLogin(true)
        return
      }
      const intro = gsap.timeline({ defaults: { ease: 'power2.inOut' } })
        .addLabel('warning', 0)
        .fromTo('[data-warning-panel]', { xPercent: -185, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: .34, ease: 'power4.out' }, 'warning')
        .fromTo('[data-warning-title]', { clipPath: 'inset(0 100% 0 0)', x: 10, autoAlpha: 0 }, { clipPath: 'inset(0 0% 0 0)', x: 0, autoAlpha: 1, duration: .46, ease: 'power3.out' }, 'warning+=.08')
        .fromTo('[data-warning-symbol]', { scale: .72, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .32, ease: 'power2.out' }, 'warning+=.48')
        .fromTo('[data-warning-row]', { x: 12, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .24, stagger: .22, ease: 'power2.out' }, 'warning+=.72')
        .to('[data-warning]', { autoAlpha: 0, duration: .14, ease: 'power2.in' }, 2.02)
        .fromTo('[data-entrance-flash]', { scaleX: 0, scaleY: 1, autoAlpha: 0 }, { scaleX: 1, autoAlpha: 1, duration: .18, transformOrigin: 'center center', ease: 'power4.out' }, 2.10)
        .to('[data-entrance-flash]', { scaleX: 5.4, autoAlpha: 0, duration: .22, ease: 'power3.in' }, 2.28)
        .fromTo('[data-paper-wash]', { autoAlpha: 0 }, { autoAlpha: 1, duration: .5, ease: 'sine.inOut' }, 2.58)
        .set(root, { background: RHINE_CLONE.colors.paper }, 3.08)
        .set('[data-paper-wash], [data-entrance-flash]', { autoAlpha: 0 }, 3.09)
        .set('[data-login]', { autoAlpha: 1 }, 3.42)
        .to('[data-intro-logo]', { autoAlpha: 1, duration: .01 }, 3.48)
        .to('[data-intro-logo] [data-logo-outline]', { strokeDashoffset: 0, duration: .76, ease: 'power2.out' }, 3.50)
        .fromTo('[data-logo-dot]', { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: .48, duration: .18, stagger: .09, ease: 'power2.out' }, 3.56)
        .to('[data-intro-logo] [data-logo-glyphs]', { strokeDashoffset: 0, duration: .34, ease: 'power2.out' }, 4.12)
        .to('[data-logo-dot]', { y: -2, autoAlpha: 0, duration: .18, stagger: .05, ease: 'power2.in' }, 4.26)
        .to('[data-logo-loader-copy]', { clipPath: 'inset(0 0% 0 0)', autoAlpha: 1, duration: .36, ease: 'power2.out' }, 4.30)
        .to('[data-intro-logo]', { x: 0, scale: 1, duration: .72, ease: 'power3.inOut' }, 4.55)
        .to('[data-login-form]', { clipPath: 'inset(0 0% 0 0)', autoAlpha: 1, duration: .54, ease: 'power3.inOut' }, 4.68)
        .to('[data-login-form] > *', { x: 0, autoAlpha: 1, duration: .34, stagger: .055, ease: 'power2.out' }, 4.80)
        .to('[data-entrance-brand], [data-entrance-footer]', { autoAlpha: 1, duration: .38, ease: 'power2.out' }, 4.78)
        .call(() => setCanLogin(true), null, 5.52)
      intro.eventCallback('onComplete', () => gsap.set('[data-intro-logo], [data-login-form]', { clearProps: 'willChange' }))
    }, root)
    return () => context.revert()
  }, [])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !authorizing) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete()
      return undefined
    }
    const context = gsap.context(() => {
      const authorize = gsap.timeline({ defaults: { ease: 'power3.inOut' } })
        .to('[data-login]', { autoAlpha: 0, duration: .2 })
        .to('[data-access]', { autoAlpha: 1, duration: .01 })
        .fromTo('[data-access-copy]', { width: 0 }, { width: '27ch', duration: .7, ease: 'steps(27)' })
        .fromTo('[data-access-corner]', { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: .26, stagger: .045, ease: 'back.out(2)' }, '<.16')
        .to('[data-access-copy], [data-access-corner]', { autoAlpha: 0, duration: .16 }, '+=.24')
        .fromTo('[data-access-seed]', { width: 0, rotation: -18, autoAlpha: 0 }, { width: 58, rotation: -18, autoAlpha: 1, duration: .22, ease: 'power3.out' })
        .to('[data-access-seed]', { width: 10, rotation: 42, autoAlpha: 0, duration: .2, ease: 'power3.in' }, '+=.04')
        .fromTo('[data-auth-ring]', { scale: 4.4, rotation: -24, autoAlpha: 0 }, { scale: 1, rotation: 0, autoAlpha: 1, duration: 1.18, ease: 'power4.inOut' })
        .fromTo('[data-auth-orbit]', { strokeDashoffset: 1400 }, { strokeDashoffset: 0, duration: .96, stagger: .045 }, '<.08')
        .fromTo('[data-auth-text]', { width: 0, autoAlpha: 1 }, { width: '21ch', duration: .68, ease: 'steps(21)' }, '<.14')
        .fromTo('[data-auth-node]', { scale: 0, transformOrigin: 'center' }, { scale: 1, duration: .24, stagger: .04, ease: 'back.out(2)' }, '<.48')
        .to('[data-auth-text]', { autoAlpha: 0, duration: .16 }, '+=.34')
        .to('[data-auth-ring]', { scale: .94, rotation: 18, autoAlpha: 0, duration: .36 })
        .to('[data-access]', { autoAlpha: 0, duration: .01 })
        .to('[data-welcome]', { autoAlpha: 1, duration: .01 })
        .fromTo('[data-welcome] > strong', { clipPath: 'inset(0 100% 0 0)', autoAlpha: 0 }, { clipPath: 'inset(0 0% 0 0)', autoAlpha: 1, duration: .7, ease: 'power2.inOut' })
        .fromTo('[data-welcome] > b', { scaleX: 0, autoAlpha: 0, transformOrigin: 'left center' }, { scaleX: 1, autoAlpha: 1, duration: .38, ease: 'power4.out' }, '<.24')
        .fromTo('[data-welcome-logo]', { scale: 0, rotation: -45, autoAlpha: 0 }, { scale: 1, rotation: 0, autoAlpha: 1, duration: .26, ease: 'back.out(2)' }, '<.18')
        .to('[data-welcome-logo]', { autoAlpha: 0, scale: .35, duration: .14 }, '+=.16')
        .fromTo('[data-welcome] [data-logo-outline]', { strokeDasharray: 920, strokeDashoffset: 920, autoAlpha: 1 }, { strokeDashoffset: 0, duration: .58, ease: 'power2.inOut' })
        .fromTo('[data-welcome] [data-logo-glyphs]', { strokeDasharray: 160, strokeDashoffset: 160, autoAlpha: 1 }, { strokeDashoffset: 0, duration: .28 }, '<.28')
        .to('[data-welcome] > strong, [data-welcome] > svg', { autoAlpha: 0, y: -5, duration: .2 }, '+=.48')
        .to('[data-welcome] > b', { scaleX: .06, duration: .32, ease: 'power4.in', transformOrigin: 'center center' }, '<')
        .to('[data-welcome] > b', { scaleY: .2, autoAlpha: 0, duration: .18 })
        .call(onComplete, null, '+=.2')
      authorize.timeScale(.74)
    }, root)
    return () => context.revert()
  }, [authorizing, onComplete])

  return <div className="rhine-entrance" ref={rootRef}>
    <div className="rhine-warning" data-warning>
      <i className="rhine-warning-point" data-warning-point />
      <span className="rhine-warning-symbol" data-warning-symbol><i>!</i></span>
      <div className="rhine-warning-panel"><span data-warning-line /><strong data-warning-title>WARNING</strong><span data-warning-line /></div>
      <div className="rhine-warning-copy" data-warning-copy>
        <span data-warning-row><small>INCORRECT USERNAME OR PASSWORD</small><i /></span>
        <span data-warning-row><small>LOGIN FAILED</small><i /></span>
        <span data-warning-row><small>RETURN TO LOGIN INTERFACE</small><i /></span>
      </div>
    </div>
    <i className="rhine-entrance-flash" data-entrance-flash />
    <i className="rhine-paper-wash" data-paper-wash />
    <div data-entrance-brand><FixedBrand /></div><div data-entrance-footer><FixedFooter /></div>
    <div className="rhine-login" data-login>
      <div className="rhine-login-logo" data-intro-logo><InfinityLogo /><span data-logo-loader-copy>R H I N E - L A B</span><i className="rhine-logo-dots" aria-hidden="true"><b data-logo-dot /><b data-logo-dot /><b data-logo-dot /></i></div>
      <form className={`rhine-login-form ${loginError ? 'has-error' : ''}`} data-login-form onSubmit={handleLogin} onInput={() => { if (loginError) setLoginError('') }}>
        <h1>WELCOME</h1>
        <label><span>USERNAME:</span><input name="rhine-username" autoComplete="username" aria-invalid={Boolean(loginError)} required /></label>
        <label><span>PASSWORD:</span><input name="rhine-password" type="password" autoComplete="current-password" aria-invalid={Boolean(loginError)} required /></label>
        <p className="rhine-login-error" role="alert" aria-live="polite">{loginError || '\u00a0'}</p>
        <button type="submit" disabled={!canLogin || authorizing}>LOGIN</button>
        <a href="#rhine-register" onClick={(event) => event.preventDefault()}>REGISTER</a>
      </form>
    </div>
    <div className="rhine-access" data-access>
      <div className="rhine-access-typing"><span data-access-copy>ACCESS PERMISSION EXPIRED</span><span className="rhine-access-corners" aria-hidden="true"><i data-access-corner /><i data-access-corner /><i data-access-corner /><i data-access-corner /></span></div>
      <i className="rhine-access-seed" data-access-seed />
      <svg className="rhine-auth-ring" data-auth-ring viewBox="0 0 520 520" aria-hidden="true">
        <circle cx="260" cy="260" r="210" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="1400" data-auth-orbit />
        <circle className="is-pale" cx="260" cy="260" r="187" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="1400" data-auth-orbit />
        <path d="M170 225a102 102 0 0 1 180 0M170 295a102 102 0 0 0 180 0" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="380" data-auth-orbit />
        <path d="M154 226a40 40 0 1 0 0 68M366 226a40 40 0 1 1 0 68" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="280" data-auth-orbit />
        <g fill="currentColor"><circle cx="260" cy="260" r="9" data-auth-node /><circle cx="260" cy="228" r="5" data-auth-node /><circle cx="260" cy="292" r="5" data-auth-node /><circle cx="228" cy="244" r="5" data-auth-node /><circle cx="292" cy="244" r="5" data-auth-node /><circle cx="228" cy="276" r="5" data-auth-node /><circle cx="292" cy="276" r="5" data-auth-node /></g>
        <g className="rhine-auth-orange"><circle cx="260" cy="73" r="8" data-auth-node /><circle cx="260" cy="447" r="8" data-auth-node /></g>
      </svg>
      <strong className="rhine-auth-text" data-auth-text>PERMISSION AUTHORIZED</strong>
    </div>
    <div className="rhine-welcome" data-welcome><strong>WELCOME TO</strong><b>RHINE LAB.LLC.</b><InfinityLogo compact /><i data-welcome-logo /></div>
  </div>
}

function HomeSystem() {
  return <div className="rhine-home-system" aria-hidden="true">
    <svg viewBox="0 0 600 1000" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="rhine-black-blur" x="-32%" y="-32%" width="164%" height="164%"><feGaussianBlur stdDeviation="22" /></filter>
        <linearGradient id="rhine-tile-white" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset=".58" stopColor="#f8f8f5" /><stop offset="1" stopColor="#a5a5a3" /></linearGradient>
        <linearGradient id="rhine-tile-dark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a4a49" /><stop offset="1" stopColor="#090a09" /></linearGradient>
      </defs>
      <circle className="rhine-home-black" cx="300" cy="515" r="214" filter="url(#rhine-black-blur)" />
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
        <path d="M242 92v270l-23 30v508" /><path d="M257 76v325l-19 22v482" /><path d="M274 88v352l-17 18v452" />
        <path d="M468 108v797" />
      </g>
      <g className="rhine-home-orange" data-home-orange>
        <path d="M300 0v1000" /><path d="M300 515 0 0" /><path d="M300 515c10-73 200-118 200-250V0" />
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
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!active) return undefined
    const timer = window.setInterval(() => setCurrent((index) => (index + 1) % scenes.length), 7600)
    return () => window.clearInterval(timer)
  }, [active, scenes.length])

  const sceneAt = (offset) => scenes[(current + offset) % scenes.length]
  const primary = sceneAt(0)

  return <div className="rhine-headquarters-gallery" data-headquarters-gallery>
    <figure className="rhine-headquarters-primary" key={primary.image}>
      <img src={rhineAsset(base, primary.image)} alt={primary.label} decoding="async" fetchPriority="high" />
      <figcaption><b>{primary.code}</b><span>{primary.label}<small>SECURE ENVIRONMENT / LIVE OPTICAL FEED</small></span></figcaption>
    </figure>
    <div className="rhine-headquarters-side">
      {[1, 2].map((offset) => {
        const scene = sceneAt(offset)
        return <button type="button" onClick={() => setCurrent((current + offset) % scenes.length)} aria-label={`Open ${scene.label}`} key={scene.image}>
          <img src={rhineAsset(base, scene.image)} alt="" decoding="async" />
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

function MemberCardBody({ base, member, current = false }) {
  return <>
    <div className="rhine-member-code"><DepartmentMark code={member.code} /><small>{member.section}</small></div>
    <span className="rhine-member-section">{member.section}<br />DIRECTOR PROFILE / RHINE LAB</span>
    <img src={rhineAsset(base, member.image)} alt={current ? member.name : ''} style={{ '--member-scale': member.scale, '--member-x': `${member.x}%`, '--member-y': `${member.y}%` }} loading="eager" decoding="async" />
    <span className="rhine-member-profile">莱茵生命<br />科研主任<br />内部资料</span>
    <span className="rhine-member-name"><b>{member.name}</b><small>{member.role}</small></span>
    <span className="rhine-member-logos"><InfinityLogo compact /><i /></span>
  </>
}

const MEMBER_SLOT_X = { '-2': -42.6, '-1': -21.3, '0': 0, '1': 21.3, '2': 42.6 }

function MemberCarousel({ base, selected, onSelect, moving, onMoveEnd }) {
  const length = RHINE_MEMBERS.length
  const move = (direction) => onSelect((selected + direction + length) % length)

  useEffect(() => {
    RHINE_MEMBERS.forEach((member) => {
      const image = new Image()
      image.decoding = 'async'
      image.src = rhineAsset(base, member.image)
      image.decode?.().catch(() => {})
    })
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
          if (Math.abs(nextSlot) <= 2 && Math.abs(nextSlot) > Math.abs(slot)) sideMotionClass = 'is-side-receding'
          if (Math.abs(nextSlot) <= 2 && Math.abs(nextSlot) < Math.abs(slot)) sideMotionClass = 'is-side-approaching'
        }
        const zIndex = incoming ? 32 : slot === 0 ? 30 : distance === 1 ? 18 : distance === 2 ? 8 : 0
        return <button className={`rhine-member-card ${slot === 0 ? 'is-current' : ''} ${outgoing ? 'is-outgoing' : ''} ${incoming ? 'is-incoming' : ''} ${foldClass} ${sideMotionClass}`} data-member-index={index} data-member-name={member.name} data-member-slot={slot} type="button" style={{ zIndex }} onClick={() => onSelect(index)} aria-pressed={slot === 0} key={member.name}>
          <MemberCardBody base={base} member={member} current={slot === 0 || incoming} />
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
  { left: '13%', top: '16%' }, { left: '13%', top: '40%' }, { left: '13%', top: '64%' },
  { left: '26%', top: '28%' }, { left: '26%', top: '54%' },
  { left: '65.5%', top: '28%' }, { left: '65.5%', top: '54%' },
  { left: '79.5%', top: '16%' }, { left: '79.5%', top: '40%' }, { left: '79.5%', top: '64%' },
]

function DepartmentMatrix({ base, selected, onSelect }) {
  const current = selected == null ? null : RHINE_DEPARTMENTS[selected]
  return <div className={`rhine-department-stage ${current ? 'has-selection' : 'is-idle'}`} data-department-stage>
    <div className="rhine-department-lines" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div>
    {current && <div className="rhine-department-heading"><strong>{current.title}</strong><span>{current.label}</span></div>}
    <div className="rhine-department-console" data-department-preview>
      <div className="rhine-department-placeholder" aria-label="Select a department"><i /><InfinityLogo /></div>
      {current && <div className="rhine-department-media" key={current.preview}>
        <img src={rhineAsset(base, current.preview)} alt={`${current.label} interior`} loading="lazy" decoding="async" />
        <i /><i /><i /><i />
      </div>}
    </div>
    {RHINE_DEPARTMENTS.map((department, index) => <button className={`rhine-department-tile ${selected === index ? 'is-selected' : ''}`} style={{ ...DEPARTMENT_LAYOUT[index], '--tile-tilt': `${index < 5 ? (index % 2 ? -2 : 2) : (index % 2 ? 2 : -2)}deg`, '--tile-order': index, '--tile-delay': `${index * -.47}s` }} type="button" onPointerEnter={() => onSelect(index)} onPointerLeave={() => onSelect(null)} onFocus={() => onSelect(index)} onBlur={() => onSelect(null)} onClick={() => onSelect(index)} aria-pressed={selected === index} key={department.code}>
      <span className="rhine-department-orbit" aria-hidden="true"><i /><i /><i /></span><span className="rhine-department-trace" aria-hidden="true" />
      <DepartmentMark code={department.code} /><small>{department.label}</small>
    </button>)}
    <div className="rhine-department-signatures" aria-hidden="true"><i /><InfinityLogo compact /></div>
  </div>
}

function BlackHoleSystem({ base }) {
  const source = rhineAsset(base, RHINE_CLONE.scenes.research)
  return <figure className="rhine-blackhole-visual" aria-label="Chromatic black hole with slowly moving accretion light">
    <div className="rhine-blackhole-field">
      <img className="rhine-blackhole-base" src={source} alt="" />
      <img className="rhine-blackhole-flow is-upper" src={source} alt="" aria-hidden="true" />
      <img className="rhine-blackhole-flow is-lower" src={source} alt="" aria-hidden="true" />
      <i className="rhine-blackhole-lensing" aria-hidden="true" />
    </div>
    <figcaption><span>GRAVITATIONAL LENSING</span><b>BH / SPECTRUM-01</b></figcaption>
  </figure>
}

function ResearchScene({ base, onContinue }) {
  const timeDots = (layer) => Array.from({ length: 121 }, (_, index) => {
    const x = index % 11
    const y = Math.floor(index / 11)
    const visible = ((x - 5) ** 2) + ((y - 5) ** 2) <= 25
    return <i className={visible ? 'is-visible' : ''} style={{ '--grain-index': index }} key={`${layer}-${index}`} />
  })
  return <div className="rhine-research-scene">
    <BlackHoleSystem base={base} />
    <div className="rhine-space-stars is-far" aria-hidden="true" /><div className="rhine-space-stars is-near" aria-hidden="true" />
    <div className="rhine-research-shade" />
    <div className="rhine-pioneer-mark" data-research-ui><span>{RHINE_RESEARCH.title}<small>{RHINE_RESEARCH.english}</small></span><MoonProjectLogo /></div>
    <div className="rhine-progress-system" data-research-ui><div className="rhine-time-meter" aria-label="Particle time transfer progress"><svg className="rhine-time-dial" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="53" /><path d="M60 2v8M60 110v8M2 60h8M110 60h8M18.3 18.3l5.7 5.7M96 96l5.7 5.7M101.7 18.3L96 24M24 96l-5.7 5.7" /><path className="is-sweep" d="M60 7a53 53 0 0 1 45.9 26.5" /></svg><span className="rhine-time-mass is-source" aria-hidden="true">{timeDots('source')}</span><span className="rhine-time-mass is-target" aria-hidden="true">{timeDots('target')}</span><span className="rhine-time-transfer" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <i style={{ '--transfer-index': index }} key={index} />)}</span><i className="rhine-time-core" aria-hidden="true" /></div><strong>{RHINE_RESEARCH.progress}</strong></div>
    <div className="rhine-research-copy" data-research-ui><p>{RHINE_RESEARCH.copy.map((line) => <span key={line}>{line}</span>)}</p><button type="button" onClick={onContinue}>{RHINE_RESEARCH.button}<i /></button></div>
    <div className="rhine-research-readout" data-research-ui><b>R / 01 — 037</b><span>{RHINE_RESEARCH.readout.slice(1).map((line) => <small key={line}>{line}</small>)}</span><i /></div>
  </div>
}

export function RhineArchivePrototype() {
  const bypass = new URLSearchParams(window.location.search).get('rhineBypass') === '1'
  const rootRef = useRef(null)
  const [entered, setEntered] = useState(bypass)
  const [active, setActive] = useState('home')
  const [memberIndex, setMemberIndex] = useState(1)
  const [memberMove, setMemberMove] = useState(null)
  const [departmentIndex, setDepartmentIndex] = useState(null)
  const base = basePath()
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
      scroller.classList.add('is-gliding')
      scroller.style.scrollBehavior = 'auto'
      scroller.style.scrollSnapType = 'none'
      scrollTween = gsap.to(scroller, {
        scrollTop: targetTop,
        duration: 1,
        ease: 'power2.inOut',
        overwrite: 'auto',
        onUpdate: () => ScrollTrigger.update(),
        onComplete: finishGlide,
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
    if (!root || !entered || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const scroller = root.querySelector('[data-rhine-scroll]')
    const context = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo('[data-main-chrome]', { autoAlpha: 0 }, { autoAlpha: 1, duration: .28, stagger: .04 })
        .fromTo('.rhine-home-copy', { x: '38vw', y: '-2vh', scale: 1.28, transformOrigin: 'left center' }, { x: 0, y: 0, scale: 1, duration: .92, ease: 'power4.inOut' }, '<')
        .fromTo('.rhine-home-copy > *', { autoAlpha: 0 }, { autoAlpha: 1, duration: .32, stagger: .055 }, '<.12')
        .fromTo('.rhine-home-black', { scale: 0, autoAlpha: 0, transformOrigin: 'center' }, { scale: 1, autoAlpha: 1, duration: .72, ease: 'power4.out' }, '<.28')
        .fromTo('[data-home-orange] path, [data-home-white] path', { strokeDasharray: 1100, strokeDashoffset: 1100 }, { strokeDashoffset: 0, duration: 1.02, stagger: .055 }, '<.05')
        .fromTo('[data-home-diamonds] rect, [data-home-nodes] circle', { scale: 0, transformOrigin: 'center' }, { scale: 1, duration: .3, stagger: .045, ease: 'back.out(2)' }, '<.45')

      gsap.fromTo('[data-member-stage]', { scale: .95, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .72, ease: 'power4.out', scrollTrigger: { trigger: '#rhine-members', scroller, start: 'top 65%', toggleActions: 'play none none reverse' } })
      gsap.fromTo('[data-department-stage]', { scale: .97, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .72, ease: 'power4.out', scrollTrigger: { trigger: '#rhine-departments', scroller, start: 'top 65%', toggleActions: 'play none none reverse' } })
      gsap.fromTo('[data-department-preview]', { autoAlpha: 0 }, { autoAlpha: 1, duration: .42, ease: 'power3.out', scrollTrigger: { trigger: '#rhine-departments', scroller, start: 'top 65%', toggleActions: 'play none none reverse' } })
      gsap.fromTo('[data-research-ui]', { x: -28, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .7, stagger: .1, ease: 'power4.out', scrollTrigger: { trigger: '#rhine-research', scroller, start: 'top 66%', toggleActions: 'play none none reverse' } })
      gsap.fromTo('#rhine-headquarters [data-headquarters-gallery]', { y: '3.5vh', scale: .975, autoAlpha: .55 }, { y: 0, scale: 1, autoAlpha: 1, ease: 'none', scrollTrigger: { trigger: '#rhine-headquarters', scroller, start: 'top bottom', end: 'top 8%', scrub: .85 } })
      ScrollTrigger.refresh()
    }, root)
    return () => context.revert()
  }, [entered])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !entered || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const context = gsap.context(() => {
      gsap.fromTo('[data-department-preview] img', { autoAlpha: 0, scale: 1.035 }, { autoAlpha: 1, scale: 1, duration: .42, ease: 'power3.out' })
    }, root)
    return () => context.revert()
  }, [departmentIndex, entered])

  const jumpTo = (id) => {
    setActive(id)
    rootRef.current?.querySelector(`#rhine-${id}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }

  return <main className={`rhine-prototype rhine-active-${active}`} ref={rootRef} style={{ '--rhine-paper': RHINE_CLONE.colors.paper, '--rhine-ink': RHINE_CLONE.colors.ink, '--rhine-accent': RHINE_CLONE.colors.accent, '--rhine-pale': RHINE_CLONE.colors.pale, '--rhine-cyan': RHINE_CLONE.colors.cyan }}>
    {!entered && <Entrance onComplete={finishEntrance} />}
    {entered && <>
      <header data-main-chrome><FixedBrand light={active === 'research'} /></header>
      <nav className={`rhine-main-navigation ${active === 'research' ? 'is-light' : ''}`} data-main-chrome aria-label="Rhine Lab navigation">{RHINE_CLONE.sections.map((section) => <button type="button" className={active === section.id ? 'is-active' : ''} onClick={() => jumpTo(section.id)} aria-pressed={active === section.id} key={section.id}>{section.label}</button>)}</nav>
      <div data-main-chrome><FixedFooter light={active === 'research'} /></div>
      <div className="rhine-scroll" data-rhine-scroll>
        <section id="rhine-home" className="rhine-view rhine-home" data-rhine-view="home">
          <div className="rhine-home-copy"><h1><span>{RHINE_CLONE.home.eyebrow}</span>{RHINE_CLONE.home.title}<b>{RHINE_CLONE.home.accent}</b></h1><p>{RHINE_CLONE.home.copy}</p><strong><i />{RHINE_CLONE.home.partner}</strong></div>
          <HomeSystem />
        </section>
        <section id="rhine-headquarters" className="rhine-view rhine-headquarters" data-rhine-view="headquarters"><HeadquartersGallery base={base} active={active === 'headquarters'} /></section>
        <section id="rhine-members" className="rhine-view rhine-members" data-rhine-view="members"><MemberCarousel base={base} selected={memberIndex} onSelect={chooseMember} moving={memberMove} onMoveEnd={finishMemberMove} /></section>
        <section id="rhine-departments" className="rhine-view rhine-departments" data-rhine-view="departments"><DepartmentMatrix base={base} selected={departmentIndex} onSelect={setDepartmentIndex} /></section>
        <section id="rhine-research" className="rhine-view rhine-research" data-rhine-view="research"><ResearchScene base={base} onContinue={() => jumpTo('home')} /></section>
      </div>
    </>}
  </main>
}

export default RhineArchivePrototype
