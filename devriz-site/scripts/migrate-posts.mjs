/**
 * One-off repair for posts written in the old Decap editor.
 *
 *   node scripts/migrate-posts.mjs --dry     show what would change
 *   node scripts/migrate-posts.mjs           rewrite the files
 *   node scripts/migrate-posts.mjs --repo    operate on content/blog instead of
 *                                            the live content folder
 *
 * Two things went wrong in that editor, and both are visible in the published
 * pigmentation article today:
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
 * Posts already saved by the new editor (format: html) are skipped.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { load as parseYaml, dump as toYaml } from 'js-yaml'
import { marked } from 'marked'

import { POSTS_DIR } from '../server/store.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dry = process.argv.includes('--dry')
const dir = process.argv.includes('--repo') ? path.join(ROOT, 'content/blog') : POSTS_DIR

marked.setOptions({ gfm: true, breaks: false })

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

/** Undo the editor's escaping of markdown punctuation. */
const unescape = (text) => text.replace(/\\([#*_[\]()>`~\-+.!])/g, '$1')

/**
 * Rejoin the hard-wrapped lines. Blocks separated by two or more blank lines are
 * real paragraph breaks; a single blank line inside a block was a line wrap.
 *
 * List items and headings keep their own lines — joining those would merge a
 * whole list into one sentence.
 */
function unwrap(text) {
  return text
    .split(/\n\s*\n\s*\n+/)
    .map((block) =>
      block
        .split(/\n\s*\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .reduce((out, line) => {
          const structural = /^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|!\[|\|)/.test(line)
          const prev = out[out.length - 1]
          const prevStructural = prev && /^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|!\[|\|)/.test(prev)
          if (!prev || structural || prevStructural) out.push(line)
          else out[out.length - 1] = `${prev} ${line}`
          return out
        }, [])
        .join('\n')
    )
    .join('\n\n')
}

const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')) : []
if (!files.length) {
  console.log(`No posts found in ${dir}`)
  process.exit(0)
}

let changed = 0
for (const file of files) {
  const full = path.join(dir, file)
  const raw = readFileSync(full, 'utf8')
  const match = raw.match(FRONTMATTER)
  if (!match) {
    console.warn(`skip ${file}: no front matter`)
    continue
  }

  let front
  try {
    front = parseYaml(match[1]) || {}
  } catch {
    console.warn(`skip ${file}: front matter is not valid YAML`)
    continue
  }

  if (front.format === 'html') {
    console.log(`skip ${file}: already converted`)
    continue
  }

  const body = match[2] || ''
  const repaired = unwrap(unescape(body))
  const html = marked.parse(repaired).trim()

  const before = marked.parse(body)
  const count = (s, re) => (s.match(re) || []).length
  console.log(
    `\n${file}\n  headings: ${count(before, /<h[23]/g)} -> ${count(html, /<h[23]/g)}` +
      `   paragraphs: ${count(before, /<p>/g)} -> ${count(html, /<p>/g)}` +
      `   lists: ${count(before, /<[uo]l>/g)} -> ${count(html, /<[uo]l>/g)}`
  )

  if (dry) {
    console.log(`  --- first 220 chars after repair ---\n  ${html.slice(0, 220)}`)
    continue
  }

  front.format = 'html'
  writeFileSync(full, `---\n${toYaml(front, { lineWidth: 80 })}---\n${html}\n`, 'utf8')
  changed++
}

console.log(
  dry
    ? `\nDry run — nothing written. Re-run without --dry to apply.`
    : `\nRepaired ${changed} post(s) in ${dir}. Restart the app (or press Republish in /admin) to regenerate the pages.`
)
