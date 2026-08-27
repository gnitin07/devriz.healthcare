/**
 * Build-time half of the blog prerenderer. Runs automatically at the end of
 * `npm run build`.
 *
 * The rendering itself lives in server/prerender.mjs, because the SERVER runs
 * the same code every time someone publishes in /admin. This file only decides
 * what to feed it at build time: the posts committed under content/blog.
 *
 * That is deliberately not the live content folder. Articles written through
 * /admin are stored outside the application root on the server (see
 * server/store.mjs) and are re-rendered when the app boots, so a locally built
 * dist/ never needs — and must never assume — a copy of them.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { listFrom } from '../server/store.mjs'
import { renderAll, auditAltText } from '../server/prerender.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')

const posts = listFrom(path.join(ROOT, 'content/blog'))
const { posts: live, urlCount } = renderAll({ distDir: DIST, posts })

const offenders = auditAltText(live)
if (offenders.length) {
  console.warn(
    `\n  !! ${offenders.length} image(s) have no alt text — bad for Google Images and unreadable to screen readers:`
  )
  for (const o of offenders) console.warn(`   - ${o}`)
  console.warn(
    '   Fix: open the post at /admin, click the image, and fill in "Image description".\n'
  )
}

console.log(`prerendered ${live.length} post page(s) + /blogs, sitemap has ${urlCount} URLs`)
