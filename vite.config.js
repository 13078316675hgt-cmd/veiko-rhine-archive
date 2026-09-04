import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const socialImagePath = 'rhine-reference/black-hole-spectrum.png'

function normalizeOrigin(value) {
  if (!value) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? `${url.origin}${url.pathname.replace(/\/?$/, '/')}`
      : ''
  } catch {
    return ''
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const publicSiteUrl = normalizeOrigin(env.VITE_PUBLIC_SITE_URL)
  let resolvedBase = '/'

  return {
    base: '/',
    plugins: [
      react(),
      {
        name: 'optional-public-origin-metadata',
        enforce: 'post',
        configResolved(config) {
          resolvedBase = config.base
        },
        transformIndexHtml(html) {
          if (!publicSiteUrl) return html

          const canonicalUrl = new URL(resolvedBase, publicSiteUrl).href
          const socialImageUrl = new URL(socialImagePath, canonicalUrl).href
          const withAbsoluteImages = html
            .replace(/(<meta property="og:image" content=")[^"]*(" \/>)/, `$1${socialImageUrl}$2`)
            .replace(/(<meta name="twitter:image" content=")[^"]*(" \/>)/, `$1${socialImageUrl}$2`)

          return withAbsoluteImages.replace(
            /(<meta property="og:type" content="website" \/>)/,
            `$1\n    <link rel="canonical" href="${canonicalUrl}" />\n    <meta property="og:url" content="${canonicalUrl}" />`,
          )
        },
      },
    ],
  }
})
