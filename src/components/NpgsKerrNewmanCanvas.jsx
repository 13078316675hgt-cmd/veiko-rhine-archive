import { memo, useEffect, useRef, useState } from 'react'
import blackHolePrepassSource from '../vendor/npgs-generated/BlackHole_prepass.optimized.frag.glsl?raw'
import blackHoleCompositeSource from '../vendor/npgs-generated/BlackHole_composite.optimized.frag.glsl?raw'
import bloomSource from '../vendor/npgs/Bloom.frag.glsl?raw'
import colorBlendSource from '../vendor/npgs/ColorBlend.frag.glsl?raw'
import screenQuadSource from '../vendor/npgs/ScreenQuad.vert.glsl?raw'

// The shader files imported above are unmodified upstream NPGS sources.
// This module only adapts Vulkan GLSL declarations and pass scheduling to
// WebGL2; the Kerr-Newman equations, ray integrator and post chain stay in the
// original source files.

const CUBE_MAPS = Object.freeze([
  ['iBackground0', 'Universe0Skybox'],
  ['iAntiground0', 'Antiverse0Skybox'],
  ['iBackground1', 'Universe1Skybox'],
  ['iAntiground1', 'Antiverse1Skybox'],
  ['iBackground2', 'Universe2Skybox'],
  ['iAntiground2', 'Antiverse2Skybox'],
])

const CUBE_FACES = Object.freeze([
  ['PosX', 'TEXTURE_CUBE_MAP_POSITIVE_X'],
  ['NegX', 'TEXTURE_CUBE_MAP_NEGATIVE_X'],
  ['PosY', 'TEXTURE_CUBE_MAP_POSITIVE_Y'],
  ['NegY', 'TEXTURE_CUBE_MAP_NEGATIVE_Y'],
  ['PosZ', 'TEXTURE_CUBE_MAP_POSITIVE_Z'],
  ['NegZ', 'TEXTURE_CUBE_MAP_NEGATIVE_Z'],
])

const CAMERA_TO_WORLD = new Float32Array([
  1, 0, 0, 0,
  0, 0.573576, -0.819152, 0,
  0, 0.819152, 0.573576, 0,
  0, 0, 0, 1,
])

const DEFAULT_UNIFORMS = Object.freeze({
  iInverseCamRot: CAMERA_TO_WORLD,
  iBlackHoleRelativePosRs: [0, 0, -64.5, 1],
  iBlackHoleRelativeDiskNormal: [0, 0.573576, 0.819152, 0],
  iBlackHoleRelativeDiskTangen: [1, 0, 0, 0],
  iCameraVelocity: [0, 0, 0, 0],
  ie1_up: [1, 0, 0, 0],
  ie2_up: [0, 1, 0, 0],
  ie3_up: [0, 0, 1, 0],
  iU_up: [0, 0, 0, 1],
  iCamDataCoordisOutgoing: 1,
  iDEBUG: 0,
  iPrepass: 1,
  iWhitehole: 0,
  iInWhichUniverse: 0,
  iGrid: 0,
  iEnableHeatHaze: 0,
  iEnableShadowCulling: 0,
  iObserverMode: 0,
  iPolarization: 0,
  iUseImageDisk: 0,
  iQuality: 1,
  iUniverseSign: 1,
  iBlackHoleMassSol: 1.49e7,
  iSpin: 0.998,
  iQ: 0,
  iMu: 1,
  iAccretionRate: 1e-12,
  iBackShiftMax: 1.5,
  iDensestarsurfaceR: 0,
  iDensestarBlackbodyIntensityExponent: 4,
  iDensestarRedShiftColorExponent: 1,
  iDensestarRedShiftIntensityExponent: 4,
  iDensestarBrightmut: 1,
  iInterRadiusRs: 2.0,
  iOuterRadiusRs: 25,
  iThinRs: 0.75,
  iHopper: 0.4,
  iBrightmut: 1,
  iDarkmut: 0.5,
  iReddening: 0.3,
  iSaturation: 0.5,
  iBlackbodyIntensityExponent: 1,
  iRedShiftColorExponent: 1,
  iRedShiftIntensityExponent: 4,
  iImageRotationSpeed: 0.007808,
  iPolarizationAngle: 0,
  iHeatHaze: 0,
  iBackgroundBrightmut: 2,
  iPhotonRingBoost: 0,
  iPhotonRingColorTempBoost: 0,
  iBoostRot: 0,
  iJetRedShiftIntensityExponent: 4,
  iJetBrightmut: 1,
  iJetSaturation: 0,
  iJetShiftMax: 3,
  iBlendWeight: 0.16,
})

function shaderBody(source) {
  return source
    .replace(/^#version[^\n]*\n/gm, '')
    .replace(/^#pragma[^\n]*\n/gm, '')
    .replace(/^#extension[^\n]*\n/gm, '')
    .replace(/^#include[^\n]*\n/gm, '')
}

const GLSL_HEADER = '#version 300 es\nprecision highp float;\nprecision highp int;\n'
const VERTEX_SOURCE = `${GLSL_HEADER}${shaderBody(screenQuadSource)
  .replace(/layout\(location\s*=\s*\d+\)\s*/g, '')
  .replace(/out\s+gl_PerVertex\s*\{[\s\S]*?\};/, '')}`
const PREPASS_SOURCE = blackHolePrepassSource
const COMPOSITE_SOURCE = blackHoleCompositeSource

function adaptBloom(definition) {
  let source = shaderBody(bloomSource)
    .replace(/layout\(location\s*=\s*0\)\s*out/, 'out')
    .replace(/layout\(push_constant\)\s*uniform\s+PushConstant\s*\{[\s\S]*?\};/, 'uniform bool ibHorizontal;')
    .replace(/layout\(set\s*=\s*0,\s*binding\s*=\s*0\)\s*uniform\s+GameArgs\s*\{[\s\S]*?\};/, 'uniform vec2 iResolution;')
    .replace(/layout\(set\s*=\s*\d+,\s*binding\s*=\s*\d+\)\s*uniform\s+/g, 'uniform ')
    .replace(/float\s+(\w+)\[5\]\s*=\s*\{([^}]+)\};/g, 'float $1[5] = float[5]($2);')
  return `${GLSL_HEADER}#define ${definition}\n${source}`
}

let blendSource = shaderBody(colorBlendSource)
  .replace(/layout\(location\s*=\s*0\)\s*out/, 'out')
  .replace(/layout\(set\s*=\s*0,\s*binding\s*=\s*0\)\s*uniform\s+GameArgs\s*\{[\s\S]*?\};/, 'uniform vec2 iResolution;')
  .replace(/layout\(set\s*=\s*\d+,\s*binding\s*=\s*\d+\)\s*uniform\s+/g, 'uniform ')
const BLOOM_TREE_SOURCE = adaptBloom('GENERATE_MIPMAP')
const BLOOM_BLUR_SOURCE = adaptBloom('GAUSS_BLUR')
const BLEND_SOURCE = `${GLSL_HEADER}${blendSource}`

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return shader
}

async function program(gl, fragmentSource, label) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SOURCE)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const result = gl.createProgram()
  gl.attachShader(result, vertex)
  gl.attachShader(result, fragment)
  gl.bindAttribLocation(result, 0, 'Position')
  gl.bindAttribLocation(result, 1, 'TexCoord')
  gl.linkProgram(result)

  const parallelCompile = gl.getExtension('KHR_parallel_shader_compile')
  if (parallelCompile) {
    gl.flush()
    // The upstream Kerr-Newman composite is exceptionally large. ANGLE can
    // legitimately need more than a minute to finish it on integrated GPUs;
    // keep waiting for the real program instead of substituting another image.
    const parallelDeadline = performance.now() + 240000
    while (!gl.getProgramParameter(result, parallelCompile.COMPLETION_STATUS_KHR) && performance.now() < parallelDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 16))
    }
    if (!gl.getProgramParameter(result, parallelCompile.COMPLETION_STATUS_KHR)) throw new Error(`${label} parallel compilation timed out`)
  }
  if (!gl.getShaderParameter(vertex, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(vertex) || `${label} vertex compilation failed`
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    gl.deleteProgram(result)
    throw new Error(`${label} vertex: ${error}`)
  }
  if (!gl.getShaderParameter(fragment, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(fragment) || `${label} fragment compilation failed`
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    gl.deleteProgram(result)
    throw new Error(`${label} fragment: ${error}`)
  }
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(result) || `${label} linking failed`
    gl.deleteProgram(result)
    throw new Error(`${label}: ${error}`)
  }
  return result
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Unable to load ${url}`))
    image.src = url
  })
}

async function cubeTexture(gl, base, directory) {
  const extension = directory.startsWith('Anti') ? 'jpg' : 'jpg'
  const images = await Promise.all(CUBE_FACES.map(([face]) => loadImage(`${base}assets/npgs-kerr-newman/${directory}/${face}.${extension}`)))
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  CUBE_FACES.forEach(([, targetName], index) => {
    gl.texImage2D(gl[targetName], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[index])
  })
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP)
  return texture
}

async function imageTexture(gl, base) {
  const image = await loadImage(`${base}assets/npgs-kerr-newman/nw.png`)
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  return texture
}

function texture2d(gl, width, height, filter = gl.LINEAR) {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return texture
}

function framebuffer(gl, textures) {
  const fbo = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  textures.forEach((texture, index) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, texture, 0))
  if (textures.length > 1) gl.drawBuffers(textures.map((_, index) => gl.COLOR_ATTACHMENT0 + index))
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('NPGS framebuffer is incomplete')
  return fbo
}

function deleteTarget(gl, target) {
  if (!target) return
  target.textures?.forEach((texture) => gl.deleteTexture(texture))
  if (target.fbo) gl.deleteFramebuffer(target.fbo)
}

function createTargets(gl, width, height) {
  const halfWidth = Math.max(2, Math.floor(width * 0.5))
  const halfHeight = Math.max(2, Math.floor(height * 0.5))
  const distortion = texture2d(gl, halfWidth, halfHeight, gl.NEAREST)
  const volumetric = texture2d(gl, halfWidth, halfHeight, gl.LINEAR)
  const sceneA = texture2d(gl, width, height)
  const sceneB = texture2d(gl, width, height)
  const bloomA = texture2d(gl, width, height)
  const bloomB = texture2d(gl, width, height)
  return {
    width, height, halfWidth, halfHeight,
    prepass: { textures: [distortion, volumetric], fbo: framebuffer(gl, [distortion, volumetric]) },
    scene: { textures: [sceneA], fbo: framebuffer(gl, [sceneA]) },
    history: { textures: [sceneB], fbo: framebuffer(gl, [sceneB]) },
    bloomA: { textures: [bloomA], fbo: framebuffer(gl, [bloomA]) },
    bloomB: { textures: [bloomB], fbo: framebuffer(gl, [bloomB]) },
  }
}

function destroyTargets(gl, targets) {
  if (!targets) return
  deleteTarget(gl, targets.prepass)
  deleteTarget(gl, targets.scene)
  deleteTarget(gl, targets.history)
  deleteTarget(gl, targets.bloomA)
  deleteTarget(gl, targets.bloomB)
}

function bindTexture(gl, programObject, name, texture, unit, target = gl.TEXTURE_2D) {
  const location = gl.getUniformLocation(programObject, name)
  if (location === null) return
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(target, texture)
  gl.uniform1i(location, unit)
}

const INTEGER_UNIFORMS = new Set([
  'iCamDataCoordisOutgoing',
  'iDEBUG',
  'iPrepass',
  'iWhitehole',
  'iInWhichUniverse',
  'iGrid',
  'iEnableHeatHaze',
  'iEnableShadowCulling',
  'iObserverMode',
  'iPolarization',
  'iUseImageDisk',
  'ibHorizontal',
])

function setUniform(gl, programObject, name, value) {
  const location = gl.getUniformLocation(programObject, name)
  if (location === null) return
  if (value instanceof Float32Array && value.length === 16) gl.uniformMatrix4fv(location, false, value)
  else if (Array.isArray(value) && value.length === 4) gl.uniform4fv(location, value)
  else if (Array.isArray(value) && value.length === 3) gl.uniform3fv(location, value)
  else if (Array.isArray(value) && value.length === 2) gl.uniform2fv(location, value)
  else if (INTEGER_UNIFORMS.has(name) || typeof value === 'boolean') gl.uniform1i(location, Number(value))
  else gl.uniform1f(location, value)
}

function setNpgsUniforms(gl, programObject, width, height, elapsed, delta, prepass = false) {
  gl.useProgram(programObject)
  setUniform(gl, programObject, 'iResolution', prepass ? [Math.max(2, Math.floor(width * 0.5)), Math.max(2, Math.floor(height * 0.5))] : [width, height])
  setUniform(gl, programObject, 'iFovRadians', 80 * Math.PI / 180)
  setUniform(gl, programObject, 'iTime', elapsed)
  setUniform(gl, programObject, 'iGameTime', elapsed)
  setUniform(gl, programObject, 'iTimeDelta', delta)
  setUniform(gl, programObject, 'iTimeRate', 1)
  Object.entries(DEFAULT_UNIFORMS).forEach(([name, value]) => setUniform(gl, programObject, name, value))
  setUniform(gl, programObject, 'iBlackHoleTime', elapsed * 0.00682)
}

function drawQuad(gl) {
  gl.drawArrays(gl.TRIANGLES, 0, 6)
}

function framebufferHasVisibleSignal(gl, width, height) {
  const pixel = new Uint8Array(4)
  const columns = [0.08, 0.23, 0.38, 0.53, 0.68, 0.83, 0.94]
  const rows = [0.12, 0.29, 0.46, 0.63, 0.8, 0.92]
  for (const x of columns) {
    for (const y of rows) {
      gl.readPixels(Math.floor(width * x), Math.floor(height * y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
      if (Math.max(pixel[0], pixel[1], pixel[2]) > 18) return true
    }
  }
  return false
}

function bindNpgsTextures(gl, programObject, cubeMaps, diskTexture, targets) {
  CUBE_MAPS.forEach(([name], index) => bindTexture(gl, programObject, name, cubeMaps[index], index, gl.TEXTURE_CUBE_MAP))
  bindTexture(gl, programObject, 'iImageTexture', diskTexture, 6)
  bindTexture(gl, programObject, 'iHistoryTex', targets.history.textures[0], 7)
  bindTexture(gl, programObject, 'iPrepassDistortion', targets.prepass.textures[0], 8)
  bindTexture(gl, programObject, 'iPrepassVolumetric', targets.prepass.textures[1], 9)
}

export const NpgsKerrNewmanCanvas = memo(function NpgsKerrNewmanCanvas({ active = true, className = '', fallback }) {
  const canvasRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const [failure, setFailure] = useState('')
  const [hasActivated, setHasActivated] = useState(active)

  useEffect(() => {
    if (active) setHasActivated(true)
  }, [active])

  useEffect(() => {
    if (!hasActivated) return undefined
    setStatus('loading')
    setFailure('')
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, powerPreference: 'high-performance', preserveDrawingBuffer: false, stencil: false })
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
      setFailure('WebGL2 floating-point framebuffer support is unavailable')
      setStatus('fallback')
      return undefined
    }

    let disposed = false
    let visible = true
    let frame = 0
    let targets = null
    let cubeMaps = []
    let diskTexture = null
    let lastTime = performance.now()
    const startedAt = lastTime
    const programs = []
    const vertexArray = gl.createVertexArray()
    gl.bindVertexArray(vertexArray)
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 0, 0, 1, -1, 1, 0, 1, 1, 1, 1,
      -1, -1, 0, 0, 1, 1, 1, 1, -1, 1, 0, 1,
    ]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8)

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const rawWidth = Math.max(2, Math.round(rect.width * Math.min(window.devicePixelRatio || 1, 1)))
      const rawHeight = Math.max(2, Math.round(rect.height * Math.min(window.devicePixelRatio || 1, 1)))
      const scale = Math.min(1, 480 / Math.max(rawWidth, rawHeight))
      const width = Math.max(2, Math.round(rawWidth * scale))
      const height = Math.max(2, Math.round(rawHeight * scale))
      if (targets?.width === width && targets?.height === height) return
      canvas.width = width
      canvas.height = height
      destroyTargets(gl, targets)
      targets = createTargets(gl, width, height)
      gl.bindFramebuffer(gl.FRAMEBUFFER, targets.history.fbo)
      gl.viewport(0, 0, width, height)
      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }

    const initialize = async () => {
      try {
        // ANGLE can stall when both 250k NPGS programs and the post chain are
        // queued at once. Compile in the original pass order so each linked
        // program is allowed to finish before the next one reaches the driver.
        const prepassProgram = await program(gl, PREPASS_SOURCE, 'NPGS prepass')
        if (disposed) return
        const compositeProgram = await program(gl, COMPOSITE_SOURCE, 'NPGS composite')
        if (disposed) return
        const bloomTreeProgram = await program(gl, BLOOM_TREE_SOURCE, 'NPGS bloom tree')
        if (disposed) return
        const bloomBlurProgram = await program(gl, BLOOM_BLUR_SOURCE, 'NPGS gaussian bloom')
        if (disposed) return
        const blendProgram = await program(gl, BLEND_SOURCE, 'NPGS color blend')
        if (disposed) return
        programs.push(prepassProgram, compositeProgram, bloomTreeProgram, bloomBlurProgram, blendProgram)

        const base = import.meta.env.BASE_URL
        cubeMaps = await Promise.all(CUBE_MAPS.map(([, directory]) => cubeTexture(gl, base, directory)))
        diskTexture = await imageTexture(gl, base)
        if (disposed) return
        resize()
        let hasPresentedVisibleFrame = false

        const render = (now) => {
          frame = 0
          if (disposed) return
          if (document.hidden || !visible || !targets) {
            frame = window.requestAnimationFrame(render)
            return
          }
          const elapsed = (now - startedAt) / 1000
          const delta = Math.min(0.1, (now - lastTime) / 1000)
          lastTime = now

          gl.disable(gl.BLEND)
          gl.bindFramebuffer(gl.FRAMEBUFFER, targets.prepass.fbo)
          gl.viewport(0, 0, targets.halfWidth, targets.halfHeight)
          setNpgsUniforms(gl, prepassProgram, targets.width, targets.height, elapsed, delta, true)
          bindNpgsTextures(gl, prepassProgram, cubeMaps, diskTexture, targets)
          drawQuad(gl)

          gl.bindFramebuffer(gl.FRAMEBUFFER, targets.scene.fbo)
          gl.viewport(0, 0, targets.width, targets.height)
          setNpgsUniforms(gl, compositeProgram, targets.width, targets.height, elapsed, delta)
          bindNpgsTextures(gl, compositeProgram, cubeMaps, diskTexture, targets)
          drawQuad(gl)

          gl.bindFramebuffer(gl.FRAMEBUFFER, targets.bloomA.fbo)
          gl.useProgram(bloomTreeProgram)
          setUniform(gl, bloomTreeProgram, 'iResolution', [targets.width, targets.height])
          bindTexture(gl, bloomTreeProgram, 'iBloomTex', targets.scene.textures[0], 0)
          drawQuad(gl)

          gl.bindFramebuffer(gl.FRAMEBUFFER, targets.bloomB.fbo)
          gl.useProgram(bloomBlurProgram)
          setUniform(gl, bloomBlurProgram, 'iResolution', [targets.width, targets.height])
          setUniform(gl, bloomBlurProgram, 'ibHorizontal', 1)
          bindTexture(gl, bloomBlurProgram, 'iBloomTex', targets.bloomA.textures[0], 0)
          drawQuad(gl)

          gl.bindFramebuffer(gl.FRAMEBUFFER, targets.bloomA.fbo)
          gl.useProgram(bloomBlurProgram)
          setUniform(gl, bloomBlurProgram, 'iResolution', [targets.width, targets.height])
          setUniform(gl, bloomBlurProgram, 'ibHorizontal', 0)
          bindTexture(gl, bloomBlurProgram, 'iBloomTex', targets.bloomB.textures[0], 0)
          drawQuad(gl)

          gl.bindFramebuffer(gl.FRAMEBUFFER, null)
          gl.viewport(0, 0, canvas.width, canvas.height)
          gl.useProgram(blendProgram)
          setUniform(gl, blendProgram, 'iResolution', [targets.width, targets.height])
          const blendLocation = gl.getUniformLocation(blendProgram, 'iBloomTexs[0]')
          if (blendLocation !== null) gl.uniform1iv(blendLocation, new Int32Array([0, 1]))
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, targets.scene.textures[0])
          gl.activeTexture(gl.TEXTURE1)
          gl.bindTexture(gl.TEXTURE_2D, targets.bloomA.textures[0])
          drawQuad(gl)

          if (!hasPresentedVisibleFrame && framebufferHasVisibleSignal(gl, canvas.width, canvas.height)) {
            hasPresentedVisibleFrame = true
            setStatus('ready')
          }

          const previousHistory = targets.history
          targets.history = targets.scene
          targets.scene = previousHistory
          frame = window.requestAnimationFrame(render)
        }
        frame = window.requestAnimationFrame(render)
      } catch (error) {
        console.error('NPGS Kerr-Newman WebGL2 pipeline failed:', error)
        if (!disposed) {
          setFailure(error instanceof Error ? error.message : String(error))
          setStatus('fallback')
        }
      }
    }

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    }, { threshold: 0 })
    const resizeObserver = new ResizeObserver(() => { if (targets) resize() })
    intersectionObserver.observe(canvas)
    resizeObserver.observe(canvas)
    initialize()

    return () => {
      disposed = true
      window.cancelAnimationFrame(frame)
      intersectionObserver.disconnect()
      resizeObserver.disconnect()
      destroyTargets(gl, targets)
      programs.forEach((item) => gl.deleteProgram(item))
      cubeMaps.forEach((texture) => gl.deleteTexture(texture))
      if (diskTexture) gl.deleteTexture(diskTexture)
      gl.deleteBuffer(buffer)
      gl.deleteVertexArray(vertexArray)
    }
  }, [hasActivated])

  return <div className={`${className} ${status === 'ready' ? '' : 'has-fallback'}`.trim()} data-black-hole-model="baopinshui-npgs-wxdfzj" data-black-hole-status={status} data-black-hole-error={failure || undefined}>
    {fallback && <img className="rhine-blackhole-fallback" src={fallback} alt="" />}
    <canvas ref={canvasRef} role="img" aria-label="Original NPGS Kerr-Newman black hole rendering pipeline" />
  </div>
})

export default NpgsKerrNewmanCanvas
