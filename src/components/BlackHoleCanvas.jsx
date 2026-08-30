import { memo, useEffect, useRef, useState } from 'react'

const QUALITY_PRESETS = Object.freeze({
  low: { maxDpr: .62, frameInterval: 1000 / 22, raySteps: 64, starLayers: 1 },
  medium: { maxDpr: .82, frameInterval: 1000 / 30, raySteps: 74, starLayers: 2 },
  high: { maxDpr: 1.02, frameInterval: 1000 / 42, raySteps: 88, starLayers: 2 },
})

const VERTEX_SHADER = `
attribute vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

// Browser adaptation of baopinshui/NPGS's Kerr-Newman rendering pipeline.
// Source: https://github.com/baopinshui/NPGS
// NPGS is licensed under GNU GPL v3.0. This port preserves the ray-bending,
// Kerr frame-dragging, charged-horizon, thermal disk, Doppler/gravitational
// frequency-shift, escaped-sky sampling and bloom stages in a WebGL-safe pass.
const fragmentShader = ({ raySteps, starLayers }) => `
precision highp float;

uniform vec2 iResolution;
uniform float iTime;

#define RAY_STEPS ${raySteps}
#define STAR_LAYERS ${starLayers}

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float MASS = 1.0;
const float SPIN = 0.79;
const float CHARGE = 0.16;
const float SCHWARZSCHILD_RADIUS = 2.0 * MASS;
const float HORIZON = MASS + sqrt(MASS * MASS - SPIN * SPIN - CHARGE * CHARGE);
const float DISK_INNER = 2.18;
const float DISK_OUTER = 5.85;

mat2 rotate2d(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float hash21(vec2 point) {
  point = fract(point * vec2(123.34, 456.21));
  point += dot(point, point + 45.32);
  return fract(point.x * point.y);
}

float noise21(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);
  float a = hash21(cell);
  float b = hash21(cell + vec2(1.0, 0.0));
  float c = hash21(cell + vec2(0.0, 1.0));
  float d = hash21(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

float fbm(vec2 point) {
  float value = 0.0;
  float amplitude = 0.54;
  for (int octave = 0; octave < 4; octave++) {
    value += amplitude * noise21(point);
    point = rotate2d(0.83) * point * 2.03 + vec2(7.1, 3.7);
    amplitude *= 0.49;
  }
  return value;
}

float starLayer(vec2 point, float scale, float threshold) {
  vec2 grid = point * scale;
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - 0.5;
  float seed = hash21(cell);
  float size = mix(0.035, 0.12, seed);
  float sparkle = smoothstep(size, 0.0, length(local));
  return sparkle * smoothstep(threshold, 1.0, seed);
}

vec3 escapedSky(vec3 direction) {
  direction = normalize(direction);
  vec2 spherical = vec2(
    atan(direction.z, direction.x) / TAU + 0.5,
    asin(clamp(direction.y, -1.0, 1.0)) / PI + 0.5
  );
  float galactic = exp(-pow(abs(direction.y + 0.12 * sin(direction.x * 4.0)), 2.0) * 54.0);
  float dust = fbm(spherical * vec2(12.0, 5.0) + vec2(2.7, 8.2));
  vec3 color = vec3(0.0008, 0.0015, 0.0032);
  color += vec3(0.018, 0.028, 0.052) * galactic * mix(0.18, 0.82, dust);
  float field = starLayer(spherical, 188.0, 0.988);
#if STAR_LAYERS > 1
  field += 0.48 * starLayer(spherical + vec2(0.137, 0.311), 347.0, 0.994);
#endif
  float chroma = hash21(floor(spherical * 188.0) + 19.0);
  vec3 starColor = mix(vec3(0.58, 0.72, 1.0), vec3(1.0, 0.98, 0.92), chroma);
  return color + field * starColor * 1.35;
}

vec3 thermalDisk(vec3 point, vec3 rayDirection, float time, out float opacity) {
  float radius = length(point.xz);
  float radialMask = smoothstep(DISK_INNER, DISK_INNER + 0.24, radius)
    * (1.0 - smoothstep(DISK_OUTER - 0.82, DISK_OUTER, radius));
  float azimuth = atan(point.z, point.x);
  float orbitalPhase = azimuth - time * (0.22 + 2.5 / pow(max(radius, DISK_INNER), 1.5));
  float turbulence = fbm(vec2(radius * 1.74 - time * 0.18, orbitalPhase * 2.25));
  float fine = noise21(vec2(radius * 8.7 + time * 0.24, orbitalPhase * 7.0));
  float filament = smoothstep(0.24, 0.86, mix(turbulence, fine, 0.31));
  float novikovThorne = max(0.0, (1.0 - sqrt(DISK_INNER / max(radius, DISK_INNER))) / pow(radius, 3.0));
  float heat = pow(novikovThorne * 920.0, 0.25);

  vec3 orbitalDirection = normalize(vec3(-point.z, 0.0, point.x));
  float beta = min(0.58, 0.34 * sqrt(DISK_INNER / max(radius - HORIZON * 0.32, 0.72)));
  float gammaInverse = sqrt(max(0.12, 1.0 - beta * beta));
  float doppler = gammaInverse / max(0.34, 1.0 - beta * dot(orbitalDirection, -rayDirection));
  float gravitationalShift = sqrt(max(0.08, 1.0 - HORIZON / max(radius, HORIZON + 0.01)));
  float frequencyShift = clamp(doppler * gravitationalShift * 1.34, 0.42, 1.82);

  vec3 coolBlue = vec3(0.20, 0.48, 1.05);
  vec3 plasmaWhite = vec3(0.93, 1.04, 1.16);
  vec3 shiftedBlue = vec3(0.32, 0.76, 1.42);
  vec3 spectrum = mix(coolBlue, plasmaWhite, smoothstep(0.38, 1.08, heat));
  spectrum = mix(spectrum, shiftedBlue, smoothstep(1.02, 1.62, frequencyShift));
  spectrum *= pow(frequencyShift, 2.35);

  float lanes = 0.52 + 0.82 * filament;
  lanes *= 0.82 + 0.18 * sin(radius * 17.0 - orbitalPhase * 2.0 + fine * 5.0);
  opacity = clamp(radialMask * lanes * (0.34 + heat * 0.34), 0.0, 0.78);
  return spectrum * opacity * (0.30 + heat * 0.78);
}

vec3 secondaryLensedDisk(vec2 point, float time, out float signal) {
  float radius = length(point);
  float angle = atan(point.y, point.x);
  float upperArc = exp(-abs(radius - 0.175) * 96.0) * smoothstep(-0.07, 0.11, point.y);
  float lowerArc = exp(-abs(radius - 0.168) * 112.0) * (1.0 - smoothstep(-0.08, 0.018, point.y)) * 0.42;
  float textureFlow = fbm(vec2(angle * 3.4 - time * 0.28, radius * 36.0));
  float structure = 0.58 + 0.62 * smoothstep(0.28, 0.82, textureFlow);
  float approaching = smoothstep(-0.82, 0.72, point.x / max(radius, 0.001));
  vec3 spectrum = mix(vec3(0.28, 0.62, 1.28), vec3(0.94, 1.04, 1.15), approaching);
  signal = (upperArc + lowerArc) * structure;
  return spectrum * signal * mix(0.88, 1.26, approaching);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - iResolution.xy * 0.5) / iResolution.y;
  uv.x -= 0.025;
  float time = iTime * 0.44;

  vec3 cameraPosition = vec3(0.46, 3.75, 23.0);
  vec3 forward = normalize(-cameraPosition);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = normalize(cross(right, forward));
  vec3 rayDirection = normalize(forward + right * uv.x * 0.62 + up * uv.y * 0.62);
  vec3 rayPosition = cameraPosition;

  vec3 diskEmission = vec3(0.0);
  float transmittance = 1.0;
  float diskSignal = 0.0;
  float minimumRadius = 1000.0;
  float totalTurn = 0.0;
  bool captured = false;

  for (int stepIndex = 0; stepIndex < RAY_STEPS; stepIndex++) {
    float radius = length(rayPosition);
    minimumRadius = min(minimumRadius, radius);
    if (radius <= HORIZON * 1.012) {
      captured = true;
      break;
    }
    if (radius > 26.5 && stepIndex > 16 && dot(rayPosition, rayDirection) > 0.0) break;

    vec3 radial = rayPosition / max(radius, 0.0001);
    float incidence = dot(rayDirection, radial);
    float tangentAmount = sqrt(max(0.0, 1.0 - incidence * incidence));
    vec3 bendDirection = -radial + rayDirection * incidence;
    bendDirection /= max(length(bendDirection), 0.0001);

    float stepSize = mix(0.032, 0.58, smoothstep(HORIZON, 20.0, radius));
    float chargedAttenuation = max(0.52, 1.0 - CHARGE * CHARGE / max(radius * radius, 0.01));
    float curvature = 1.62 * SCHWARZSCHILD_RADIUS / max(radius * radius, 0.08);
    curvature *= chargedAttenuation * (0.34 + 0.66 * tangentAmount * tangentAmount);
    vec3 frameDrag = cross(vec3(0.0, 1.0, 0.0), radial)
      * (SPIN * SCHWARZSCHILD_RADIUS / max(radius * radius * radius, 0.12));
    vec3 nextDirection = normalize(rayDirection + (bendDirection * curvature + frameDrag * 0.76) * stepSize);
    totalTurn += length(nextDirection - rayDirection);
    vec3 nextPosition = rayPosition + nextDirection * stepSize;

    if (rayPosition.y * nextPosition.y < 0.0) {
      float crossing = rayPosition.y / (rayPosition.y - nextPosition.y);
      vec3 diskPoint = mix(rayPosition, nextPosition, crossing);
      float diskRadius = length(diskPoint.xz);
      if (diskRadius > DISK_INNER && diskRadius < DISK_OUTER && transmittance > 0.025) {
        float opacity = 0.0;
        vec3 sampleColor = thermalDisk(diskPoint, nextDirection, time, opacity);
        diskEmission += sampleColor * transmittance;
        diskSignal += opacity * transmittance;
        transmittance *= 1.0 - opacity * 0.76;
      }
    }

    rayDirection = nextDirection;
    rayPosition = nextPosition;
  }

  vec3 sky = captured ? vec3(0.0) : escapedSky(rayDirection);
  vec3 color = sky * transmittance + diskEmission;

  float secondarySignal = 0.0;
  vec3 secondaryDisk = secondaryLensedDisk(uv, time, secondarySignal);
  color += secondaryDisk;
  diskSignal += secondarySignal;

  float photonOrbit = exp(-abs(minimumRadius - 2.58) * 15.0);
  photonOrbit *= smoothstep(0.34, 1.35, totalTurn);
  float asymmetricRing = 0.72 + 0.28 * smoothstep(-0.8, 0.85, uv.x / max(length(uv), 0.001));
  vec3 ringColor = mix(vec3(0.48, 0.72, 1.18), vec3(0.98, 1.05, 1.12), asymmetricRing);
  color += ringColor * photonOrbit * asymmetricRing * 0.72;

  float bloom = pow(clamp(diskSignal * 0.66 + photonOrbit * 0.32, 0.0, 1.8), 1.22);
  color += vec3(0.20, 0.42, 0.82) * bloom * 0.24;
  color += vec3(0.74, 0.90, 1.12) * bloom * bloom * 0.18;

  float vignette = smoothstep(1.02, 0.20, length(uv * vec2(0.76, 1.0)));
  color *= 0.72 + 0.28 * vignette;
  color = color / (1.0 + color * 0.64);
  color = pow(max(color, 0.0), vec3(0.82));
  gl_FragColor = vec4(color, 1.0);
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

export const BlackHoleCanvas = memo(function BlackHoleCanvas({
  active = true,
  className = '',
  fallback,
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
      console.warn('Rhine black hole visual unavailable:', error)
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
      gl.uniform1f(time, 11 + (now - startedAt) / 1000)
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
        draw(startedAt + 6400)
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
      if (!active || reducedMotion) draw(reducedMotion ? startedAt + 6400 : performance.now())
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
    draw(reducedMotion ? startedAt + 6400 : startedAt)
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
    className={`${className} ${failed ? 'has-fallback' : ''}`.trim()}
    data-black-hole-model="npgs-kerr-newman"
    data-black-hole-quality={tier}
  >
    {fallback && <img className="rhine-blackhole-fallback" src={fallback} alt="" />}
    <canvas ref={canvasRef} role="img" aria-label="Kerr-Newman black hole with a gravitationally lensed white-blue accretion disk" />
  </div>
})

export default BlackHoleCanvas
