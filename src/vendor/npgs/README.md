# NPGS Kerr-Newman shader sources

These GLSL files are unmodified copies from
[`baopinshui/NPGS`](https://github.com/baopinshui/NPGS), commit `b20f2bc`,
and correspond to the author's Shadertoy work `wXdfzj`.

The WebGL2 declaration adapter and render-pass scheduler live in
`src/components/NpgsKerrNewmanCanvas.jsx`. It preserves the original
Prepass, Composite/history, Bloom, Gaussian blur, and ColorBlend sequence.

The original cube maps, disk texture, and GPL-3.0 license are stored under
`public/assets/npgs-kerr-newman/`.
