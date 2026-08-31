/**
 * Static-HTML generation for the blog, shared by TWO callers:
 *
 *   1. scripts/prerender-blog.mjs  — once, at the end of `npm run build`
 *   2. server/admin-api.mjs        — every time someone publishes, edits or
 *                                    deletes a post in /admin
 *
 * (2) is the whole point of this file existing separately. Publishing used to
 * mean a pull request, a merge, a local `npm run build` and an upload; now the
 * running server regenerates the blog pages and the article is live in under a
 * second. The HTML a crawler receives is identical either way because there is
 * only one implementation of it.
 *
 * Why static HTML at all: the site is a single-page React app, so without this
 * a crawler fetching /blogs/some-post gets an empty <div id="root">. Google
 * eventually runs the JavaScript; the WhatsApp, Facebook and LinkedIn
 * link-preview crawlers never do, and WhatsApp is where most of this blog's
 * readers come from.
 */
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import {
  resolveImage,
  resolveOgImage,
  rewriteBodyImages,
  HERO_SIZES,
  CARD_SIZES,
} from '../src/lib/blog-images.js'

export const SITE = process.env.SITE_URL || 'https://devrizhealthcare.com'

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

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
  html.replace(/<script type="application\/ld\+json">[\s\S]*?"FAQPage"[\s\S]*?<\/script>/i, '')

const addJsonLd = (html, obj) =>
  html.replace(
    '</head>',
    `    <script type="application/ld+json">${JSON.stringify(obj)}</script>\n  </head>`
  )

const injectBody = (html, markup) =>
  html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`)

/**
 * Posts are no longer bundled into the JavaScript at build time — they are
 * written by the admin panel while the server is running, so the app fetches
 * /api/posts.json instead. That fetch would make the article flash empty for a
 * moment on a hard load, right after the crawler-facing HTML above rendered it
 * perfectly. Embedding the same data the page was built from removes the flash:
 * React finds it synchronously and renders identical markup, then revalidates.
 *
 * </script> inside the JSON would end the tag early; escaping the slash is the
 * standard fix and is still valid JSON.
 */
const embedData = (html, data) =>
  html.replace(
    '</body>',
    `  <script id="__BLOG__" type="application/json">${JSON.stringify(data).replace(
      /<\//g,
      '<\\/'
    )}</script>\n  </body>`
  )

/* ---------- page markup (mirrors the React components' classes) ---------- */

const tagChips = (tags) =>
  tags.length ? `<div class="blog-tags">${tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''

const fmtDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Mirrors the <img> the React components render, attribute for attribute. */
const imgTag = (img, alt, { cls, sizes, eager }) => {
  if (!img) return ''
  return `<img${cls ? ` class="${cls}"` : ''} src="${esc(img.src)}"${
    img.srcset ? ` srcset="${esc(img.srcset)}" sizes="${esc(sizes)}"` : ''
  }${img.width ? ` width="${img.width}"` : ''}${
    img.height ? ` height="${img.height}"` : ''
  } alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`
}

/**
 * The sticky right-hand column. Included in the crawler's HTML rather than left
 * to React because the "recent blogs" links are internal links between
 * articles, and those are worth something to a crawler that never runs
 * JavaScript. The consultation button only works once React mounts, which is
 * the same deal as the CTA block at the foot of the article.
 */
function railMarkup(post, posts, distDir) {
  const recent = posts.filter((p) => p.slug !== post.slug).slice(0, 4)
  const cards = recent
    .map(
      (p) => `<a href="/blogs/${esc(p.slug)}">${
        p.img
          ? `<img src="${esc(p.img.src)}" alt="${esc(p.imageAlt)}" loading="lazy" decoding="async" />`
          : '<span class="rail-recent-ph"></span>'
      }<span class="rail-recent-text"><span>${esc(p.title)}</span><em>${p.readingTime} min read</em></span></a>`
    )
    .join('')

  return `<aside class="blog-rail">
${consultBanner(distDir, '', true)}
${cards ? `<nav class="rail-recent"><h3>Recent blogs from Devriz</h3>${cards}<a class="rail-recent-all" href="/blogs">See all articles →</a></nav>` : ''}
</aside>`
}

/** The supplied artwork. Mirrors the constants in BlogPostSection.jsx. */
const BANNER_DESKTOP = '/images/blog-consult-desktop.webp'
const BANNER_MOBILE = '/images/blog-consult-mobile.webp'
const BANNER_ALT =
  'Live dermatologist consult — ₹499 reduced to ₹49. Book your consultation.'

/**
 * Mirrors <ConsultBanner> in BlogPostSection.jsx. Keep the two in step.
 *
 * Emits nothing while the artwork is missing, matching the component's own
 * behaviour — an empty box on a live article reads as a broken page, and a
 * crawler should not be told about a button that is not there.
 */
const consultBanner = (distDir, cls = '', eager = false) => {
  const has = (src) => existsSync(path.join(distDir, src.replace(/^\//, '')))
  if (!has(BANNER_DESKTOP) || !has(BANNER_MOBILE)) return ''
  return `<button type="button" class="blog-consult-banner${
    cls ? ` ${cls}` : ''
  }" aria-label="Book your live dermatologist consultation for ₹49"><picture><source media="(min-width: 1024px)" srcset="${BANNER_DESKTOP}" /><img src="${BANNER_MOBILE}" alt="${esc(
    BANNER_ALT
  )}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" /></picture></button>`
}

function postMarkup(post, posts = [], distDir) {
  return `<section class="blog-section"><div class="blog-layout"><article class="blog-article">
<a href="/blogs" class="blog-back">← All articles</a>
<header class="blog-article-head">${tagChips(post.tags)}<h1>${esc(post.title)}</h1>
<div class="blog-meta"><span>${esc(post.author)}</span><span>${fmtDate(post.date)}</span><span>${post.readingTime} min read</span></div>
</header>
${imgTag(post.img, post.imageAlt, { cls: 'blog-hero-img', sizes: HERO_SIZES, eager: true })}
<div class="blog-body">${post.html}</div>
${consultBanner(distDir, 'lg:hidden')}
</article>
${railMarkup(post, posts, distDir)}
</div></section>`
}

function listMarkup(posts) {
  const cards = posts
    .map(
      (p) => `<a href="/blogs/${esc(p.slug)}" class="blog-card">
${p.img ? imgTag(p.img, p.imageAlt, { sizes: CARD_SIZES }) : '<div class="blog-card-ph"></div>'}
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

const LIST_TITLE = 'Skin, Hair & Body Care Blog | Devriz Healthcare'
const LIST_DESCRIPTION =
  'Doctor-backed guides on acne, pigmentation, hair fall and everyday skin care — written by the Devriz Healthcare team.'

/* ---------- public API ---------- */

/**
 * A post as the browser and the prerenderer both consume it: image paths
 * already resolved to their compressed variants, body images rewritten. The
 * store hands over the raw record; everything view-shaped is derived here so
 * the crawler's HTML and React's HTML cannot drift.
 */
export function present(post) {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || '',
    image: post.image || null,
    img: resolveImage(post.image),
    imageAlt: post.imageAlt || post.title || '',
    author: post.author || 'Devriz Healthcare Team',
    date: post.date ? new Date(post.date).toISOString() : null,
    updated: post.updated || null,
    tags: Array.isArray(post.tags) ? post.tags : [],
    seoTitle: post.seoTitle || null,
    seoDescription: post.seoDescription || null,
    readingTime: post.readingTime,
    html: rewriteBodyImages(post.html || ''),
  }
}

const write = (dir, html) => {
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'index.html'), html)
}

/** dist/blogs/index.html — the article list. */
export function renderIndex({ template, distDir, posts, site = SITE }) {
  const url = `${site}/blogs`
  let html = dropFaqSchema(template)
  html = setTitle(html, LIST_TITLE)
  html = setMeta(html, 'name', 'description', LIST_DESCRIPTION)
  html = setMeta(html, 'property', 'og:title', LIST_TITLE)
  html = setMeta(html, 'property', 'og:description', LIST_DESCRIPTION)
  html = setMeta(html, 'property', 'og:url', url)
  html = setMeta(html, 'name', 'twitter:title', LIST_TITLE)
  html = setMeta(html, 'name', 'twitter:description', LIST_DESCRIPTION)
  html = setCanonical(html, url)
  html = addJsonLd(html, {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Devriz Healthcare Blog',
    url,
    publisher: { '@type': 'Organization', name: 'Devriz Healthcare', url: site },
  })
  html = embedData(html, { posts })
  write(path.join(distDir, 'blogs'), injectBody(html, listMarkup(posts)))
}

/** dist/blogs/<slug>/index.html — one article. */
export function renderPost({ template, distDir, post, posts, site = SITE }) {
  const title = `${post.seoTitle || post.title} | Devriz Healthcare`
  const description = post.seoDescription || post.excerpt
  const url = `${site}/blogs/${post.slug}`
  // A 1200x630 JPEG, not the multi-MB upload: every WhatsApp share re-fetches
  // this, and the crawlers do not cache it the way a browser does.
  const image = resolveOgImage(post.image, site)

  let html = dropFaqSchema(template)
  html = setTitle(html, title)
  html = setMeta(html, 'name', 'description', description)
  html = setMeta(html, 'property', 'og:type', 'article')
  html = setMeta(html, 'property', 'og:title', post.seoTitle || post.title)
  html = setMeta(html, 'property', 'og:description', description)
  html = setMeta(html, 'property', 'og:url', url)
  html = setMeta(html, 'name', 'twitter:title', post.seoTitle || post.title)
  html = setMeta(html, 'name', 'twitter:description', description)
  if (image) {
    html = setMeta(html, 'property', 'og:image', image)
    html = setMeta(html, 'name', 'twitter:image', image)
    // The template inherits the homepage hero's 1920x1080. Our generated
    // preview is exactly 1200x630; anything else has unknown dimensions, and a
    // wrong value is worse than none.
    html = html.replace(/<meta property="og:image:(width|height)"[^>]*>/gi, '')
    if (/-og\.jpg$/.test(image)) {
      html = setMeta(html, 'property', 'og:image:width', '1200')
      html = setMeta(html, 'property', 'og:image:height', '630')
    }
  }
  html = setCanonical(html, url)
  html = addJsonLd(html, {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    author: { '@type': 'Organization', name: post.author, url: site },
    publisher: {
      '@type': 'Organization',
      name: 'Devriz Healthcare',
      url: site,
      logo: { '@type': 'ImageObject', url: `${site}/images/logo-r.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(image && { image }),
    ...(post.tags.length && { keywords: post.tags.join(', ') }),
  })
  html = addJsonLd(html, {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: site },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${site}/blogs` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  })
  // `posts` as well: the "Keep reading" cards at the foot of every article need
  // the others, and the list is small enough that shipping it costs nothing.
  html = embedData(html, { post, posts })
  write(path.join(distDir, 'blogs', post.slug), injectBody(html, postMarkup(post, posts, distDir)))
}

/** Remove an unpublished or deleted article's page so the URL 404s again. */
export function removePost({ distDir, slug }) {
  const dir = path.join(distDir, 'blogs', slug)
  // path.join normalises away any ../ — confirm we are still inside dist/blogs
  if (dir.startsWith(path.join(distDir, 'blogs') + path.sep) && existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true })
  }
}

export function renderSitemap({ distDir, posts, site = SITE }) {
  const urls = [
    { loc: `${site}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${site}/blogs`, changefreq: 'daily', priority: '0.8' },
    { loc: `${site}/consult`, changefreq: 'monthly', priority: '0.9' },
    { loc: `${site}/ai-scan`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${site}/privacy-policy`, changefreq: 'yearly', priority: '0.3' },
    ...posts.map((p) => ({
      loc: `${site}/blogs/${p.slug}`,
      lastmod: (p.updated || p.date) ? (p.updated || p.date).slice(0, 10) : undefined,
      changefreq: 'monthly',
      priority: '0.7',
    })),
  ]
  writeFileSync(
    path.join(distDir, 'sitemap.xml'),
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
  return urls.length
}

/**
 * Regenerate every blog page from scratch. Called once at the end of the build,
 * and again after any publish — one post's change moves it in the index, in the
 * sitemap and in the "Keep reading" cards of every other article, so at this
 * size there is no useful "just rebuild that page" shortcut.
 */
export function renderAll({ distDir, posts, site = SITE }) {
  const template = readFileSync(path.join(distDir, 'index.html'), 'utf8')
  const live = posts.filter((p) => !p.draft).map(present)

  renderIndex({ template, distDir, posts: live, site })
  for (const post of live) renderPost({ template, distDir, post, posts: live, site })

  // Anything under dist/blogs that is no longer a live article must stop being
  // served: a post switched back to draft, deleted into the trash, or renamed
  // to a new address.
  //
  // This scans the OUTPUT rather than the input. Deriving it from `posts` was
  // wrong in the case that matters most — a deleted post has left the content
  // folder entirely, so it is absent from `posts` too, and its page would sit
  // in dist/ answering 200 for ever.
  const liveSlugs = new Set(live.map((p) => p.slug))
  const blogsDir = path.join(distDir, 'blogs')
  if (existsSync(blogsDir)) {
    for (const entry of readdirSync(blogsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !liveSlugs.has(entry.name)) {
        removePost({ distDir, slug: entry.name })
      }
    }
  }

  const urlCount = renderSitemap({ distDir, posts: live, site })
  return { posts: live, urlCount }
}

/**
 * Images with no alt text: invisible in Google Images and silent to a screen
 * reader. The admin panel now refuses to publish one, so this is a backstop for
 * posts that predate it — a warning, never a failure, because a live post
 * missing alt text is bad and a site that cannot deploy at all is worse.
 */
export function auditAltText(posts) {
  const offenders = []
  for (const post of posts) {
    for (const [, tag] of post.html.matchAll(/<img\b([^>]*)>/gi)) {
      const alt = tag.match(/\balt="([^"]*)"/i)
      if (!alt || !alt[1].trim()) {
        const src = (tag.match(/\bsrc="([^"]*)"/i) || [, '(unknown)'])[1]
        offenders.push(`${post.slug} → ${src}`)
      }
    }
    if (post.img && !post.imageAlt.trim()) offenders.push(`${post.slug} → header image`)
  }
  return offenders
}
