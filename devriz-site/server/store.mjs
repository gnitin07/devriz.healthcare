/**
 * The blog's content store: reading and writing the articles themselves.
 *
 * WHERE THE FILES LIVE, and why it is not `devriz-site/content/`
 * -------------------------------------------------------------
 * Posts are now written by the running server, not by a build. That makes the
 * repository the wrong home for them: deploying means uploading the app folder
 * to Hostinger, and an upload that contains `content/` would overwrite — or
 * silently revert — every article written since the last deploy. Losing a
 * colleague's week of work to a routine deploy is the kind of failure that only
 * shows up once, expensively.
 *
 * So content lives one level ABOVE the application root, in a sibling folder
 * (`devriz-content/`) that no deploy ever touches. On first boot the folder is
 * created and seeded from the repository's `content/blog` and
 * `public/blog-images`, so nothing has to be moved by hand and the existing
 * post survives the switch.
 *
 * Override with BLOG_DATA_DIR if the host's layout needs it.
 *
 * FILE FORMAT
 * -----------
 * One `.md` file per post: YAML front matter, then the body. `format: html` in
 * the front matter marks a post written in the new editor, whose body is HTML
 * and must not go through the markdown parser. Posts without that key are the
 * old markdown ones and still render exactly as before — which is why no
 * migration is required to deploy this.
 */
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
  rmSync,
  copyFileSync,
  statSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { load as parseYaml, dump as toYaml } from 'js-yaml'
import { marked } from 'marked'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const DATA_DIR =
  process.env.BLOG_DATA_DIR || path.resolve(ROOT, '..', 'devriz-content')

export const POSTS_DIR = path.join(DATA_DIR, 'blog')
export const IMAGES_DIR = path.join(DATA_DIR, 'blog-images')
export const TRASH_DIR = path.join(DATA_DIR, 'trash')
/** Compressed-variant metadata for images uploaded through the admin panel. */
const IMAGE_INDEX = path.join(DATA_DIR, 'images.json')

marked.setOptions({ gfm: true, breaks: false })

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

/* ---------- first-boot seeding ---------- */

/**
 * Copy the repository's committed content into the data folder the first time
 * the server starts. Only ever fills gaps: a file that already exists outside
 * is newer than the one in the repo by definition, and is never overwritten.
 */
export function ensureDataDir() {
  for (const dir of [DATA_DIR, POSTS_DIR, IMAGES_DIR, TRASH_DIR]) {
    mkdirSync(dir, { recursive: true })
  }

  const seed = (from, to, filter) => {
    if (!existsSync(from)) return 0
    let n = 0
    for (const name of readdirSync(from)) {
      if (filter && !filter(name)) continue
      const src = path.join(from, name)
      const dest = path.join(to, name)
      if (!statSync(src).isFile() || existsSync(dest)) continue
      copyFileSync(src, dest)
      n++
    }
    return n
  }

  const posts = seed(path.join(ROOT, 'content/blog'), POSTS_DIR, (f) => f.endsWith('.md'))
  // Only the originals — the -640.webp / -og.jpg derivatives are regenerated
  // from them and would otherwise be mistaken for uploads of their own.
  const images = seed(
    path.join(ROOT, 'public/blog-images'),
    IMAGES_DIR,
    (f) => !/-(\d+\.webp|og\.jpg)$/i.test(f)
  )
  return { posts, images, dir: DATA_DIR }
}

/* ---------- HTML safety ---------- */

/**
 * The editor is behind a password and used by one trusted colleague, so this is
 * not a hostile-input sanitiser — it is a guard against a bad paste. Copying a
 * block out of a web page can drag along a tracking <script>, an ad <iframe> or
 * an inline event handler, and any of those landing in an article would break
 * the page for every visitor. Structure, links and images survive; anything
 * that can execute does not.
 */
export function sanitize(html) {
  return String(html || '')
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta)\b[^>]*\/?>/gi, '')
    // on… handlers, quoted or bare
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*'\s*javascript:[^']*'/gi, "$1='#'")
}

/* ---------- helpers ---------- */

export const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled'

/** Strip tags so the word count reflects prose, not markup. */
const textOf = (html) =>
  String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** ~200 words per minute, rounded, minimum 1. */
const readingTime = (html) => Math.max(1, Math.round(textOf(html).split(/\s+/).length / 200))

const safeName = (slug) => {
  const clean = slugify(slug)
  const file = path.join(POSTS_DIR, `${clean}.md`)
  // Belt and braces: slugify cannot emit a separator, but the file path is
  // built from request input and this is the one place it touches the disk.
  if (!file.startsWith(POSTS_DIR + path.sep)) throw new Error('bad slug')
  return { slug: clean, file }
}

/* ---------- read ---------- */

function parse(file, raw) {
  const slug = path.basename(file, '.md')
  const match = raw.match(FRONTMATTER)
  if (!match) return null

  let data
  try {
    data = parseYaml(match[1]) || {}
  } catch {
    // A malformed post must not take the whole blog down.
    return null
  }

  const body = match[2] || ''
  // Old posts are markdown; anything written in the new editor says so.
  const html = data.format === 'html' ? sanitize(body) : marked.parse(body)

  return {
    slug,
    title: data.title || slug,
    excerpt: data.excerpt || '',
    image: data.image || null,
    imageAlt: data.imageAlt || '',
    author: data.author || 'Devriz Healthcare Team',
    date: data.date ? new Date(data.date).toISOString() : null,
    updated: data.updated ? new Date(data.updated).toISOString() : null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
    draft: data.draft === true,
    format: data.format === 'html' ? 'html' : 'markdown',
    readingTime: readingTime(html),
    html,
  }
}

const readDir = (dir) => {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      try {
        return parse(f, readFileSync(path.join(dir, f), 'utf8'))
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

/**
 * Read posts from an arbitrary folder. `npm run build` uses this to render
 * whatever is committed under content/blog, without going anywhere near the
 * live content folder — which only exists on the server.
 */
export const listFrom = (dir) => readDir(dir)

/** Every post, drafts included. Newest first. */
export const list = () => readDir(POSTS_DIR)

/** Live posts only — what the website and the prerenderer render. */
export const listPublished = () => list().filter((p) => !p.draft)

export const get = (slug) => list().find((p) => p.slug === slug) || null

export const listTrash = () => readDir(TRASH_DIR)

export const exists = (slug) => existsSync(safeName(slug).file)

/* ---------- write ---------- */

/**
 * Create or update a post. `previousSlug` renames: the file moves, so editing
 * the address of a published article does not leave a duplicate behind.
 * Returns the saved post.
 */
export function save(input, previousSlug) {
  const { slug, file } = safeName(input.slug || input.title)

  if (previousSlug && previousSlug !== slug) {
    const old = safeName(previousSlug)
    if (existsSync(old.file)) renameSync(old.file, file)
  }

  const now = new Date().toISOString()
  const existing = existsSync(file) ? get(slug) : null

  const front = {
    title: String(input.title || '').trim() || 'Untitled',
    // Set once, on first publish, and preserved from then on: changing the
    // publish date of a live article moves it in the sitemap and tells Google
    // it is new content when it is not.
    date: input.date || existing?.date || now,
    updated: now,
    excerpt: String(input.excerpt || '').trim(),
    image: input.image || null,
    imageAlt: String(input.imageAlt || '').trim(),
    tags: Array.isArray(input.tags) ? input.tags.filter(Boolean) : [],
    author: String(input.author || '').trim() || 'Devriz Healthcare Team',
    seoTitle: String(input.seoTitle || '').trim() || null,
    seoDescription: String(input.seoDescription || '').trim() || null,
    draft: input.draft === true,
    format: 'html',
  }

  const body = sanitize(input.html || '')
  writeFileSync(file, `---\n${toYaml(front, { lineWidth: 80 })}---\n${body}\n`, 'utf8')
  return get(slug)
}

/**
 * Delete is a move, never an unlink. A non-technical writer clicking the wrong
 * row must be one click away from undoing it, and there is no version control
 * behind this content to fall back on.
 */
export function remove(slug) {
  const { file } = safeName(slug)
  if (!existsSync(file)) return false
  mkdirSync(TRASH_DIR, { recursive: true })
  let dest = path.join(TRASH_DIR, `${slugify(slug)}.md`)
  if (existsSync(dest)) dest = path.join(TRASH_DIR, `${slugify(slug)}-${Date.now()}.md`)
  renameSync(file, dest)
  return true
}

/** Bring a trashed post back. It returns as a draft, never straight to live. */
export function restore(slug) {
  const clean = slugify(slug)
  const from = path.join(TRASH_DIR, `${clean}.md`)
  if (!from.startsWith(TRASH_DIR + path.sep) || !existsSync(from)) return null

  const raw = readFileSync(from, 'utf8')
  const post = parse(`${clean}.md`, raw)
  if (!post) return null

  // A slug taken by a newer post while this one sat in the trash.
  let target = clean
  while (exists(target)) target = `${target}-restored`

  rmSync(from, { force: true })
  return save({ ...post, slug: target, draft: true })
}

/** Permanent. Only ever reached from the trash view, behind a confirmation. */
export function purge(slug) {
  const file = path.join(TRASH_DIR, `${slugify(slug)}.md`)
  if (!file.startsWith(TRASH_DIR + path.sep) || !existsSync(file)) return false
  rmSync(file, { force: true })
  return true
}

/* ---------- images ---------- */

/**
 * Uploads are compressed in the browser before they are sent (see
 * admin/lib/optimize.js), because `sharp` cannot be relied on to install on
 * Hostinger — HOSTING.md deliberately keeps it out of the server's
 * dependencies. The server therefore only stores what it is given and records
 * the variant metadata that blog-images.js needs to build a srcset.
 */
export function readImageIndex() {
  try {
    return JSON.parse(readFileSync(IMAGE_INDEX, 'utf8'))
  } catch {
    return {}
  }
}

export function writeImageIndex(index) {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(IMAGE_INDEX, JSON.stringify(index, null, 2), 'utf8')
}

export function imagePath(name) {
  const clean = path.basename(String(name || ''))
  const file = path.join(IMAGES_DIR, clean)
  if (!file.startsWith(IMAGES_DIR + path.sep)) throw new Error('bad image name')
  return file
}

/** Uploads only — the generated -640.webp / -og.jpg variants stay hidden. */
export function listImages() {
  if (!existsSync(IMAGES_DIR)) return []
  const index = readImageIndex()
  return readdirSync(IMAGES_DIR)
    .filter((f) => !/-(\d+\.webp|og\.jpg)$/i.test(f) && !f.startsWith('.'))
    .map((name) => {
      const url = `/blog-images/${name}`
      const stat = statSync(path.join(IMAGES_DIR, name))
      return {
        name,
        url,
        size: stat.size,
        modified: stat.mtime.toISOString(),
        ...(index[url] || {}),
      }
    })
    .sort((a, b) => b.modified.localeCompare(a.modified))
}

/** True if any post still points at this image — checked before deleting one. */
export function imageInUse(url) {
  return list().some((p) => p.image === url || p.html.includes(url))
}
