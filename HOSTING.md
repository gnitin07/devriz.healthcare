# Hosting Devriz Healthcare on Hostinger

This site runs as a **Node app**, not as static files. `devriz-site/server.js`
reproduces what Vercel does — 51 redirects, 6 rewrites, the cache headers — by
reading `devriz-site/vercel.json` at boot, and adds the blog editor's API on top.

**Do not delete `vercel.json`.** It is not a leftover from Vercel; it is this
server's config file. Remove it and the app exits before serving a request.

## Why Node rather than static

The blog editor at `/admin` writes articles to disk and regenerates the pages
under `dist/blogs` the moment someone presses Publish. That needs a server that
stays running. Everything else — including all Sanity content, which the browser
fetches straight from `apicdn.sanity.io` — would work as static files.

## How a deploy actually works

hPanel → **Deployments** is connected to `gnitin07/devriz.healthcare`, branch
`main`, root directory `devriz-site`. Pushing to `main` is the deploy: Hostinger
clones the repo, runs `npm install` and `npm run build` (Node 22), then restarts
the app. Nothing is uploaded by hand and `dist/` is built on the server, which
is why it stays gitignored.

`sharp` and `vite` install fine there, so the install must NOT use `--omit=dev`
— the build needs both.

## Where the articles live — read this before changing it

Deploys are **atomic and versioned**. Each one is cloned into a brand new
directory and a symlink is flipped:

```
~/hbuilds/
├── current  →  versions/<uuid>      the live one
└── versions/
    ├── <uuid-a>/devriz-site/        previous deploy
    └── <uuid-b>/devriz-site/        this deploy
```

So **nothing written inside the app folder, or beside it, survives a deploy** —
the next deploy is a different directory entirely. Content stored there would
live exactly one deploy and then vanish, silently, along with every article
written in the meantime.

Articles and pictures therefore live in the account's home directory, outside
the versioned tree:

```
/home/u984942287/devriz-content/
├── blog/            one .md file per post
├── blog-images/     uploads and their compressed variants
├── trash/           deleted posts, restorable from /admin
└── images.json      variant metadata for the srcsets
```

**Set `BLOG_DATA_DIR` to that path** (next section). `server/store.mjs` also
detects the `hbuilds/versions/` layout and falls back to `~/devriz-content` on
its own, but that is a safety net, not the configuration — set the variable.

If content ever does end up somewhere a deploy will replace, the app prints
`ARTICLES WILL BE LOST ON THE NEXT DEPLOY` to the runtime log at boot. Treat
that as an outage.

Building on the server is safe with respect to content: a fresh `dist/` contains
only the articles that existed in the repo at build time, and `server.js`
re-renders every blog page from `BLOG_DATA_DIR` at boot.

Pictures uploaded through `/admin` are resized and compressed **in the writer's
browser**, so the running server never needs an image library — only `express`,
`archiver`, `js-yaml` and `marked`, all plain JavaScript.

## Environment variables

In the app's settings:

| Variable | Required | What it does |
|---|---|---|
| `ADMIN_PASSWORD` | **yes** | The one password that signs a writer in to `/admin`. Make it long. |
| `ADMIN_PASSWORD_HASH` | no | Use instead of the above to keep the plain password out of hPanel. Generate with `node server/auth.mjs "the password"`. |
| `BLOG_DATA_DIR` | **yes, on Hostinger** | `/home/u984942287/devriz-content` — outside the versioned deploy tree. See the section above for why this is not optional here. |
| `SITE_URL` | no | Defaults to `https://devrizhealthcare.com`. Used for canonical URLs and og: tags. |

Without a password the site serves normally, `/admin` loads and explains what is
missing, and the boot log says so loudly. Nobody can sign in.

The session cookie is signed with a key derived from the password, so **changing
the password signs everyone out immediately**.

## Repair the pre-existing post (once)

The old Decap editor escaped pasted markdown, so the pigmentation article was
published with literal `\## …` headings and every wrapped line as its own
paragraph. Run once, on the server:

```bash
node scripts/migrate-posts.mjs --dry
```

then without `--dry` to apply, then restart the app (or press **Rebuild the
pages** in `/admin`). Posts written in the new editor are skipped.

## Smoke test

| Visit | Expect |
|---|---|
| `/` | homepage loads, Sanity content appears |
| `/consult`, `/ai-scan`, `/privacy-policy` typed directly | render, URL stays put |
| `/blogs` | post list (prerendered) |
| `/blogs/what-is-skin-pigmentation-causes-and-care-guide` | the post, with real headings |
| `/blogs/does-not-exist` | **404**, not 200 |
| `/acne` | 301 to `/consult` |
| `/tag/anything` | 301 to `/blogs` |
| `/admin` | sign-in box; the password works |
| publish a test post | live at its URL immediately, listed on `/blogs`, in `sitemap.xml` |
| delete it | its URL returns 404; it appears in Trash |

The boot log is the fastest diagnostic — it reports how many posts were
rendered, where the content folder is, and whether a password is set.

## What replaced what

The previous editor was Decap CMS with GitHub OAuth: each writer needed a GitHub
account, work landed as a pull request, and publishing meant merging, rebuilding
locally and re-uploading. On Hostinger it never worked at all, because
`GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` were never set and `/api/auth`
returned 500.

`api/auth.js` and `api/callback.js` are left in the repository but are no longer
mounted by `server.js`. They can be deleted whenever the Vercel rollback below
is no longer wanted.

## Rollback

`vercel.json` stays authoritative for Vercel, and Vercel ignores `server.js`
entirely. Pointing the domain back at the Vercel address restores the previous
deploy with every redirect intact — but note that the blog editor will not work
there, because Vercel's filesystem is read-only and articles written since the
switch live only in `devriz-content/` on Hostinger. Download a backup from
`/admin` first.
