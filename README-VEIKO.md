# VEIKO Rhine Archive

Independent source and GitHub Pages deployment for `https://www.veiko.cc.cd/`.

## Updating content

- Replace member and scene images in `public/assets/rhine-clone/` or `public/rhine-reference/`.
- Update image paths, labels, and section copy in `src/data/rhineArchiveContent.js`.
- Run `pnpm run publish:veiko` to build, commit, and publish the independent site.

The site is deployed by `.github/workflows/deploy-pages.yml`. It is separate from the portfolio repository and domain.

## Third-party visual

The A-02 fractal tunnel adapts Benoit Marini's [Path to the colorful infinity](https://www.shadertoy.com/view/WtjyzR), originally published on ShaderToy in 2020 under [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/). The VEIKO adaptation changes the runtime, performance tiers, fallback behavior, framing, and color treatment. Commercial use requires separate permission from the original author.

The A-03 chromatic tunnel is a clean native WebGL recreation of the RGB radial tunnel shown in the supplied `28804777927-1-30080.mp4` tutorial reference; the watermarked tutorial footage itself is not shipped. The RESEARCH black-hole visual is a native WebGL adaptation of the supplied [Shadertoy wXdfzj reference](https://www.shadertoy.com/view/wXdfzj), with responsive quality tiers, lifecycle controls, and an image fallback for older browsers.
