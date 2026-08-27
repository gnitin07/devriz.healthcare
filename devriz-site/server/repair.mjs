/**
 * Repair for posts written in the old Decap editor.
 *
 * Two things went wrong in that editor, and both are visible in the published
 * pigmentation article:
 *
 * 1. ESCAPED MARKDOWN. Pasting markdown into its rich-text box escaped the
 *    punctuation instead of reading it, so the file contains
 *    "\## What pigmentation actually is" and "\*Sun tan.\*". Those render as
 *    literal text — the article has no <h2> at all, which is exactly the
 *    structure Google reads to understand a page.
 *
 * 2. WRAPPED LINES BECAME PARAGRAPHS. It hard-wrapped at ~80 characters and put
 *    a blank line between every wrapped line, so markdown reads each ONE as its
 *    own paragraph. A four-line sentence renders as four paragraphs with a gap
 *    between each.
 *
 * The wrapping is what makes this safely automatable: one blank line separates
 * lines of the same paragraph, two or more separate real paragraphs. Anything
 * that does not match that shape is left alone.
 *
 * Lives here rather than in scripts/ because the host has no shell by default —
 * SSH is off, and asking someone to turn it on to run a one-line repair is a
 * worse answer than a button in /admin. scripts/migrate-posts.mjs calls the
 * same functions for anyone who does have a terminal.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { load as parseYaml, dump as toYaml } from 'js-yaml'
import { marked } from 'marked'

import { POSTS_DIR } from './store.mjs'

marked.setOptions({ gfm: true, breaks: false })

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
const STRUCTURAL = /^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|!\[|\|)/

/** Undo the editor's escaping of markdown punctuation. */
export const unescapeMarkdown = (text) => text.replace(/\\([#*_[\]()>`~\-+.!])/g, '$1')

/**
 * Rejoin the hard-wrapped lines. Blocks separated by two or more blank lines are
 * real paragraph breaks; a single blank line inside a block was a line wrap.
 *
 * List items and headings keep their own lines — joining those would merge a
 * whole list into one sentence.
 */
export function unwrap(text) {
  return text
    .split(/\n\s*\n\s*\n+/)
    .map((block) =>
      block
        .split(/\n\s*\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .reduce((out, line) => {
          const prev = out[out.length - 1]
          if (!prev || STRUCTURAL.test(line) || STRUCTURAL.test(prev)) out.push(line)
          else out[out.length - 1] = `${prev} ${line}`
          return out
        }, [])
        .join('\n')
    )
    .join('\n\n')
}

const count = (s, re) => (s.match(re) || []).length
const shape = (html) => ({
  headings: count(html, /<h[234]/g),
  paragraphs: count(html, /<p>/g),
  lists: count(html, /<[uo]l>/g),
})

/**
 * What a repair would do, without doing it. Returns one entry per post that
 * still needs converting; a post already saved by the new editor
 * (`format: html`) is skipped.
 */
export function inspect(dir = POSTS_DIR) {
  if (!existsSync(dir)) return []

  const out = []
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const raw = readFileSync(path.join(dir, file), 'utf8')
    const match = raw.match(FRONTMATTER)
    if (!match) continue

    let front
    try {
      front = parseYaml(match[1]) || {}
    } catch {
      continue
    }
    if (front.format === 'html') continue

    const body = match[2] || ''
    const html = marked.parse(unwrap(unescapeMarkdown(body))).trim()
    out.push({
      file,
      slug: file.replace(/\.md$/, ''),
      title: front.title || file,
      before: shape(marked.parse(body)),
      after: shape(html),
      html,
      front,
    })
  }
  return out
}

/** How many posts are still in the old format. */
export const pendingCount = (dir = POSTS_DIR) => inspect(dir).length

/** Apply the repair. Returns a summary per post, for showing to the writer. */
export function repair(dir = POSTS_DIR) {
  const found = inspect(dir)
  for (const item of found) {
    const front = { ...item.front, format: 'html' }
    writeFileSync(
      path.join(dir, item.file),
      `---\n${toYaml(front, { lineWidth: 80 })}---\n${item.html}\n`,
      'utf8'
    )
  }
  return found.map(({ slug, title, before, after }) => ({ slug, title, before, after }))
}
