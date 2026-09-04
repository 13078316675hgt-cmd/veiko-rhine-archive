import { memo, useEffect, useRef, useState } from 'react'
import bufferASource from '../vendor/shadertoy-wxdfzj/buffer-a.glsl?raw'
import bufferBSource from '../vendor/shadertoy-wxdfzj/buffer-b.glsl?raw'
import bufferCSource from '../vendor/shadertoy-wxdfzj/buffer-c.glsl?raw'
import bufferDSource from '../vendor/shadertoy-wxdfzj/buffer-d.glsl?raw'
import imageSource from '../vendor/shadertoy-wxdfzj/image.glsl?raw'

const QUALITY_PRESETS = Object.freeze({
  // Cap backing resolution at one pixel per CSS pixel, scaling down as needed
  // to retain a memory ceiling for the six-target RGBA32F pipeline.
  low: { maxDpr: 1, maxPixels: 360_000, frameInterval: 1000 / 10 },
  medium: { maxDpr: 1, maxPixels: 650_000, frameInterval: 1000 / 18 },
  high: { maxDpr: 1, maxPixels: 1_000_000, frameInterval: 1000 / 24 },
})

const TRACKED_KEYS = new Set([65, 68, 69, 70, 81, 82, 83, 87])
const ZERO = new Float32Array([0, 0, 0, 0])
const OPAQUE_BLACK = new Float32Array([0, 0, 0, 1])

const VERTEX_SOURCE = [
  '#version 300 es',
  'layout(location = 0) in vec2 aPosition;',
  'void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }',
].join('\n')

const SHADERTOY_HEADER = [
  '#version 300 es',
  'precision highp float;',
  'precision highp int;',
  'uniform vec3 iResolution;',
  'uniform float iTime;',
  'uniform float iTimeDelta;',
  'uniform float iFrameRate;',
  'uniform int iFrame;',
  'uniform float iChannelTime[4];',
  'uniform vec3 iChannelResolution[4];',
  'uniform vec4 iMouse;',
  'uniform vec4 iDate;',
  'uniform float iSampleRate;',
  'uniform sampler2D iChannel0;',
  'uniform sampler2D iChannel1;',
  'uniform sampler2D iChannel2;',
  'uniform sampler2D iChannel3;',
  'out vec4 shadertoyFragColor;',
].join('\n')

const SHADERTOY_FOOTER = [
  'void main() {',
  '  vec4 color = vec4(0.0);',
  '  mainImage(color, gl_FragCoord.xy);',
  '  shadertoyFragColor = color;',
  '}',
].join('\n')

const PASS_SOURCES = Object.freeze({
  a: bufferASource,
  b: bufferBSource,
  c: bufferCSource,
  d: bufferDSource,
  image: imageSource,
})

function chooseQuality(requested) {
  if (requested !== 'auto' && QUALITY_PRESETS[requested]) return requested
  const compact = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches
  const cores = navigator.hardwareConcurrency || 4
  const memory = navigator.deviceMemory || 4
  if (!compact && cores >= 8 && memory >= 6) return 'high'
  if (!compact && cores >= 4) return 'medium'
  return 'low'
}

function fragmentSource(source) {
  return [SHADERTOY_HEADER, source, SHADERTOY_FOOTER].join('\n')
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function shaderLog(gl, shader, label) {
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return
  throw new Error(label + ': ' + (gl.getShaderInfoLog(shader) || 'shader compilation failed'))
}

async function createPrograms(gl, isDisposed) {
  const parallel = gl.getExtension('KHR_parallel_shader_compile')
  const vertex = gl.createShader(gl.VERTEX_SHADER)
  gl.shaderSource(vertex, VERTEX_SOURCE)
  gl.compileShader(vertex)

  const fragments = {}
  const programs = {}
  try {
    for (const [name, source] of Object.entries(PASS_SOURCES)) {
      const fragment = gl.createShader(gl.FRAGMENT_SHADER)
      gl.shaderSource(fragment, fragmentSource(source))
      gl.compileShader(fragment)
      fragments[name] = fragment

      const program = gl.createProgram()
      gl.attachShader(program, vertex)
      gl.attachShader(program, fragment)
      gl.linkProgram(program)
      programs[name] = program
    }

    if (parallel) {
      while (!isDisposed() && Object.values(programs).some((program) => !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR))) {
        await wait(50)
      }
      if (isDisposed()) throw new Error('wXdfzj initialization cancelled')
    }

    shaderLog(gl, vertex, 'wXdfzj vertex shader')
    for (const [name, fragment] of Object.entries(fragments)) shaderLog(gl, fragment, 'wXdfzj ' + name + ' pass')
    for (const [name, program] of Object.entries(programs)) {
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('wXdfzj ' + name + ' link: ' + (gl.getProgramInfoLog(program) || 'program link failed'))
      }
    }

    for (const fragment of Object.values(fragments)) gl.deleteShader(fragment)
    gl.deleteShader(vertex)
    return programs
  } catch (error) {
    for (const program of Object.values(programs)) gl.deleteProgram(program)
    for (const fragment of Object.values(fragments)) gl.deleteShader(fragment)
    gl.deleteShader(vertex)
    throw error
  }
}

function prepareProgram(gl, program) {
  const uniforms = {}
  const names = [
    'iResolution', 'iTime', 'iTimeDelta', 'iFrameRate', 'iFrame', 'iMouse', 'iDate',
    'iSampleRate', 'iChannelTime[0]', 'iChannelResolution[0]',
  ]
  for (const name of names) uniforms[name] = gl.getUniformLocation(program, name)
  uniforms.channels = [0, 1, 2, 3].map((index) => gl.getUniformLocation(program, 'iChannel' + index))
  gl.useProgram(program)
  uniforms.channels.forEach((location, index) => {
    if (location !== null) gl.uniform1i(location, index)
  })
  return { program, uniforms }
}

function createTexture(gl, width, height, internalFormat, format, type, data = null, filter = gl.NEAREST) {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, data)
  return texture
}

function createTarget(gl, width, height, internalFormat, type, clearValue = ZERO) {
  // The original Bloom chain in B/C/D and the bicubic reconstruction in Image
  // explicitly rely on hardware bilinear filtering. NEAREST turns its packed
  // high octaves into the translucent square artifacts seen on the page.
  const texture = createTexture(gl, width, height, internalFormat, gl.RGBA, type, null, gl.LINEAR)
  const framebuffer = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  gl.drawBuffers([gl.COLOR_ATTACHMENT0])
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteFramebuffer(framebuffer)
    gl.deleteTexture(texture)
    throw new Error('wXdfzj float framebuffer is incomplete: 0x' + status.toString(16))
  }
  gl.viewport(0, 0, width, height)
  gl.clearBufferfv(gl.COLOR, 0, clearValue)
  return { texture, framebuffer, width, height }
}

function disposeTargets(gl, targets) {
  if (!targets) return
  for (const name of ['a', 'b', 'c', 'd']) {
    const passTargets = Array.isArray(targets[name]) ? targets[name] : [targets[name]]
    for (const target of passTargets) {
      gl.deleteFramebuffer(target.framebuffer)
      gl.deleteTexture(target.texture)
    }
  }
}

function createTargets(gl, width, height) {
  const candidates = [
    { internalFormat: gl.RGBA32F, type: gl.FLOAT, label: 'rgba32f' },
  ]
  let lastError
  for (const candidate of candidates) {
    const made = []
    try {
      const target = (clearValue) => {
        const result = createTarget(gl, width, height, candidate.internalFormat, candidate.type, clearValue)
        made.push(result)
        return result
      }
      const pair = (clearValue) => {
        const result = []
        result.push(target(clearValue))
        result.push(target(clearValue))
        return result
      }
      return {
        a: pair(ZERO),
        b: pair(OPAQUE_BLACK),
        c: target(OPAQUE_BLACK),
        d: target(OPAQUE_BLACK),
        ping: 0,
        format: candidate.label,
      }
    } catch (error) {
      lastError = error
      for (const target of made) {
        gl.deleteFramebuffer(target.framebuffer)
        gl.deleteTexture(target.texture)
      }
    }
  }
  throw lastError || new Error('wXdfzj float framebuffer unavailable')
}

function createStaticTexture(gl, width, height, internalFormat, format, data) {
  return {
    texture: createTexture(gl, width, height, internalFormat, format, gl.UNSIGNED_BYTE, data),
    width,
    height,
  }
}

function deletePrograms(gl, passes) {
  if (!passes) return
  for (const pass of Object.values(passes)) gl.deleteProgram(pass.program)
}

export const WxdfzjBlackHoleCanvas = memo(function WxdfzjBlackHoleCanvas({
  active = true,
  prepare = false,
  className = '',
  quality = 'auto',
  fallback = `${import.meta.env.BASE_URL}assets/npgs-kerr-newman/wxdfzj-original-frame.png`,
}) {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const runtimeRef = useRef(null)
  const activeRef = useRef(active)
  const [activated, setActivated] = useState(active)
  const [contextEpoch, setContextEpoch] = useState(0)
  const [status, setStatus] = useState(active ? 'queued' : 'idle')
  const [failure, setFailure] = useState('')
  const tierRef = useRef(null)
  if (!tierRef.current) tierRef.current = chooseQuality(quality)
  const tier = tierRef.current

  useEffect(() => {
    activeRef.current = active
    if (active) setActivated(true)
    const runtime = runtimeRef.current
    if (!runtime) return
    runtime.active = active
    if (active) runtime.start()
    else {
      runtime.releaseKeys()
      runtime.stop()
    }
  }, [active])

  useEffect(() => {
    if (active || !prepare || activated) return undefined
    const activate = () => setActivated(true)
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(activate, { timeout: 1600 })
      return () => window.cancelIdleCallback(handle)
    }
    const handle = window.setTimeout(activate, 450)
    return () => window.clearTimeout(handle)
  }, [active, activated, prepare])

  useEffect(() => {
    if (!activated) return undefined
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return undefined

    const preset = QUALITY_PRESETS[tier]
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      desynchronized: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      stencil: false,
    })
    if (!gl) {
      setStatus('error')
      setFailure('WebGL2 is unavailable')
      return undefined
    }

    let disposed = false
    let visible = true
    let raf = 0
    let targets = null
    let passes = null
    let vao = null
    let positionBuffer = null
    let keyboardTexture = null
    let emptyTexture = null
    let resizeObserver = null
    let intersectionObserver = null
    let frame = 0
    let nextDraw = 0
    let lastTelemetryWrite = 0
    let lastShaderTime = 0
    let startedAt = 0
    let pausedAt = null
    let failed = false
    let hasActivated = activeRef.current
    let internalFormat = 'pending'
    let keyboardDirty = false
    let keyboardPulseActive = false
    let bScissors = null
    let blurScissors = null
    const mouse = new Float32Array([0, 0, -1, -1])
    const keyboard = new Uint8Array(256 * 3)
    const channelTimes = new Float32Array(4)
    const channelResolutions = new Float32Array(12)
    const aChannels = [null, null, null, null]
    const bChannels = [null, null, null, null]
    const cChannels = [null, null, null, null]
    const dChannels = [null, null, null, null]
    const imageChannels = [null, null, null, null]
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const renderPass = (pass, target, channels, shaderTime, delta, frameRate, scissors = null, invalidateTarget = false) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null)
      if (target && invalidateTarget) {
        if (scissors) {
          for (const [x, y, width, height] of scissors) {
            gl.invalidateSubFramebuffer(gl.FRAMEBUFFER, [gl.COLOR_ATTACHMENT0], x, y, width, height)
          }
        } else {
          gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.COLOR_ATTACHMENT0])
        }
      }
      gl.useProgram(pass.program)

      const u = pass.uniforms
      for (let index = 0; index < 4; index += 1) {
        if (u.channels[index] === null) continue
        const channel = channels[index]
        gl.activeTexture(gl.TEXTURE0 + index)
        gl.bindTexture(gl.TEXTURE_2D, channel ? channel.texture : emptyTexture.texture)
      }

      if (u.iTime !== null) gl.uniform1f(u.iTime, shaderTime)
      if (u.iTimeDelta !== null) gl.uniform1f(u.iTimeDelta, delta)
      if (u.iFrameRate !== null) gl.uniform1f(u.iFrameRate, frameRate)
      if (u.iFrame !== null) gl.uniform1i(u.iFrame, frame)
      if (u.iMouse !== null) gl.uniform4fv(u.iMouse, mouse)
      if (u['iChannelTime[0]'] !== null) {
        channelTimes.fill(shaderTime)
        gl.uniform1fv(u['iChannelTime[0]'], channelTimes)
      }
      if (u.iDate !== null) {
        const date = new Date()
        const seconds = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds() + date.getMilliseconds() / 1000
        gl.uniform4f(u.iDate, date.getFullYear(), date.getMonth() + 1, date.getDate(), seconds)
      }

      if (scissors) {
        gl.enable(gl.SCISSOR_TEST)
        for (const [x, y, width, height] of scissors) {
          gl.scissor(x, y, width, height)
          gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        gl.disable(gl.SCISSOR_TEST)
      } else {
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
    }

    const configureStaticUniforms = (pass, channels) => {
      gl.useProgram(pass.program)
      const u = pass.uniforms
      if (u.iResolution !== null) gl.uniform3f(u.iResolution, canvas.width, canvas.height, 1)
      if (u.iSampleRate !== null) gl.uniform1f(u.iSampleRate, 44100)
      if (u['iChannelResolution[0]'] === null) return
      channelResolutions.fill(0)
      for (let index = 0; index < 4; index += 1) {
        const channel = channels[index]
        if (!channel) continue
        channelResolutions[index * 3] = channel.width
        channelResolutions[index * 3 + 1] = channel.height
        channelResolutions[index * 3 + 2] = 1
      }
      gl.uniform3fv(u['iChannelResolution[0]'], channelResolutions)
    }

    const uploadKeyboard = () => {
      if (!keyboardDirty) return
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, keyboardTexture.texture)
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 3, gl.RED, gl.UNSIGNED_BYTE, keyboard)
      keyboardDirty = false
    }

    const releaseKeys = () => {
      keyboard.fill(0, 0, 512)
      keyboardDirty = true
      keyboardPulseActive = false
    }

    const resize = () => {
      const cssWidth = Math.max(1, root.clientWidth)
      const cssHeight = Math.max(1, root.clientHeight)
      const areaDpr = Math.sqrt(preset.maxPixels / (cssWidth * cssHeight))
      const dpr = Math.min(window.devicePixelRatio || 1, preset.maxDpr, areaDpr)
      const width = Math.max(64, Math.round(cssWidth * dpr))
      const height = Math.max(36, Math.round(cssHeight * dpr))
      if (canvas.width === width && canvas.height === height && targets) return false
      canvas.width = width
      canvas.height = height
      disposeTargets(gl, targets)
      targets = createTargets(gl, width, height)
      targets.ping = 0
      internalFormat = targets.format
      const leftWidth = Math.min(width, Math.ceil(width * 0.52))
      bScissors = [
        [0, 0, leftWidth, height],
        [Math.max(0, width - 8), 0, Math.min(8, width), 1],
      ]
      blurScissors = [[0, 0, leftWidth, height]]
      gl.viewport(0, 0, width, height)
      aChannels[0] = keyboardTexture
      aChannels[2] = targets.b[0]
      aChannels[3] = targets.a[0]
      bChannels[0] = targets.a[0]
      bChannels[1] = targets.b[0]
      bChannels[3] = keyboardTexture
      cChannels[0] = targets.b[0]
      dChannels[0] = targets.c
      imageChannels[0] = targets.a[0]
      imageChannels[1] = targets.b[0]
      imageChannels[2] = targets.c
      imageChannels[3] = targets.d
      configureStaticUniforms(passes.a, aChannels)
      configureStaticUniforms(passes.b, bChannels)
      configureStaticUniforms(passes.c, cChannels)
      configureStaticUniforms(passes.d, dChannels)
      configureStaticUniforms(passes.image, imageChannels)
      frame = 0
      lastShaderTime = 0
      lastTelemetryWrite = 0
      canvas.dataset.frame = '0'
      canvas.dataset.bufferFormat = internalFormat
      return true
    }

    const draw = (now = performance.now()) => {
      if (!passes || !targets) return
      const shaderTime = Math.max(0, (now - startedAt) / 1000)
      const delta = frame === 0 ? 1 / 60 : Math.min(0.25, Math.max(1 / 240, shaderTime - lastShaderTime))
      const frameRate = 1 / delta
      lastShaderTime = shaderTime
      uploadKeyboard()
      gl.bindVertexArray(vao)

      const read = targets.ping
      const write = 1 - read
      const aRead = targets.a[read]
      const aWrite = targets.a[write]
      const bRead = targets.b[read]
      const bWrite = targets.b[write]
      const cWrite = targets.c
      const dWrite = targets.d

      aChannels[0] = keyboardTexture
      aChannels[2] = bRead
      aChannels[3] = aRead
      bChannels[0] = aWrite
      bChannels[1] = bRead
      bChannels[3] = keyboardTexture
      cChannels[0] = bWrite
      dChannels[0] = cWrite
      imageChannels[0] = aWrite
      imageChannels[1] = bWrite
      imageChannels[2] = cWrite
      imageChannels[3] = dWrite

      renderPass(passes.a, aWrite, aChannels, shaderTime, delta, frameRate, null, true)
      renderPass(passes.b, bWrite, bChannels, shaderTime, delta, frameRate, bScissors, true)
      renderPass(passes.c, cWrite, cChannels, shaderTime, delta, frameRate, blurScissors, true)
      renderPass(passes.d, dWrite, dChannels, shaderTime, delta, frameRate, blurScissors, true)
      renderPass(passes.image, null, imageChannels, shaderTime, delta, frameRate)

      if (keyboardPulseActive) {
        keyboard.fill(0, 256, 512)
        keyboardDirty = true
        keyboardPulseActive = false
      }
      targets.ping = write
      frame += 1
      if (lastTelemetryWrite === 0 || now - lastTelemetryWrite >= 1000) {
        canvas.dataset.frame = String(frame)
        lastTelemetryWrite = now
      }

    }

    const stop = () => {
      if (raf) window.cancelAnimationFrame(raf)
      raf = 0
      if (startedAt && pausedAt === null) pausedAt = performance.now()
      nextDraw = 0
    }

    const failRuntime = (error) => {
      failed = true
      stop()
      if (disposed) return
      const message = error instanceof Error ? error.message : String(error)
      console.error('Original Shadertoy wXdfzj pipeline failed:', error)
      setStatus('error')
      setFailure(message.slice(0, 600))
    }

    const loop = (now) => {
      raf = 0
      if (disposed || failed || document.hidden || !visible || !runtimeRef.current?.active) return
      if (nextDraw <= 0 || now >= nextDraw - 0.25) {
        try {
          draw(now)
        } catch (error) {
          failRuntime(error)
          return
        }
        if (nextDraw <= 0) nextDraw = now + preset.frameInterval
        else {
          nextDraw += preset.frameInterval
          if (nextDraw <= now) {
            nextDraw += (Math.floor((now - nextDraw) / preset.frameInterval) + 1) * preset.frameInterval
          }
        }
      }
      raf = window.requestAnimationFrame(loop)
    }

    const start = () => {
      if (disposed || failed || raf || document.hidden || !visible || !runtimeRef.current?.active || !passes) return
      // Paused wall time must not advance the simulation or keyboard movement.
      const resumedAt = performance.now()
      if (pausedAt !== null) {
        startedAt += resumedAt - pausedAt
        pausedAt = null
      }
      if (!hasActivated) {
        const activationTime = performance.now()
        startedAt = activationTime - lastShaderTime * 1000
        nextDraw = activationTime + preset.frameInterval
        hasActivated = true
      }
      if (reducedMotion) {
        try {
          draw(startedAt + 4000)
        } catch (error) {
          failRuntime(error)
        }
        return
      }
      raf = window.requestAnimationFrame(loop)
    }

    const point = (event) => {
      const rect = root.getBoundingClientRect()
      mouse[0] = (event.clientX - rect.left) * canvas.width / Math.max(1, rect.width)
      mouse[1] = (rect.bottom - event.clientY) * canvas.height / Math.max(1, rect.height)
    }
    const onPointerDown = (event) => {
      if (event.button !== 0) return
      point(event)
      mouse[2] = Math.max(0.001, mouse[0])
      mouse[3] = Math.max(0.001, mouse[1])
      root.setPointerCapture?.(event.pointerId)
    }
    const onPointerMove = (event) => {
      if (mouse[2] > 0) point(event)
    }
    const onPointerUp = (event) => {
      point(event)
      mouse[2] = -Math.max(1, Math.abs(mouse[2]))
      mouse[3] = -Math.max(1, Math.abs(mouse[3]))
      root.releasePointerCapture?.(event.pointerId)
    }
    const onKeyDown = (event) => {
      const code = event.keyCode || event.which
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      if (!runtimeRef.current?.active || !TRACKED_KEYS.has(code)) return
      if (!event.repeat) {
        keyboard[code] = 255
        keyboard[256 + code] = 255
        keyboard[512 + code] = keyboard[512 + code] ? 0 : 255
        keyboardDirty = true
        keyboardPulseActive = true
      }
      event.preventDefault()
    }
    const onKeyUp = (event) => {
      const code = event.keyCode || event.which
      if (!TRACKED_KEYS.has(code)) return
      keyboard[code] = 0
      keyboardDirty = true
      if (runtimeRef.current?.active) event.preventDefault()
    }
    const onVisibility = () => {
      if (document.hidden) {
        releaseKeys()
        stop()
      }
      else start()
    }
    const onWindowBlur = () => releaseKeys()
    const onContextLost = (event) => {
      event.preventDefault()
      failed = true
      stop()
      setStatus('error')
      setFailure('WebGL context lost')
    }
    const onContextRestored = () => {
      if (!disposed) setContextEpoch((value) => value + 1)
    }

    const initialize = async () => {
      setStatus('compiling')
      setFailure('')
      await wait(0)
      if (disposed || gl.isContextLost()) return
      if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float is unavailable')
      if (!gl.getExtension('OES_texture_float_linear')) throw new Error('OES_texture_float_linear is unavailable')
      gl.disable(gl.BLEND)
      gl.disable(gl.CULL_FACE)
      gl.disable(gl.DEPTH_TEST)
      gl.disable(gl.SCISSOR_TEST)
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

      const linked = await createPrograms(gl, () => disposed || gl.isContextLost())
      if (disposed) {
        Object.values(linked).forEach((program) => gl.deleteProgram(program))
        return
      }
      passes = Object.fromEntries(Object.entries(linked).map(([name, program]) => [name, prepareProgram(gl, program)]))

      vao = gl.createVertexArray()
      positionBuffer = gl.createBuffer()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

      emptyTexture = createStaticTexture(gl, 1, 1, gl.RGBA8, gl.RGBA, new Uint8Array([0, 0, 0, 0]))
      keyboardTexture = createStaticTexture(gl, 256, 3, gl.R8, gl.RED, keyboard)
      keyboardDirty = false
      resize()
      startedAt = performance.now()

      runtimeRef.current = { active: activeRef.current, draw, releaseKeys, start, stop }
      resizeObserver = new ResizeObserver(() => {
        if (!passes || disposed || failed || gl.isContextLost()) return
        try {
          const changed = resize()
          if (changed && activeRef.current && reducedMotion && visible && !document.hidden) draw(performance.now())
        } catch (error) {
          failRuntime(error)
        }
      })
      intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting
        if (visible) start()
        else stop()
      }, { threshold: 0 })
      resizeObserver.observe(root)
      intersectionObserver.observe(root)
      document.addEventListener('visibilitychange', onVisibility)
      window.addEventListener('blur', onWindowBlur)
      window.addEventListener('keydown', onKeyDown, { passive: false })
      window.addEventListener('keyup', onKeyUp, { passive: false })
      root.addEventListener('pointerdown', onPointerDown)
      root.addEventListener('pointermove', onPointerMove)
      root.addEventListener('pointerup', onPointerUp)
      root.addEventListener('pointercancel', onPointerUp)

      setStatus('ready')
      // Preparation compiles and allocates only. A hidden full-resolution draw
      // competes with the authorization animation for GPU time.
      if (activeRef.current && visible && !document.hidden) {
        try {
          draw(startedAt)
          nextDraw = startedAt + preset.frameInterval
          start()
        } catch (error) {
          failRuntime(error)
        }
      } else stop()
    }

    // Listen during asynchronous compilation too, not only after setup succeeds.
    canvas.addEventListener('webglcontextlost', onContextLost)
    canvas.addEventListener('webglcontextrestored', onContextRestored)
    initialize().catch((error) => {
      if (disposed || error?.message === 'wXdfzj initialization cancelled') return
      failRuntime(error)
    })

    return () => {
      disposed = true
      stop()
      resizeObserver?.disconnect()
      intersectionObserver?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onWindowBlur)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('pointermove', onPointerMove)
      root.removeEventListener('pointerup', onPointerUp)
      root.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
      disposeTargets(gl, targets)
      deletePrograms(gl, passes)
      if (keyboardTexture) gl.deleteTexture(keyboardTexture.texture)
      if (emptyTexture) gl.deleteTexture(emptyTexture.texture)
      if (positionBuffer) gl.deleteBuffer(positionBuffer)
      if (vao) gl.deleteVertexArray(vao)
      if (runtimeRef.current?.draw === draw) runtimeRef.current = null
    }
  }, [activated, contextEpoch, tier])

  const classes = ['rhine-wxdfzj-blackhole', className, status === 'error' ? 'has-fallback' : ''].filter(Boolean).join(' ')
  return <div
    ref={rootRef}
    className={classes}
    data-black-hole-model="shadertoy-wxdfzj-original"
    data-black-hole-quality={tier}
    data-black-hole-status={status}
    data-black-hole-error={failure || undefined}
  >
    {status === 'error' && fallback && <img className="rhine-blackhole-fallback" src={fallback} alt="Kerr–Newman black hole" />}
    <canvas ref={canvasRef} role="img" aria-label="Original baopinsui Kerr-Newman black hole Shadertoy rendering" />
  </div>
})

export default WxdfzjBlackHoleCanvas
