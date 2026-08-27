/**
 * Command-line front end for the old-editor repair. The logic itself lives in
 * server/repair.mjs, because the same repair is offered as a button in /admin —
 * this host has no shell turned on, and turning SSH on to run a one-off fix is
 * a worse answer than clicking a button.
 *
 *   node scripts/migrate-posts.mjs --dry     show what would change
 *   node scripts/migrate-posts.mjs           rewrite the files
 *   node scripts/migrate-posts.mjs --repo    operate on content/blog rather
 *                                            than the live content folder
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { POSTS_DIR } from '../server/store.mjs'
import { inspect, repair } from '../server/repair.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dry = process.argv.includes('--dry')
const dir = process.argv.includes('--repo') ? path.join(ROOT, 'content/blog') : POSTS_DIR

const pending = inspect(dir)
if (!pending.length) {
  console.log(`Nothing to repair in ${dir} — every post is already converted.`)
  process.exit(0)
}

for (const p of pending) {
  console.log(
    `\n${p.file}\n  headings: ${p.before.headings} -> ${p.after.headings}` +
      `   paragraphs: ${p.before.paragraphs} -> ${p.after.paragraphs}` +
      `   lists: ${p.before.lists} -> ${p.after.lists}`
  )
  if (dry) console.log(`  --- first 220 chars after repair ---\n  ${p.html.slice(0, 220)}`)
}

if (dry) {
  console.log('\nDry run — nothing written. Re-run without --dry to apply.')
} else {
  repair(dir)
  console.log(
    `\nRepaired ${pending.length} post(s) in ${dir}.\n` +
      'Restart the app, or press "Rebuild the pages" in /admin, to regenerate them.'
  )
}
