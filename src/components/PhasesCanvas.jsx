import { memo, useEffect, useRef, useState } from 'react'
import phasesSource from '../vendor/ml3bwf/ml3BWf.frag.glsl?raw'

/*
 * Exact fragment source: “Phases” by XorDev.
 * Source: https://www.shadertoy.com/view/ml3BWf
 * The original lunar geometry stays unchanged. The output wrapper adds
 * a monochrome halftone screen at 65% strength, with no extra raymarch pass.
 */

const QUALITY_PRESETS = Object.freeze({
  low: { maxDpr: .46, frameInterval: 1000 / 24 },
  medium: { maxDpr: .68, frameInterval: 1000 / 32 },
  high: { maxDpr: .9, frameInterval: 1000 / 45 },
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
uniform float uHalftonePitch;
out vec4 veikoFragColor;

${phasesSource}

float halftoneDot(vec2 pixel, float angle, float coverage) {
  mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 cell = fract(rotation * pixel / uHalftonePitch) - .5;
  float distanceToCenter = length(cell);
  float radius = sqrt(clamp(coverage, 0., 1.) / 3.14159265);
  float edge = max(fwidth(distanceToCenter), .025);
  return (1. - smoothstep(radius - edge, radius + edge, distanceToCenter))
    * smoothstep(.002, .018, coverage);
}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  float luminance = clamp(dot(color.rgb, vec3(.2126, .7152, .0722)), 0., 1.);
  float tone = pow(luminance, .86);
  float dots = halftoneDot(gl_FragCoord.xy, .785398, tone * .91);
  float monochrome = mix(luminance, dots * .94 + tone * .075, .65);
  veikoFragColor = vec4(vec3(monochrome), 1.);
}
`

function chooseQuality(requested) {
  if (requested !== 'auto' && QUALITY_PRESETS[requested]) return requested
  const compact = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches
  const cores = navigator.hardwareConcurrency || 4
  const memory = navigator.deviceMemory || 4
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

export const PhasesCanvas = memo(function PhasesCanvas({
  active = false,
  className = '',
  label = 'Phases lunar authorization field',
  onReady,
  quality = 'auto',
  resolutionScale = 1,
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
    let nextFrame = 0
    let visible = true
    let disposed = false
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    try {
      program = createProgram(gl)
      gl.useProgram(program)
    } catch (error) {
      console.warn('VEIKO Shadertoy ml3BWf unavailable:', error)
      setFailed(true)
      return () => {
        if (program) gl.deleteProgram(program)
      }
    }

    const resolution = gl.getUniformLocation(program, 'iResolution')
    const time = gl.getUniformLocation(program, 'iTime')
    const halftonePitch = gl.getUniformLocation(program, 'uHalftonePitch')
    let dotPitch = 5.5

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, preset.maxDpr)
      // CSS transforms animate independently of layout. Reserve the largest
      // displayed size once instead of reallocating the drawing buffer per frame.
      const width = Math.max(2, Math.round(canvas.clientWidth * dpr * resolutionScale))
      const height = Math.max(2, Math.round(canvas.clientHeight * dpr * resolutionScale))
      dotPitch = Math.max(3, 5.5 * width / Math.max(1, canvas.clientWidth))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
        return true
      }
      return false
    }

    const draw = (now = performance.now()) => {
      const runtime = runtimeRef.current
      gl.useProgram(program)
      gl.uniform3f(resolution, canvas.width, canvas.height, 1)
      gl.uniform1f(time, Math.max(0, now - (runtime?.epoch || now)) / 1000)
      gl.uniform1f(halftonePitch, dotPitch)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const loop = (now) => {
      frame = 0
      if (disposed || document.hidden || !visible || !runtimeRef.current?.active) return
      if (nextFrame <= 0 || now >= nextFrame - .25) {
        draw(now)
        // Advance the deadline, not the previous rAF timestamp. Otherwise a
        // 45fps target drifts down to 36fps on a 144Hz display.
        if (nextFrame <= 0) nextFrame = now + preset.frameInterval
        else {
          nextFrame += preset.frameInterval
          if (nextFrame <= now) nextFrame += (Math.floor((now-nextFrame)/preset.frameInterval)+1)*preset.frameInterval
        }
      }
      frame = window.requestAnimationFrame(loop)
    }

    const start = () => {
      if (disposed || frame || document.hidden || !visible || !runtimeRef.current?.active) return
      if (reducedMotion) {
        draw((runtimeRef.current?.epoch || performance.now()) + 3200)
        return
      }
      frame = window.requestAnimationFrame(loop)
    }

    const stop = () => {
      window.cancelAnimationFrame(frame)
      frame = 0
      nextFrame = 0
    }

    runtimeRef.current = { active, draw, epoch: performance.now(), start, stop }
    const resizeObserver = new ResizeObserver(() => {
      const changed = resize()
      if (changed && (!runtimeRef.current?.active || reducedMotion)) draw(performance.now())
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
    draw(performance.now())
    onReady?.()
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
  }, [onReady, resolutionScale, tier])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    const activating = active && !runtime.active
    runtime.active = active
    if (activating) {
      runtime.epoch = performance.now()
      runtime.draw(runtime.epoch)
    }
    if (active) runtime.start()
    else runtime.stop()
  }, [active])

  return <div
    className={`rhine-phases-canvas ${failed ? 'has-fallback' : ''} ${className}`.trim()}
    data-phases-quality={tier}
    data-shadertoy-id="ml3BWf"
    data-shadertoy-source="original-with-monochrome-halftone"
    data-lunar-treatment="monochrome-halftone"
    data-halftone-strength="0.65"
  >
    <canvas ref={canvasRef} role="img" aria-label={`${label} — ${tier} quality`} />
  </div>
})

export default PhasesCanvas
