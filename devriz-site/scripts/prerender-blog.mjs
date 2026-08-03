// Turn every markdown post into a real static HTML page under dist/blogs/.
//
// Why this exists: the site is a single-page React app, so without this step a
// crawler fetching /blogs/some-post receives an empty <div id="root"> and has
// to run JavaScript to see anything. Google eventually does; the WhatsApp,
// Facebook and LinkedIn link-preview crawlers never do. Baking the article,
// its <title>, description and og: tags into the served HTML fixes both at
// once — fast indexing, and link previews that show the header image.
//
// React still takes over on load; this is what the visitor's browser (and the
// crawler) gets before any JavaScript runs.
//
// Runs automatically after `vite build`.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'
import { load as parseYaml } from 'js-yaml'

// fileURLToPath rather than import.meta.dirname: the latter is undefined on
// Node 18 and early 20, which is what the deploy host may still be running.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT = path.join(ROOT, 'content/blog')
const DIST = path.join(ROOT, 'dist')
const SITE = 'https://devrizhealthcare.com'

marked.setOptions({ gfm: true, breaks: false })

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

function loadPosts() {
  if (!existsSync(CONTENT)) return []
  return readdirSync(CONTENT)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const raw = readFileSync(path.join(CONTENT, file), 'utf8')
      const m = raw.match(FRONTMATTER)
      if (!m) return null
      let data
      try {
        data = parseYaml(m[1]) || {}
      } catch {
        console.warn(`skip ${file}: front matter is not valid YAML`)
        return null
      }
      const body = m[2] || ''
      return {
        slug: file.replace(/\.md$/, ''),
        title: data.title || file,
        excerpt: data.excerpt || '',
        image: data.image || null,
        imageAlt: data.imageAlt || data.title || '',
        author: data.author || 'Devriz Healthcare Team',
        date: data.date ? new Date(data.date).toISOString() : null,
        tags: Array.isArray(data.tags) ? data.tags : [],
        seoTitle: data.seoTitle || null,
        draft: data.draft === true,
        readingTime: Math.max(1, Math.round(body.trim().split(/\s+/).length / 200)),
        html: marked.parse(body),
      }
    })
    .filter((p) => p && !p.draft)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

/* ---------- head rewriting on top of the built index.html ---------- */

// [^>]* spans newlines, so this matches the multi-line meta tags in index.html
const setMeta = (html, attr, key, value) => {
  if (!value) return html
  const re = new RegExp(`<meta\\b[^>]*\\b${attr}="${key}"[^>]*>`, 'i')
  const tag = `<meta ${attr}="${key}" content="${esc(value)}" />`
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `    ${tag}\n  </head>`)
}

const setCanonical = (html, url) =>
  html.replace(/<link\b[^>]*rel="canonical"[^>]*>/i, `<link rel="canonical" href="${esc(url)}" />`)

const setTitle = (html, title) =>
  html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`)

// The homepage FAQ schema must not travel onto blog pages — structured data
// that doesn't describe the page it sits on is a rich-result violation.
const dropFaqSchema = (html) =>
  html.replace(
    /<script type="application\/ld\+json">[\s\S]*?"FAQPage"[\s\S]*?<\/script>/i,
    ''
  )

const addJsonLd = (html, obj) =>
  html.replace(
    '</head>',
    `    <script type="application/ld+json">${JSON.stringify(obj)}</script>\n  </head>`
  )

const injectBody = (html, markup) =>
  html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`)

/* ---------- page markup (mirrors the React components' classes) ---------- */

const tagChips = (tags) =>
  tags.length ? `<div class="blog-tags">${tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''

const fmtDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function postMarkup(post) {
  return `<section class="blog-section"><article class="blog-article">
<a href="/blogs" class="blog-back">← All articles</a>
<header class="blog-article-head">${tagChips(post.tags)}<h1>${esc(post.title)}</h1>
<div class="blog-meta"><span>${esc(post.author)}</span><span>${fmtDate(post.date)}</span><span>${post.readingTime} min read</span></div>
</header>
${post.image ? `<img class="blog-hero-img" src="${esc(post.image)}" alt="${esc(post.imageAlt)}" />` : ''}
<div class="blog-body">${post.html}</div>
</article></section>`
}

function listMarkup(posts) {
  const cards = posts
    .map(
      (p) => `<a href="/blogs/${esc(p.slug)}" class="blog-card">
${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.imageAlt)}" />` : '<div class="blog-card-ph"></div>'}
<div class="blog-card-body">${tagChips(p.tags.slice(0, 3))}<h2>${esc(p.title)}</h2><p>${esc(p.excerpt)}</p>
<div class="blog-meta"><span>${fmtDate(p.date)}</span><span>${p.readingTime} min read</span></div></div></a>`
    )
    .join('')
  return `<section class="blog-section"><div class="blog-inner">
<header class="blog-header"><p class="section-eyebrow text-teal">Devriz Healthcare Blog</p>
<h1>Skin, hair &amp; body care, explained by experts</h1>
<p class="blog-sub">Practical, doctor-backed answers to the questions we hear every day in consultations.</p></header>
${cards ? `<div class="blog-grid">${cards}</div>` : '<p class="blog-empty">First articles are on their way — check back soon.</p>'}
</div></section>`
}

/* ---------- build ---------- */

const template = readFileSync(path.join(DIST, 'index.html'), 'utf8')
const posts = loadPosts()

const write = (dir, html) => {
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'index.html'), html)
}

// /blogs — the index
{
  const title = 'Skin, Hair & Body Care Blog | Devriz Healthcare'
  const description =
    'Doctor-backed guides on acne, pigmentation, hair fall and everyday skin care — written by the Devriz Healthcare team.'
  const url = `${SITE}/blogs`
  let html = dropFaqSchema(template)
  html = setTitle(html, title)
  html = setMeta(html, 'name', 'description', description)
  html = setMeta(html, 'property', 'og:title', title)
  html = setMeta(html, 'property', 'og:description', description)
  html = setMeta(html, 'property', 'og:url', url)
  html = setMeta(html, 'name', 'twitter:title', title)
  html = setMeta(html, 'name', 'twitter:description', description)
  html = setCanonical(html, url)
  html = addJsonLd(html, {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Devriz Healthcare Blog',
    url,
    publisher: { '@type': 'Organization', name: 'Devriz Healthcare', url: SITE },
  })
  write(path.join(DIST, 'blogs'), injectBody(html, listMarkup(posts)))
}

// /blogs/<slug> — one static page per article
for (const post of posts) {
  const title = `${post.seoTitle || post.title} | Devriz Healthcare`
  const url = `${SITE}/blogs/${post.slug}`
  const image = post.image ? `${SITE}${post.image}` : null

  let html = dropFaqSchema(template)
  html = setTitle(html, title)
  html = setMeta(html, 'name', 'description', post.excerpt)
  html = setMeta(html, 'property', 'og:type', 'article')
  html = setMeta(html, 'property', 'og:title', post.seoTitle || post.title)
  html = setMeta(html, 'property', 'og:description', post.excerpt)
  html = setMeta(html, 'property', 'og:url', url)
  html = setMeta(html, 'name', 'twitter:title', post.seoTitle || post.title)
  html = setMeta(html, 'name', 'twitter:description', post.excerpt)
  if (image) {
    html = setMeta(html, 'property', 'og:image', image)
    html = setMeta(html, 'name', 'twitter:image', image)
    // the homepage hero is 1920x1080; a post image is not, so drop the lie
    html = html.replace(/<meta property="og:image:(width|height)"[^>]*>/gi, '')
  }
  html = setCanonical(html, url)
  html = addJsonLd(html, {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: post.author, url: SITE },
    publisher: {
      '@type': 'Organization',
      name: 'Devriz Healthcare',
      url: SITE,
      logo: { '@type': 'ImageObject', url: `${SITE}/images/logo-r.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(image && { image }),
    ...(post.tags.length && { keywords: post.tags.join(', ') }),
  })
  html = addJsonLd(html, {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blogs` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  })
  write(path.join(DIST, 'blogs', post.slug), injectBody(html, postMarkup(post)))
}

// sitemap — static pages plus every article, so Google finds new posts fast
const urls = [
  { loc: `${SITE}/`, changefreq: 'weekly', priority: '1.0' },
  { loc: `${SITE}/blogs`, changefreq: 'daily', priority: '0.8' },
  { loc: `${SITE}/consult`, changefreq: 'monthly', priority: '0.9' },
  { loc: `${SITE}/ai-scan`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${SITE}/privacy-policy`, changefreq: 'yearly', priority: '0.3' },
  ...posts.map((p) => ({
    loc: `${SITE}/blogs/${p.slug}`,
    lastmod: p.date ? p.date.slice(0, 10) : undefined,
    changefreq: 'monthly',
    priority: '0.7',
  })),
]
writeFileSync(
  path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url>\n    <loc>${u.loc}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
  )
  .join('\n')}
</urlset>\n`
)

console.log(`prerendered ${posts.length} post page(s) + /blogs, sitemap has ${urls.length} URLs`)
