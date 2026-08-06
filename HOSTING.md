# Hosting Devriz Healthcare on Hostinger

This site runs as a **Node app**, not as static files. `devriz-site/server.js`
reproduces what Vercel does — 51 redirects, 6 rewrites, the cache headers, and
the two `/api/*` routes — by reading `devriz-site/vercel.json` at boot.

**Do not delete `vercel.json`.** It is not a leftover from Vercel; it is this
server's config file. Remove it and the app exits before serving a request.

## Why Node rather than static

The blog editor at `/admin` signs writers in through GitHub OAuth, handled by
`api/auth.js` and `api/callback.js`. Those need a server. Everything else —
including all Sanity content, which the browser fetches straight from
`apicdn.sanity.io` — would work as static files.

## Deploy

### 1. Build locally, not on the server

```bash
cd devriz-site
npm ci
npm run build
```

`npm run build` needs `sharp`, whose native binaries are unreliable to install
on shared hosting. Building here sidesteps that entirely: the server then needs
only `express`, which is a plain dependency.

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

`--omit=dev` skips `sharp` and `vite`, which are only needed for the build you
already ran. Do not set `PORT` — Hostinger supplies it and `server.js` reads it.

Upload the locally built `dist/` into the application root alongside
`server.js`, `vercel.json`, `api/` and `package.json`.

### 3. Environment variables

In the app's settings:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

Without them the site serves normally but `/api/auth` returns 500 and nobody
can sign in to `/admin`.

### 4. GitHub OAuth app

Set the Authorization callback URL to `https://devrizhealthcare.com/api/callback`.
While testing on the temporary Hostinger address, point it there instead — a
mismatch is rejected by GitHub with a redirect_uri error.

`devriz-site/public/admin/config.yml` has `base_url: https://devrizhealthcare.com`.
It must equal whatever domain you are actually signing in from.

## Smoke test before touching DNS

Use the temporary `*.hostingersite.com` address. The domain still points at
Vercel at this stage, so nothing is at risk.

| Visit | Expect |
|---|---|
| `/` | homepage loads, Sanity content appears |
| `/consult`, `/ai-scan`, `/privacy-policy` typed directly | render, URL stays put |
| `/blogs` | post list (prerendered) |
| `/blogs/what-is-skin-pigmentation-causes-and-care-guide` | the post |
| `/acne` | 301 to `/consult` |
| `/tag/anything` | 301 to `/blogs` |
| `/admin` | editor loads, GitHub sign-in completes |

`/api/auth` is the one to watch. It builds GitHub's `redirect_uri` from the
`x-forwarded-proto` and `x-forwarded-host` headers. If Hostinger's proxy does
not forward them, you get sent to the wrong host and sign-in fails — visible
immediately in the URL GitHub bounces you to.

## Rollback

`vercel.json` stays authoritative for Vercel, and Vercel ignores `server.js`
entirely. Pointing the domain back at the Vercel address restores the previous
deploy with every redirect intact.
