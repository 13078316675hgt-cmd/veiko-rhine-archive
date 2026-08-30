import { memo, useEffect, useRef, useState } from 'react'

/*
 * A-02 visual adapted from “Path to the colorful infinity” by Benoit Marini.
 * Source: https://www.shadertoy.com/view/WtjyzR
 * License: CC BY-NC-SA 3.0 — https://creativecommons.org/licenses/by-nc-sa/3.0/
 * Changes: native WebGL runtime, responsive quality tiers, lifecycle controls,
 * fallback handling, VEIKO framing, and black/white/orange brand color grading.
 */

const QUALITY_PRESETS = Object.freeze({
  low: { layerCount: 9, layerNorm: 8, iterations: 14, maxDpr: .72, frameInterval: 1000 / 30 },
  medium: { layerCount: 13, layerNorm: 12, iterations: 19, maxDpr: 1, frameInterval: 1000 / 45 },
  high: { layerCount: 17, layerNorm: 16, iterations: 23, maxDpr: 1.35, frameInterval: 1000 / 60 },
})

const VERTEX_SHADER = `
attribute vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const fragmentShader = ({ layerCount, layerNorm, iterations }) => `
precision highp float;

uniform vec2 iResolution;
uniform float iTime;

#define LAYER_COUNT ${layerCount}
#define LAYER_NORM ${layerNorm}.0
#define ITER ${iterations}

vec4 tunnelField(vec3 p) {
  float t = iTime + 78.0;
  vec4 o = vec4(p.xyz, 3.0 * sin(t * 0.1));
  vec4 dec = vec4(1.0, 0.9, 0.1, 0.15) + vec4(0.06 * cos(t * 0.1), 0.0, 0.0, 0.14 * cos(t * 0.23));

  for (int iteration = 0; iteration < ITER; iteration++) {
    o.xzyw = abs(o / max(dot(o, o), 0.00001) - dec);
  }

  return o;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - iResolution.xy * 0.5) / iResolution.y;
  vec3 color = vec3(0.0);
  float t = iTime * 0.3;

  for (int layer = 0; layer < LAYER_COUNT; layer++) {
    float i = float(layer) / LAYER_NORM;
    float depth = fract(i + t);
    float scale = mix(5.0, 0.5, depth);
    float fade = depth * (1.0 - smoothstep(0.9, 1.0, depth));
    color += tunnelField(vec3(uv * scale, i * 4.0)).xyz * fade;
  }

  color /= LAYER_NORM;
  color *= vec3(2.0, 1.0, 2.0);
  color = pow(max(color, 0.0), vec3(0.5));

  float energy = dot(color, vec3(0.46, 0.37, 0.17));
  float compressed = energy / (1.0 + energy);
  float density = pow(smoothstep(0.20, 0.72, compressed), 1.72);
  float whiteHeat = smoothstep(0.58, 0.96, density);
  vec3 signalPink = vec3(1.0, 0.08, 0.38) * density * 1.12;
  vec3 laboratoryWhite = vec3(0.95, 0.91, 1.0) * density * 1.08;
  color = mix(signalPink, laboratoryWhite, whiteHeat);
  color += vec3(1.0, 0.24, 0.62) * pow(density, 3.2) * 0.18;
  color *= 1.0 - smoothstep(0.08, 1.28, length(uv));
  color = color / (1.0 + color * 0.24);
  gl_FragColor = vec4(pow(max(color, 0.0), vec3(0.92)), 1.0);
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

function createProgram(gl, preset) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader(preset))
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
      program = createProgram(gl, preset)
      buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      gl.useProgram(program)
      const position = gl.getAttribLocation(program, 'aPosition')
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    } catch (error) {
      console.warn('Rhine fractal tunnel unavailable:', error)
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
      resize()
      gl.useProgram(program)
      gl.uniform2f(resolution, canvas.width, canvas.height)
      gl.uniform1f(time, 18 + (now - startedAt) / 1000)
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
      if (!active || reducedMotion) draw(reducedMotion ? startedAt + 7200 : performance.now())
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
  }, [active, tier])

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
          title="Path to the colorful infinity — Benoit Marini — CC BY-NC-SA 3.0 — adapted for VEIKO"
        >WTJYZR / BENOIT M. / {tier.toUpperCase()}</a>}
  </div>
})

export default FractalTunnelCanvas
