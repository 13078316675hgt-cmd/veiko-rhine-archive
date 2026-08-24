# VEIKO Rhine Archive

Independent source and GitHub Pages deployment for `https://www.veiko.cc.cd/`.

## Updating content

- Replace member and scene images in `public/assets/rhine-clone/` or `public/rhine-reference/`.
- Update image paths, labels, and section copy in `src/data/rhineArchiveContent.js`.
- Run `pnpm run publish:veiko` to build, commit, and publish the independent site.

The site is deployed by `.github/workflows/deploy-pages.yml`. It is separate from the portfolio repository and domain.
