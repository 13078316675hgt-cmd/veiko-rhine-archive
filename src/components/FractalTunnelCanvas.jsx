import { memo, useEffect, useRef, useState } from 'react'
import wtjyzrSource from '../vendor/wtjyzr/WtjyzR.frag.glsl?raw'

/*
 * Exact A-02 fragment source: “Path to the colorful infinity” by Benoit Marini.
 * Source: https://www.shadertoy.com/view/WtjyzR
 * License: CC BY-NC-SA 3.0 — https://creativecommons.org/licenses/by-nc-sa/3.0/
 * This component only provides the fullscreen WebGL surface and Shadertoy uniforms.
 */

const QUALITY_PRESETS = Object.freeze({
  low: { maxDpr: .72, frameInterval: 1000 / 30 },
  medium: { maxDpr: 1, frameInterval: 1000 / 45 },
  high: { maxDpr: 1.35, frameInterval: 1000 / 60 },
})

const VERTEX_SHADER = `
attribute vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

// Shadertoy accepts the original post-increment loop condition. WebGL 1's
// validator does not, so express the same body iterations (1 through ITER)
// with a conventional loop while retaining the archived source unchanged.
const WEBGL_COMPAT_SOURCE = wtjyzrSource.replace(
  'for (int i=0 ; i++ < ITER;)',
  'for (int i=1; i <= ITER; i++)',
)

const FRAGMENT_SHADER = `
precision highp float;

uniform vec3 iResolution;
uniform float iTime;

${WEBGL_COMPAT_SOURCE}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}
`

function chooseQuality(requested, preview) {
  if (requested !== 'auto' && QUALITY_PRESETS[requested]) return requested
  if (preview) return 'low'

  const cores = navigator.hardwareConcurrency || 4
  const memory = navigator.deviceMemory || 4
  const compact = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches
  if (!compact && cores >= 8 && memory >= 6) return 'high'
  if (!compact && cores >= 4) return 'medium'
  return 'low'
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader

  const message = gl.getShaderInfoLog(shader) || 'Shader compilation failed.'
  gl.deleteShader(shader)
  throw new Error(message)
}

function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  const program = gl.createProgram()
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)

  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program
  const message = gl.getProgramInfoLog(program) || 'Shader program linking failed.'
  gl.deleteProgram(program)
  throw new Error(message)
}

export const FractalTunnelCanvas = memo(function FractalTunnelCanvas({
  active = true,
  className = '',
  fallback,
  label = 'Live fractal tunnel optical feed',
  preview = false,
  quality = 'auto',
}) {
  const canvasRef = useRef(null)
  const runtimeRef = useRef(null)
  const [failed, setFailed] = useState(false)
  const tierRef = useRef(null)
  if (!tierRef.current) tierRef.current = chooseQuality(quality, preview)
  const tier = tierRef.current

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const preset = QUALITY_PRESETS[tier]
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      desynchronized: true,
      powerPreference: tier === 'high' ? 'high-performance' : 'default',
      preserveDrawingBuffer: false,
      stencil: false,
    })

    if (!gl) {
      setFailed(true)
      return undefined
    }

    let program
    let buffer
    let frame = 0
    let lastFrame = 0
    let visible = true
    let disposed = false
    const startedAt = performance.now()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    try {
      program = createProgram(gl)
      buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      gl.useProgram(program)
      const position = gl.getAttribLocation(program, 'aPosition')
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    } catch (error) {
      console.warn('VEIKO WtjyzR tunnel unavailable:', error)
      setFailed(true)
      return () => {
        if (program) gl.deleteProgram(program)
        if (buffer) gl.deleteBuffer(buffer)
      }
    }

    const resolution = gl.getUniformLocation(program, 'iResolution')
    const time = gl.getUniformLocation(program, 'iTime')

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, preset.maxDpr)
      const width = Math.max(2, Math.round(rect.width * dpr))
      const height = Math.max(2, Math.round(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
    }

    const draw = (now = performance.now()) => {
      gl.useProgram(program)
      gl.uniform3f(resolution, canvas.width, canvas.height, 1)
      gl.uniform1f(time, (now - startedAt) / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const loop = (now) => {
      frame = 0
      if (disposed || document.hidden || !visible || !runtimeRef.current?.active) return
      if (now - lastFrame >= preset.frameInterval) {
        lastFrame = now
        draw(now)
      }
      frame = window.requestAnimationFrame(loop)
    }

    const start = () => {
      if (disposed || frame || document.hidden || !visible || !runtimeRef.current?.active) return
      if (reducedMotion) {
        draw(startedAt + 7200)
        return
      }
      frame = window.requestAnimationFrame(loop)
    }

    const stop = () => {
      window.cancelAnimationFrame(frame)
      frame = 0
    }

    runtimeRef.current = { active, draw, start, stop }
    const resizeObserver = new ResizeObserver(() => {
      resize()
      if (!runtimeRef.current?.active || reducedMotion) draw(reducedMotion ? startedAt + 7200 : performance.now())
    })
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
      else stop()
    }, { threshold: 0 })
    const onVisibility = () => document.hidden ? stop() : start()
    const onContextLost = (event) => {
      event.preventDefault()
      stop()
      setFailed(true)
    }

    resize()
    resizeObserver.observe(canvas)
    intersectionObserver.observe(canvas)
    document.addEventListener('visibilitychange', onVisibility)
    canvas.addEventListener('webglcontextlost', onContextLost)
    draw(reducedMotion ? startedAt + 7200 : startedAt)
    start()

    return () => {
      disposed = true
      stop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      if (runtimeRef.current?.draw === draw) runtimeRef.current = null
    }
  }, [tier])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    runtime.active = active
    if (active) runtime.start()
    else runtime.stop()
  }, [active])

  return <div
    className={`rhine-fractal-tunnel ${failed ? 'has-fallback' : ''} ${className}`.trim()}
    data-fractal-quality={tier}
    data-shadertoy-id="WtjyzR"
    data-shadertoy-source="original"
    style={fallback ? { '--fractal-fallback': `url("${fallback}")` } : undefined}
  >
    <canvas ref={canvasRef} role="img" aria-label={`${label} — ${tier} quality`} />
    {preview
      ? <span aria-hidden="true">A-02 LIVE / {tier.toUpperCase()}</span>
      : <a
          className="rhine-fractal-credit"
          href="https://www.shadertoy.com/view/WtjyzR"
          target="_blank"
          rel="noreferrer"
          title="Path to the colorful infinity — Benoit Marini — CC BY-NC-SA 3.0 — original shader running in VEIKO"
        >WTJYZR / BENOIT M. / {tier.toUpperCase()}</a>}
  </div>
})

export default FractalTunnelCanvas
