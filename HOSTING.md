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

## Where the articles live

Not in the repository, and **not inside the application root**.

Posts and uploaded pictures are written at runtime to `devriz-content/`, a
folder one level ABOVE the app:

```
<hosting root>/
├── devriz-content/          ← articles + pictures. Never deploy over this.
│   ├── blog/                  one .md file per post
│   ├── blog-images/           uploads and their compressed variants
│   ├── trash/                 deleted posts, restorable from /admin
│   └── images.json            variant metadata for the srcsets
└── devriz-site/             ← the application root: what you upload
    ├── server.js
    ├── dist/
    └── …
```

Deploying means uploading the app folder. If content lived inside it, every
deploy would overwrite — or silently revert — everything written since the last
one. Keeping it outside makes that impossible.

The folder is created and seeded from `devriz-site/content/blog` on first boot,
so there is nothing to set up by hand. Override the location with
`BLOG_DATA_DIR` if the host's layout requires it.

Deploying is still safe with respect to `dist/`: a freshly built `dist/` only
contains the articles that existed when it was built, and the server rebuilds
every blog page from `devriz-content/` at boot.

## Deploy

### 1. Build locally, not on the server

```bash
cd devriz-site
npm ci
npm run build
```

`npm run build` needs `sharp`, whose native binaries are unreliable to install on
shared hosting. Building here sidesteps that entirely: the server needs only
`express` and `archiver`, both plain dependencies with no native code.

Pictures uploaded through `/admin` are resized and compressed **in the writer's
browser** before upload, for the same reason — the server never needs an image
library.

`server.js` exits immediately if `dist/` is missing, so the build must exist
before the app starts.

### 2. Create the app

hPanel → **Web Apps** → new Node.js application:

| Field | Value |
|---|---|
| Node version | 20 or newer |
| Application root | the folder containing `server.js` (`devriz-site`) |
| Startup file | `server.js` |
| Install command | `npm install --omit=dev` |

`--omit=dev` skips `sharp`, `vite` and TipTap, which are only needed for the
build you already ran. Do not set `PORT` — Hostinger supplies it and `server.js`
reads it.

Upload the locally built `dist/` into the application root alongside
`server.js`, `vercel.json`, `server/` and `package.json`.

### 3. Environment variables

In the app's settings:

| Variable | Required | What it does |
|---|---|---|
| `ADMIN_PASSWORD` | **yes** | The one password that signs a writer in to `/admin`. Make it long. |
| `ADMIN_PASSWORD_HASH` | no | Use instead of the above to keep the plain password out of hPanel. Generate with `node server/auth.mjs "the password"`. |
| `BLOG_DATA_DIR` | no | Absolute path to the content folder, if the default sibling location does not suit. |
| `SITE_URL` | no | Defaults to `https://devrizhealthcare.com`. Used for canonical URLs and og: tags. |

Without a password the site serves normally, `/admin` loads and explains what is
missing, and the boot log says so loudly. Nobody can sign in.

The session cookie is signed with a key derived from the password, so **changing
the password signs everyone out immediately**.

### 4. Repair the pre-existing post (once)

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
