import { memo, useEffect, useRef, useState } from 'react'
import fragmentsSource from '../vendor/3cscwy/3cScWy.frag.glsl?raw'

/*
 * Exact A-03 fragment source: “Fragments” by XorDev.
 * Source: https://www.shadertoy.com/view/3cScWy
 * The component only supplies a WebGL2 fullscreen surface, Shadertoy uniforms,
 * responsive resolution, and VEIKO lifecycle controls.
 */

const QUALITY_PRESETS = Object.freeze({
  low: { maxDpr: .62, frameInterval: 1000 / 24 },
  medium: { maxDpr: .86, frameInterval: 1000 / 36 },
  high: { maxDpr: 1.08, frameInterval: 1000 / 50 },
})

const VERTEX_SHADER = `#version 300 es
const vec2 POSITIONS[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2( 3.0, -1.0),
  vec2(-1.0,  3.0)
);

void main() {
  gl_Position = vec4(POSITIONS[gl_VertexID], 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec3 iResolution;
uniform float iTime;
out vec4 veikoFragColor;

${fragmentsSource}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  veikoFragColor = color;
}
`

function chooseQuality(requested) {
  if (requested !== 'auto' && QUALITY_PRESETS[requested]) return requested
  const compact = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches
  const cores = navigator.hardwareConcurrency || 4
  if (!compact && cores >= 8) return 'high'
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

export const ChromaticTunnelCanvas = memo(function ChromaticTunnelCanvas({
  active = true,
  className = '',
  fallback,
  label = 'Live Fragments crystal field',
  quality = 'auto',
}) {
  const canvasRef = useRef(null)
  const runtimeRef = useRef(null)
  const [failed, setFailed] = useState(false)
  const tierRef = useRef(null)
  if (!tierRef.current) tierRef.current = chooseQuality(quality)
  const tier = tierRef.current

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const preset = QUALITY_PRESETS[tier]
    const gl = canvas.getContext('webgl2', {
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
    let frame = 0
    let lastFrame = 0
    let visible = true
    let disposed = false
    const startedAt = performance.now()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    try {
      program = createProgram(gl)
      gl.useProgram(program)
    } catch (error) {
      console.warn('VEIKO Shadertoy 3cScWy unavailable:', error)
      setFailed(true)
      return () => {
        if (program) gl.deleteProgram(program)
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
    className={`rhine-chromatic-tunnel ${failed ? 'has-fallback' : ''} ${className}`.trim()}
    data-chromatic-quality={tier}
    data-shadertoy-id="3cScWy"
    data-shadertoy-source="original"
  >
    {fallback && <img className="rhine-chromatic-fallback" src={fallback} alt="" />}
    <canvas ref={canvasRef} role="img" aria-label={`${label} — ${tier} quality`} />
  </div>
})

export default ChromaticTunnelCanvas
