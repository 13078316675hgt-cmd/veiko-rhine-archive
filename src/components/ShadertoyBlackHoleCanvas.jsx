import { memo, useEffect, useRef, useState } from 'react'

/*
 * VEIKO tail visual adapted from the supplied Shadertoy reference:
 * https://www.shadertoy.com/view/wXdfzj
 *
 * This is a small native WebGL port rather than an iframe embed. It keeps the
 * visual language of the reference while adding responsive quality tiers,
 * visibility-aware rendering and an image fallback for older browsers.
 */
const QUALITY_PRESETS = Object.freeze({
  low: { maxDpr: .62, frameInterval: 1000 / 24, samples: 34 },
  medium: { maxDpr: .86, frameInterval: 1000 / 36, samples: 46 },
  high: { maxDpr: 1.08, frameInterval: 1000 / 50, samples: 58 },
})

const VERTEX_SHADER = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`

const fragmentShader = ({ samples }) => `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
#define SAMPLES ${samples}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise21(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0, amp = 0.55;
  for (int i = 0; i < 4; i++) {
    value += amp * noise21(p);
    p = p * 2.03 + vec2(7.1, 3.7);
    amp *= 0.48;
  }
  return value;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - iResolution.xy * 0.5) / iResolution.y;
  float t = iTime * 0.32;
  float r = length(uv);
  float a = atan(uv.y, uv.x);

  // Gentle gravitational lensing around the central event horizon.
  float lens = 1.0 + 0.14 / max(r * r, 0.045);
  vec2 warped = uv * lens;
  float wr = length(warped);
  float wa = atan(warped.y, warped.x);

  vec3 color = vec3(0.002, 0.003, 0.008);
  float stars = step(0.9975, hash21(floor(warped * 180.0))) * (1.0 - smoothstep(.65, 1.45, r));
  color += vec3(.34, .42, .62) * stars * (0.25 + 0.75 * hash21(floor(warped * 180.0) + 4.0));

  // Fast, bounded integration through a warped polar accretion disk.
  float disk = 0.0;
  float heat = 0.0;
  for (int i = 0; i < SAMPLES; i++) {
    float fi = float(i) / float(SAMPLES - 1);
    float radius = mix(0.19, 0.98, fi);
    float spiral = wa + t * (1.8 - radius) + radius * 5.6;
    float turbulence = fbm(vec2(cos(spiral), sin(spiral)) * (5.0 + radius * 8.0) + vec2(t, -t));
    float band = exp(-pow((wr - radius) * (17.0 + turbulence * 10.0), 2.0));
    float filament = 0.35 + 0.65 * smoothstep(.18, .86, turbulence);
    float attenuation = (1.0 - fi * .72) * (0.55 + 0.45 * cos(spiral * 2.0));
    disk += band * filament * attenuation;
    heat += band * (1.0 - fi) * filament;
  }
  disk /= float(SAMPLES);
  heat /= float(SAMPLES);

  float ring = exp(-pow((r - .27) * 25.0, 2.0));
  float horizon = 1.0 - smoothstep(.165, .205, r);
  vec3 pink = vec3(1.0, .08, .32);
  vec3 violet = vec3(.46, .08, .95);
  vec3 gold = vec3(1.0, .48, .10);
  vec3 diskColor = mix(violet, pink, smoothstep(.05, .65, heat));
  diskColor = mix(diskColor, gold, smoothstep(.62, 1.0, heat));
  color += diskColor * disk * 7.6;
  color += vec3(1.0, .18, .43) * ring * .85;
  color *= 1.0 - horizon;
  color += vec3(.12, .015, .05) * exp(-r * 3.0) * (1.0 - horizon);
  color *= 1.0 - smoothstep(.72, 1.2, r);
  color = color / (1.0 + color);
  gl_FragColor = vec4(pow(max(color, 0.0), vec3(.88)), 1.0);
}
`

function chooseQuality(requested) {
  if (requested !== 'auto' && QUALITY_PRESETS[requested]) return requested
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

export const ShadertoyBlackHoleCanvas = memo(function ShadertoyBlackHoleCanvas({
  active = true,
  className = '',
  fallback,
  label = 'Live pink-accretion black hole visual',
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
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      desynchronized: true,
      powerPreference: tier === 'high' ? 'high-performance' : 'default',
      preserveDrawingBuffer: false,
      stencil: false,
    })
    if (!gl) { setFailed(true); return undefined }

    let program, buffer, frame = 0, lastFrame = 0, visible = true, disposed = false
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
      console.warn('VEIKO Shadertoy black hole unavailable:', error)
      setFailed(true)
      return () => { if (program) gl.deleteProgram(program); if (buffer) gl.deleteBuffer(buffer) }
    }

    const resolution = gl.getUniformLocation(program, 'iResolution')
    const time = gl.getUniformLocation(program, 'iTime')
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, preset.maxDpr)
      const width = Math.max(2, Math.round(rect.width * dpr))
      const height = Math.max(2, Math.round(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height)
      }
    }
    const draw = (now = performance.now()) => {
      resize(); gl.useProgram(program)
      gl.uniform2f(resolution, canvas.width, canvas.height)
      gl.uniform1f(time, 12 + (now - startedAt) / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    const loop = (now) => {
      frame = 0
      if (disposed || document.hidden || !visible || !runtimeRef.current?.active) return
      if (now - lastFrame >= preset.frameInterval) { lastFrame = now; draw(now) }
      frame = window.requestAnimationFrame(loop)
    }
    const start = () => {
      if (disposed || frame || document.hidden || !visible || !runtimeRef.current?.active) return
      if (reducedMotion) { draw(startedAt + 7200); return }
      frame = window.requestAnimationFrame(loop)
    }
    const stop = () => { window.cancelAnimationFrame(frame); frame = 0 }
    runtimeRef.current = { active, start, stop, draw }
    const resizeObserver = new ResizeObserver(() => { resize(); if (!active || reducedMotion) draw(reducedMotion ? startedAt + 7200 : performance.now()) })
    const intersectionObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); else stop() }, { threshold: 0 })
    const onVisibility = () => document.hidden ? stop() : start()
    const onContextLost = (event) => { event.preventDefault(); stop(); setFailed(true) }
    resizeObserver.observe(canvas); intersectionObserver.observe(canvas)
    document.addEventListener('visibilitychange', onVisibility); canvas.addEventListener('webglcontextlost', onContextLost)
    draw(reducedMotion ? startedAt + 7200 : startedAt); start()
    return () => {
      disposed = true; stop(); resizeObserver.disconnect(); intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility); canvas.removeEventListener('webglcontextlost', onContextLost)
      gl.deleteBuffer(buffer); gl.deleteProgram(program)
      if (runtimeRef.current?.draw === draw) runtimeRef.current = null
    }
  }, [active, tier])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    runtime.active = active
    if (active) runtime.start(); else runtime.stop()
  }, [active])

  return <div
    className={`rhine-shadertoy-blackhole ${failed ? 'has-fallback' : ''} ${className}`.trim()}
    data-black-hole-model="shadertoy-wxdfzj"
    data-black-hole-quality={tier}
  >
    {fallback && <img className="rhine-blackhole-fallback" src={fallback} alt="" />}
    <canvas ref={canvasRef} role="img" aria-label={`${label} — ${tier} quality`} />
  </div>
})

export default ShadertoyBlackHoleCanvas
