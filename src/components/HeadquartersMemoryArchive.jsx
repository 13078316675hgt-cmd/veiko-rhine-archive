import { useEffect, useRef, useState } from 'react'
import '../headquarters-memory.css'

const sequences = [
  { code: '01', title: 'CONTINUUM', subtitle: '连续体', category: 'STRUCTURAL MEMORY', detail: '将离散片段连接成连续的形态。沿着结构，追溯每一次变化。', type: 'SEGMENT / FORM' },
  { code: '02', title: 'RESONANCE', subtitle: '共振', category: 'RESONANT MEMORY', detail: '沿闭合的轨迹，寻找结构之间的共鸣。', type: 'ORBIT / RESONANCE' },
  { code: '03', title: 'FRAGMENTS', subtitle: '碎片', category: 'SPATIAL MEMORY', detail: '拆解、游离、重新排列。每个碎片都是另一种可能的起点。', type: 'PARTICLE / SPACE' },
]

function MemoryStructure({ sequence }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let width = 1, height = 1
    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      const mobile = width < 700
      if (sequence === 0) {
        const rings = []
        for (let i = 0; i < 92; i++) {
          const u = i / 91
          const wave = u * Math.PI * 2.15
          const x = width * (-.17 + u * 1.38)
          const y = height * (.57 + Math.sin(wave + .4) * (mobile ? .08 : .13))
          const r = Math.min(width * .125, height * .25) * (.79 + .24 * Math.cos(wave))
          const twist = u * 3.4
          const vertices = []
          for (let j = 0; j < 8; j++) {
            const a = j / 8 * Math.PI * 2 + twist
            vertices.push([x + Math.cos(a) * r * .48, y + Math.sin(a) * r])
          }
          rings.push({ vertices, red: i > 34 && i < 55, depth: Math.cos(wave) })
        }
        const path = (points) => { ctx.beginPath(); points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath() }
        for (let i = rings.length - 1; i >= 0; i--) {
          const { vertices, red, depth } = rings[i]
          const center = vertices.reduce((a,p) => [a[0]+p[0]/8,a[1]+p[1]/8], [0,0])
          const inner = vertices.map(([x,y]) => [center[0]+(x-center[0])*.70, center[1]+(y-center[1])*.70])
          for (let j = 0; j < 8; j++) {
            const shade = Math.round(140 + 63 * Math.sin(j * .78 + .5) + depth * 12)
            path([vertices[j], vertices[(j+1)%8], inner[(j+1)%8], inner[j]])
            ctx.fillStyle = red ? `rgb(${Math.max(77,shade-45)},${Math.round(shade*.12)},${Math.round(shade*.13)})` : `rgb(${shade},${shade+1},${shade})`
            ctx.fill()
          }
          path(vertices); ctx.strokeStyle = red ? 'rgba(225,157,149,.55)' : 'rgba(255,255,255,.83)'; ctx.lineWidth = 1.3; ctx.stroke()
          path(inner); ctx.strokeStyle = red ? 'rgba(88,10,15,.75)' : 'rgba(75,77,75,.27)'; ctx.lineWidth = .65; ctx.stroke()
        }
      } else if (sequence === 1) {
        const radius = Math.min(width * .24, height * .26)
        const point = (u, v) => {
          const tube = radius * (.26 + .08 * Math.cos(u * 3))
          const a = (radius + tube * Math.cos(v)) * Math.cos(u)
          const b = (radius + tube * Math.cos(v)) * Math.sin(u)
          const c = tube * Math.sin(v)
          const y = b * .64 - c * .77
          const z = b * .77 + c * .64
          const x = a * .94 + z * .34
          const depth = -a * .34 + z * .94
          const perspective = 1100 / (1100 + depth)
          return [width * .53 + x * perspective, height * .55 + y * perspective, depth]
        }
        const faces = []
        for (let ring = 0; ring < 84; ring++) {
          for (let side = 0; side < 16; side++) {
            const u = ring / 84 * Math.PI * 2
            const v = side / 16 * Math.PI * 2
            const points = [point(u,v),point(u+.057,v),point(u+.057,v+Math.PI/8),point(u,v+Math.PI/8)]
            faces.push({ points, depth: points.reduce((sum,p) => sum + p[2],0)/4, red: ring > 8 && ring < 28, light: .5 + .5 * Math.sin(v + .8) })
          }
        }
        faces.sort((a,b) => b.depth-a.depth)
        for (const face of faces) {
          ctx.beginPath(); face.points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath()
          const shade = Math.round(63 + face.light * 177)
          ctx.fillStyle = face.red ? `rgb(${Math.round(64+face.light*101)},${Math.round(12+face.light*17)},${Math.round(18+face.light*19)})` : `rgb(${shade},${shade+1},${shade})`
          ctx.fill(); ctx.strokeStyle = face.red ? 'rgba(231,178,164,.36)' : 'rgba(248,249,245,.58)'; ctx.lineWidth = .65; ctx.stroke()
        }
      } else if (sequence === 2) {
        const unit = Math.min(width, height * 1.5)
        for (let i = 0; i < 78; i++) {
          const n = Math.sin(i * 127.1 + 6) * 43758.5453
          const f = n - Math.floor(n)
          const u = i / 78
          const x = width * (.12 + .72 * u) + Math.cos(i * 4.3) * unit * .16
          const y = height * (.65 - u * .23) + Math.sin(i * 8.1) * height * .18
          const size = unit * (.018 + f * f * .1)
          const red = i % 7 < 3
          ctx.save(); ctx.translate(x,y); ctx.rotate(-.7 + Math.sin(i) * .16)
          ctx.globalAlpha = .2 + f * .7
          ctx.fillStyle = red ? '#a00b19' : '#bec0be'
          ctx.strokeStyle = red ? '#6e0812' : '#777d78'
          ctx.lineWidth = .8
          ctx.fillRect(-size/2,-size/2,size,size); ctx.strokeRect(-size/2,-size/2,size,size)
          ctx.fillStyle = red ? '#260a0d' : '#5b605b'
          if (size > 34) {
            ctx.font = `${Math.max(7,size*.13)}px monospace`
            ctx.fillText(`VK.${String(i).padStart(3,'0')}`, -size*.39,-size*.24)
            for (let k = 0; k < 6; k++) ctx.fillRect(-size*.36, size*(.03+k*.064), size*(.25+((i+k)%4)*.1), Math.max(.7,size*.017))
            ctx.strokeRect(size*.12, -size*.08, size*.23,size*.23)
          }
          ctx.restore()
        }
      }
      canvas.dataset.ready = 'true'
    }
    const resize = () => {
      // Layout size stays stable while the page's transition scales its parent.
      width = canvas.clientWidth; height = canvas.clientHeight
      const dpr = Math.min(devicePixelRatio || 1, 2)
      canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr)
      ctx.setTransform(dpr,0,0,dpr,0,0); draw()
    }
    const observer = new ResizeObserver(resize); observer.observe(canvas)
    resize()
    return () => observer.disconnect()
  }, [sequence])
  return <canvas ref={ref} className="memory-structure" aria-hidden="true" />
}

export function HeadquartersMemoryArchive({ active }) {
  const [selected, setSelected] = useState(0)
  const scene = sequences[selected]
  const tabs = useRef([])
  const selectByKey = (event, index) => {
    let next
    if (event.key === 'ArrowRight') next = (index+1)%3
    if (event.key === 'ArrowLeft') next = (index+2)%3
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = 2
    if (next !== undefined) { event.preventDefault(); setSelected(next); tabs.current[next]?.focus() }
  }
  return <div className={`memory-archive memory-sequence-${selected+1} ${active ? 'is-active' : ''}`} data-headquarters-gallery data-memory-sequence={scene.code}>
    <div className="memory-stage" data-memory-stage>
      <MemoryStructure sequence={selected} />
      <svg className="memory-registration" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
        <path className="memory-diagonal" d="M-90 825 1330 170M160 920 1520 350" />
        <path d="M410 487 566 374M902 525 1060 653M310 640 140 711" />
        <g className="memory-targets"><rect x="395" y="472" width="30" height="30"/><rect x="871" y="494" width="62" height="62"/><rect x="290" y="620" width="40" height="40"/></g>
        <path className="memory-crosses" d="M561 370h10m-5-5v10M1055 653h10m-5-5v10M135 711h10m-5-5v10" />
      </svg>
    </div>
    <header className="memory-heading" data-memory-heading>
      <p><span className="memory-square" /> HEADQUARTERS <span>/ VEIKO</span></p>
      <div className="memory-heading-line"><h2>MEMORY</h2><span className="memory-edition">ARCHIVE<br/>EDITION — 001</span></div>
      <div className="memory-sequence-label">SEQUENCE <b>{scene.code}</b><i />{scene.category}</div>
    </header>
    <div className="memory-coordinate" aria-hidden="true">V / K<br/><i />RECONSTRUCTING<br/>THE INVISIBLE</div>
    <div className="memory-numeral" aria-hidden="true">{scene.code}<span> / 03</span></div>
    <section className="memory-caption" data-memory-caption role="tabpanel" id="memory-panel" aria-labelledby={`memory-tab-${selected}`} tabIndex={0}>
      <span className="memory-file">FILE / {scene.type}</span>
      <h3>{scene.title}<span>✦</span></h3>
      <p><b>{scene.subtitle}</b>{scene.detail}</p>
    </section>
    <nav className="memory-navigation" data-memory-nav aria-label="记忆序列">
      <div className="memory-navigation-label"><span>SELECT A MEMORY</span><span>选择记忆序列 ↗</span></div>
      <div className="memory-tabs" role="tablist" aria-label="档案场景">
        {sequences.map((item,index) => <button key={item.code} ref={node => { tabs.current[index] = node }} role="tab" id={`memory-tab-${index}`} aria-controls="memory-panel" aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} onKeyDown={event => selectByKey(event,index)} onClick={() => setSelected(index)}><i/><span>{item.code}</span><strong>{item.title}<small>{item.subtitle}</small></strong><em>↗</em></button>)}
      </div>
    </nav>
    <div className="memory-bottom-mark" aria-hidden="true"><span>VEIKO / PERSONAL ARCHIVE</span><span>■ □ □ &nbsp; MEMORY INDEX</span></div>
  </div>
}
