import { memo, useEffect, useRef, useState } from 'react'

/*
 * A-03 visual study based on the chromatic radial tunnel shown in the supplied
 * tutorial video (28804777927-1-30080.mp4). The watermarked tutorial footage is
 * not shipped; this is a clean native WebGL recreation of its RGB tunnel.
 */
const QUALITY_PRESETS = Object.freeze({
  low: { maxDpr: .62, frameInterval: 1000 / 24, layers: 2 },
  medium: { maxDpr: .86, frameInterval: 1000 / 36, layers: 3 },
  high: { maxDpr: 1.08, frameInterval: 1000 / 50, layers: 3 },
})

const VERTEX_SHADER = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`

const fragmentShader = ({ layers }) => `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
#define LAYERS ${layers}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float glow(vec2 p, float phase, float scale) {
  float z = iTime * .5 + phase;
  p.x *= iResolution.x / iResolution.y;
  float radial = length(p);
  float angle = atan(p.y, p.x);
  float spoke = abs(sin(angle * 5.0 + z * 1.4));
  float pulse = .5 + .5 * sin(z * 2.0 + radial * 18.0);
  float ring = exp(-abs(fract(radial * scale - z * .08) - .5) * 13.0);
  float beam = pow(max(0.0, 1.0 - radial), 3.0) * (0.25 + .75 * spoke);
  return ring * beam * (.42 + .58 * pulse);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - iResolution.xy * .5) / iResolution.y;
  vec3 color = vec3(0.0);
  float t = iTime * .22;
  for (int i = 0; i < LAYERS; i++) {
    float layer = float(i);
    float scale = 8.0 + layer * 4.0;
    vec2 drift = vec2(cos(t + layer), sin(t * .8 + layer)) * .012;
    color.r += glow(uv + drift + vec2(.008, 0.0), 0.0 + layer * .7, scale) * 1.10;
    color.g += glow(uv + drift, 2.1 + layer * .7, scale) * .84;
    color.b += glow(uv + drift - vec2(.008, 0.0), 4.2 + layer * .7, scale) * 1.22;
  }
  float core = exp(-length(uv) * 22.0);
  color += vec3(1.0, .86, .72) * core * .65;
  color *= 1.0 - smoothstep(.63, 1.08, length(uv));
  color = color / (1.0 + color * .7);
  gl_FragColor = vec4(pow(max(color, 0.0), vec3(.86)), 1.0);
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

function createProgram(gl, preset) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader(preset))
  const program = gl.createProgram()
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program)
  gl.deleteShader(vertex); gl.deleteShader(fragment)
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program
  const message = gl.getProgramInfoLog(program) || 'Shader program linking failed.'
  gl.deleteProgram(program)
  throw new Error(message)
}

export const ChromaticTunnelCanvas = memo(function ChromaticTunnelCanvas({ active = true, className = '', fallback, label = 'Live chromatic radial tunnel', quality = 'auto' }) {
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
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, desynchronized: true, powerPreference: tier === 'high' ? 'high-performance' : 'default', preserveDrawingBuffer: false, stencil: false })
    if (!gl) { setFailed(true); return undefined }
    let program, buffer, frame = 0, lastFrame = 0, visible = true, disposed = false
    const startedAt = performance.now()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    try {
      program = createProgram(gl, preset)
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      gl.useProgram(program)
      const position = gl.getAttribLocation(program, 'aPosition')
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    } catch (error) {
      console.warn('VEIKO chromatic tunnel unavailable:', error); setFailed(true)
      return () => { if (program) gl.deleteProgram(program); if (buffer) gl.deleteBuffer(buffer) }
    }
    const resolution = gl.getUniformLocation(program, 'iResolution')
    const time = gl.getUniformLocation(program, 'iTime')
    const resize = () => {
      const rect = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, preset.maxDpr)
      const width = Math.max(2, Math.round(rect.width * dpr)); const height = Math.max(2, Math.round(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height) }
    }
    const draw = (now = performance.now()) => { resize(); gl.useProgram(program); gl.uniform2f(resolution, canvas.width, canvas.height); gl.uniform1f(time, 10 + (now - startedAt) / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3) }
    const loop = (now) => { frame = 0; if (disposed || document.hidden || !visible || !runtimeRef.current?.active) return; if (now - lastFrame >= preset.frameInterval) { lastFrame = now; draw(now) }; frame = window.requestAnimationFrame(loop) }
    const start = () => { if (disposed || frame || document.hidden || !visible || !runtimeRef.current?.active) return; if (reducedMotion) { draw(startedAt + 7200); return }; frame = window.requestAnimationFrame(loop) }
    const stop = () => { window.cancelAnimationFrame(frame); frame = 0 }
    runtimeRef.current = { active, start, stop, draw }
    const resizeObserver = new ResizeObserver(() => { resize(); if (!active || reducedMotion) draw(reducedMotion ? startedAt + 7200 : performance.now()) })
    const intersectionObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); else stop() }, { threshold: 0 })
    const onVisibility = () => document.hidden ? stop() : start()
    const onContextLost = (event) => { event.preventDefault(); stop(); setFailed(true) }
    resizeObserver.observe(canvas); intersectionObserver.observe(canvas); document.addEventListener('visibilitychange', onVisibility); canvas.addEventListener('webglcontextlost', onContextLost)
    draw(reducedMotion ? startedAt + 7200 : startedAt); start()
    return () => { disposed = true; stop(); resizeObserver.disconnect(); intersectionObserver.disconnect(); document.removeEventListener('visibilitychange', onVisibility); canvas.removeEventListener('webglcontextlost', onContextLost); gl.deleteBuffer(buffer); gl.deleteProgram(program); if (runtimeRef.current?.draw === draw) runtimeRef.current = null }
  }, [active, tier])

  useEffect(() => { const runtime = runtimeRef.current; if (!runtime) return; runtime.active = active; if (active) runtime.start(); else runtime.stop() }, [active])

  return <div className={`rhine-chromatic-tunnel ${failed ? 'has-fallback' : ''} ${className}`.trim()} data-chromatic-quality={tier} data-source-video="28804777927-1-30080.mp4">
    {fallback && <img className="rhine-chromatic-fallback" src={fallback} alt="" />}
    <canvas ref={canvasRef} role="img" aria-label={`${label} — ${tier} quality`} />
  </div>
})

export default ChromaticTunnelCanvas
