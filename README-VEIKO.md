# VEIKO Rhine Archive

Independent source and GitHub Pages deployment for `https://www.veiko.cc.cd/`.

## Updating content

- Replace member and scene images in `public/assets/rhine-clone/` or `public/rhine-reference/`.
- Update image paths, labels, and section copy in `src/data/rhineArchiveContent.js`.
- Run `pnpm run publish:veiko` to build, commit, and publish the independent site.

The site is deployed by `.github/workflows/deploy-pages.yml`. It is separate from the portfolio repository and domain.

## Third-party visual

The A-02 fractal tunnel runs Benoit Marini's [Path to the colorful infinity](https://www.shadertoy.com/view/WtjyzR), originally published on ShaderToy in 2020 under [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/). Its wrapper adapts a loop for WebGL1 validation and supplies uniforms, resolution tiers, lifecycle controls, and a poster fallback; the source color equations are retained. Commercial use requires separate permission from the original author.

The A-03 component retains the name `ChromaticTunnelCanvas`, but now runs XorDev's **Fragments** (`3cScWy`) GLSL. A-01 runs chronos's **The Weave** (`W3SSRm`), and authorization uses XorDev's **Phases** (`ml3BWf`).

The RESEARCH visual uses `WxdfzjBlackHoleCanvas.jsx` and the five GLSL passes in `src/vendor/shadertoy-wxdfzj/`: A (ray tracing/history), B (camera state/bloom packing), C/D (blur), and Image (bloom reconstruction/tone mapping). It uses native WebGL2 with RGBA32F render targets and linear filtering, requiring `EXT_color_buffer_float` and `OES_texture_float_linear`. The older NPGS and compact black-hole components are not imported by the current application.

The rectangular panel in the upper right is the source shader's `RenderTopologyMap()` visualization, not a framebuffer artifact. Its rendering and the source color equations are preserved. The existing `public/assets/npgs-kerr-newman/wxdfzj-original-frame.png` is shown only on a renderer error, including unsupported WebGL or context loss; successful context restoration returns to the live canvas.

Inactive preparation compiles programs and allocates targets without drawing. Simulation time pauses when the section or document is hidden, and returning to research reuses the prepared resources.

## Local validation

Use the existing dependencies with `pnpm dev`, then run `node scripts/review-rhine-webgl.mjs` against the development server. This checks the live five-pass pipeline, navigation/visibility pause, resize, input, context restoration, restricted bloom regions, resource cleanup, and forced initialization failures. Its isolated React fixtures require Vite's development server.

The `review-rhine-archive.mjs`, `review-rhine-motion.mjs`, `review-rhine-entrance.mjs`, `review-rhine-performance.mjs`, and `review-rhine-entrance-performance.mjs` scripts cover the surrounding experience. Set `RHINE_REVIEW_URL` for a different server address (`?rhineBypass=1#rhine-archive` for navigation/motion/performance; no bypass for entrance checks). Set `RHINE_BROWSER_CHANNEL=chrome` to use installed Chrome, and `RHINE_REVIEW_OUTPUT` to an absolute `file:///.../` directory to keep screenshots separate from earlier reviews.

The entrance performance review also accepts `RHINE_PROFILE_GL=1` to report slow shader setup and draw calls alongside frame timing; its existing frame-time limits are unchanged.
