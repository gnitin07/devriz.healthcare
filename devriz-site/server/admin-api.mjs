/**
 * Everything /admin talks to.
 *
 * The rule that shapes this whole file: any route that changes content calls
 * publish() before it answers. The writer clicks Publish, the static HTML under
 * dist/blogs is regenerated, and only then does the button go green — so "it
 * says published" and "it is live" cannot come apart. There is no queue, no
 * build, no deploy step, and nothing to remember to do afterwards.
 */
import express from 'express'

import { writeFile, unlink, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { ZipArchive } from 'archiver'

import * as store from './store.mjs'
import * as auth from './auth.mjs'
import { renderAll, present } from './prerender.mjs'
import { registerImages } from '../src/lib/blog-images.js'

/** Widths blog-images.js builds a srcset from. The browser produces these. */
const WIDTHS = [640, 960, 1400]

export default function adminApi({ distDir }) {
  const router = express.Router()

  // Images arrive base64-encoded inside the JSON body. A compressed 1400px
  // WebP plus its smaller siblings is well under a megabyte; the ceiling is
  // generous only so an upload never fails silently for being a few KB over.
  router.use(express.json({ limit: '32mb' }))

  /* ---------- keeping the site in step ---------- */

  let cachedPosts = store.listPublished().map(present)

  /**
   * Regenerate /blogs, every article page and sitemap.xml from what is now on
   * disk, and refresh what /api/posts.json serves.
   */
  const publish = () => {
    const posts = store.list()
    const { posts: live } = renderAll({ distDir, posts })
    cachedPosts = live
    return live
  }

  /** What the public site reads. Exposed so server.js can mount it un-gated. */
  const publicPosts = (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
    res.json({ posts: cachedPosts })
  }

  const ip = (req) =>
    String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'unknown'

  /* ---------- sign in ---------- */

  router.post('/login', (req, res) => {
    if (!auth.configured()) {
      return res.status(503).json({
        error:
          'No admin password is set on this server yet. Add ADMIN_PASSWORD in hPanel → the app’s environment variables, then restart the app.',
      })
    }

    const client = ip(req)
    const { blocked, retryIn } = auth.throttle(client)
    if (blocked) {
      return res
        .status(429)
        .json({ error: `Too many wrong passwords. Try again in about ${retryIn} minute(s).` })
    }

    if (!auth.verifyPassword(req.body?.password)) {
      auth.recordFailure(client)
      return res.status(401).json({ error: 'That password is not right.' })
    }

    auth.recordSuccess(client)
    auth.issue(req, res, req.body?.name)
    res.json({ ok: true })
  })

  router.post('/logout', (req, res) => {
    auth.clear(req, res)
    res.json({ ok: true })
  })

  router.get('/me', (req, res) => {
    res.json({
      configured: auth.configured(),
      signedIn: Boolean(auth.session(req)),
      dataDir: store.DATA_DIR,
    })
  })

  // Everything below needs a valid session.
  router.use(auth.requireAuth)

  /* ---------- posts ---------- */

  router.get('/posts', (req, res) => {
    res.json({
      posts: store.list().map((p) => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        image: p.image,
        imageAlt: p.imageAlt,
        author: p.author,
        date: p.date,
        updated: p.updated,
        tags: p.tags,
        draft: p.draft,
        format: p.format,
        readingTime: p.readingTime,
      })),
      trash: store.listTrash().length,
    })
  })

  router.get('/posts/:slug', (req, res) => {
    const post = store.get(req.params.slug)
    if (!post) return res.status(404).json({ error: 'That post no longer exists.' })
    res.json({ post })
  })

  /**
   * Create or update. The checks below are the ones a writer cannot see the
   * consequences of themselves: a slug collision would overwrite somebody
   * else's article, and a missing image description costs image-search traffic
   * and makes the article unreadable to a screen reader. Both are refused only
   * for a post going LIVE — a draft can be saved half-finished.
   */
  router.put('/posts/:slug', (req, res) => {
    const body = req.body || {}
    const previous = req.params.slug === '_new' ? null : req.params.slug
    const slug = store.slugify(body.slug || body.title)

    if (!String(body.title || '').trim()) {
      return res.status(400).json({ error: 'Give the post a title first.' })
    }
    if (slug !== previous && store.exists(slug)) {
      return res.status(409).json({
        error: `The address /blogs/${slug} is already used by another post. Change the title or the address.`,
      })
    }

    if (body.draft !== true) {
      const problems = []
      if (!String(body.excerpt || '').trim()) {
        problems.push('a short summary (this is the grey text Google shows under the headline)')
      }
      if (!body.image) problems.push('a header image')
      else if (!String(body.imageAlt || '').trim()) problems.push('a description of the header image')

      const missingAlt = String(body.html || '').match(
        /<img\b(?![^>]*\balt\s*=\s*"[^"]*[^"\s][^"]*")[^>]*>/gi
      )
      if (missingAlt) {
        problems.push(
          `a description on ${missingAlt.length} image(s) inside the article — click each one and fill in "Image description"`
        )
      }

      if (problems.length) {
        return res.status(400).json({
          error: `Before this can go live it needs ${problems.join('; ')}.`,
          fields: problems,
        })
      }
    }

    let post
    try {
      post = store.save({ ...body, slug }, previous)
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Could not save that post.' })
    }

    publish()
    res.json({ post, url: `/blogs/${post.slug}` })
  })

  router.delete('/posts/:slug', (req, res) => {
    if (!store.remove(req.params.slug)) {
      return res.status(404).json({ error: 'That post no longer exists.' })
    }
    publish()
    res.json({ ok: true })
  })

  /* ---------- trash ---------- */

  router.get('/trash', (req, res) => {
    res.json({
      posts: store.listTrash().map((p) => ({
        slug: p.slug,
        title: p.title,
        date: p.date,
        updated: p.updated,
      })),
    })
  })

  router.post('/trash/:slug/restore', (req, res) => {
    const post = store.restore(req.params.slug)
    if (!post) return res.status(404).json({ error: 'Nothing to restore under that name.' })
    publish()
    res.json({ post })
  })

  router.delete('/trash/:slug', (req, res) => {
    if (!store.purge(req.params.slug)) {
      return res.status(404).json({ error: 'Nothing to delete under that name.' })
    }
    res.json({ ok: true })
  })

  /* ---------- images ---------- */

  router.get('/media', (req, res) => {
    res.json({ images: store.listImages() })
  })

  /**
   * The browser has already resized and re-encoded the file (admin/lib/
   * optimize.js) — `sharp` is deliberately not a server dependency, because its
   * native binaries are unreliable to install on shared hosting and HOSTING.md
   * builds locally for exactly that reason. So this route writes what it is
   * given and records the variant metadata that blog-images.js turns into a
   * srcset.
   */
  router.post('/media', async (req, res) => {
    const { name, master, variants, og, width, height } = req.body || {}
    if (!name || !master || !variants) {
      return res.status(400).json({ error: 'The upload was incomplete. Please try again.' })
    }

    const decode = (dataUrl) => {
      const comma = String(dataUrl).indexOf(',')
      if (comma < 0) throw new Error('bad image data')
      return Buffer.from(String(dataUrl).slice(comma + 1), 'base64')
    }

    try {
      await mkdir(store.IMAGES_DIR, { recursive: true })

      // A name already taken belongs to a different photo; suffix rather than
      // overwrite, or re-uploading "image.jpg" would silently replace whatever
      // an earlier article was using under that name.
      const ext = path.extname(name) || '.jpg'
      let base = store.slugify(path.basename(name, path.extname(name)))
      let candidate = `${base}${ext}`
      let n = 2
      while (store.listImages().some((i) => i.name === candidate)) {
        candidate = `${base}-${n++}${ext}`
      }
      const stem = path.basename(candidate, ext)

      await writeFile(store.imagePath(candidate), decode(master))
      const written = []
      for (const w of WIDTHS) {
        if (!variants[w]) continue
        await writeFile(store.imagePath(`${stem}-${w}.webp`), decode(variants[w]))
        written.push(Number(w))
      }
      if (og) await writeFile(store.imagePath(`${stem}-og.jpg`), decode(og))

      const url = `/blog-images/${candidate}`
      const entry = {
        widths: written,
        width: Number(width) || null,
        height: Number(height) || null,
        ...(og && { og: `/blog-images/${stem}-og.jpg` }),
      }

      const index = store.readImageIndex()
      index[url] = entry
      store.writeImageIndex(index)
      registerImages({ [url]: entry })

      res.json({ url, name: candidate, ...entry })
    } catch (err) {
      res.status(500).json({ error: `Could not save the image: ${err.message}` })
    }
  })

  router.delete('/media/:name', async (req, res) => {
    const url = `/blog-images/${path.basename(req.params.name)}`
    if (store.imageInUse(url)) {
      return res
        .status(409)
        .json({ error: 'That image is still used by a post. Remove it from the post first.' })
    }
    try {
      const ext = path.extname(req.params.name)
      const stem = path.basename(req.params.name, ext)
      await unlink(store.imagePath(req.params.name)).catch(() => {})
      for (const w of WIDTHS) await unlink(store.imagePath(`${stem}-${w}.webp`)).catch(() => {})
      await unlink(store.imagePath(`${stem}-og.jpg`)).catch(() => {})

      const index = store.readImageIndex()
      delete index[url]
      store.writeImageIndex(index)
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  /* ---------- backup ---------- */

  /**
   * There is no version control behind this content any more — that was the
   * trade for publishing without a pull request. One button that downloads
   * every article and image is the replacement, and it is deliberately a plain
   * zip of plain files: recoverable by hand, by anyone, without this app.
   */
  router.get('/backup.zip', (req, res) => {
    const stamp = new Date().toISOString().slice(0, 10)
    res.attachment(`devriz-blog-backup-${stamp}.zip`)
    const zip = new ZipArchive({ zlib: { level: 9 } })
    zip.on('error', () => res.destroy())
    zip.pipe(res)
    zip.directory(store.POSTS_DIR, 'blog')
    zip.directory(store.IMAGES_DIR, 'blog-images')
    zip.finalize()
  })

  /** Manual "rebuild the pages" — for after a deploy replaces dist/. */
  router.post('/republish', (req, res) => {
    const live = publish()
    res.json({ ok: true, published: live.length })
  })

  return { router, publicPosts, publish }
}
