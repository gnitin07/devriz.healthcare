# Devriz Healthcare — Blog Guide

Everything about writing and publishing articles on devrizhealthcare.com/blogs.

There are two roles:

- **Writer** — writes articles. Cannot put anything on the website.
- **Owner (Nitin)** — approves articles. Only the owner can make a post live.

---

## Part 1 — For the writer

### One-time setup (5 minutes)

1. Create a free GitHub account at <https://github.com/signup>. Any email
   works. Remember the username and password.
2. Open <https://devrizhealthcare.com/admin>
3. Click **Login with GitHub**, sign in, and click **Authorize** when GitHub
   asks for permission.

That's the whole setup. Nothing to install, nothing to download.

> You do NOT get access to the website itself. GitHub makes you a private
> personal copy to work in. Nothing you do can change or break the live site.

### Writing an article

1. Go to <https://devrizhealthcare.com/admin> and log in.
2. Click **New Blog Post**.
3. Fill in the fields:

   | Field | What to write |
   |---|---|
   | **Title** | The headline. This also becomes the web address, so put the words people actually search for near the start. |
   | **Publish date** | Leave as today unless you have a reason to change it. |
   | **Short summary** | 1–2 sentences, about 150 characters. This is the grey text under your headline in Google, and the text shown when the link is sent on WhatsApp. |
   | **Header image** | Required. Click, then upload a landscape photo. This is the picture that shows in WhatsApp previews. |
   | **Header image description (alt text)** | Required, 10–125 characters. Say what is actually in the photo — "close-up of dark patches on a woman's cheek", not "pigmentation image". Google reads it to understand the picture, and screen readers read it aloud to blind visitors. |
   | **Tags** | One topic per tag: acne, pigmentation, hair fall. |
   | **Author** | Leave as is, or put the doctor's name. |
   | **Article** | The actual article. |
   | **Custom Google title** | Leave empty almost always. |
   | **Hide this post** | Leave OFF. |

4. Click **Save** any time. Saving does not publish — it just keeps your work.
5. When the article is finished, change the status from **Draft** to
   **Ready**. That sends it to Nitin for review.
6. Message Nitin to tell him it's ready.

### Adding images inside the article

In the **Article** box, click the image button in the toolbar and upload.

**Then add a description to it.** The toolbar inserts the picture with an empty
description, and unlike the header image nothing forces you to fill it in. To
add one, click the **Markdown** icon at the top-right of the Article box to
switch out of the visual editor. You will see your image written like this:

```
![](/blog-images/your-photo.jpg)
```

Type the description inside the square brackets:

```
![dark patches across the cheekbone](/blog-images/your-photo.jpg)
```

Switch back and carry on writing. If you forget, the build prints a warning
naming the post and the picture, so Nitin will see it before it goes live.

### Editing or deleting a post

Open the post from the list, make the change or click **Delete**, and set it to
**Ready** again. Deleting also needs Nitin's approval — nothing disappears from
the website on its own.

### Writing rules that help us rank on Google

- Put the phrase people search for in the **Title**, near the start.
  Good: "Why Does Acne Keep Coming Back?"
  Weak: "Some Thoughts On Skin"
- Break the article into sections using **Heading 2**. Google uses these to
  understand what the article covers. Aim for 4–7 sections.
- Write 700 words or more. Short articles rarely rank.
- Answer the question directly in the first paragraph.
- Write like you are explaining to a patient, not advertising to a customer.
- Never promise a cure, a guaranteed result, or a timeline we cannot stand
  behind. Say "often", "usually", "in most cases".
- Never copy text from another website. Google penalises it and it is a legal
  risk.

---

## Part 2 — For the owner (Nitin)

### Adding a new writer

**There is nothing to grant.** Do not add them as a collaborator on GitHub and
do not share any password. Send them two things:

1. The link <https://devrizhealthcare.com/admin>
2. This guide.

They create their own free GitHub account, click **Login with GitHub**, and
start writing. This works because the repository is public and the editor runs
in *open authoring* mode: GitHub silently makes them their own copy (a "fork"),
their drafts are saved there, and pressing **Ready** opens a pull request here
for you to merge. They never hold write access to this repository, so there is
no way for them to change the live site — even by accident.

The flip side of that setup: **anyone** with a GitHub account who finds
/admin can log in and submit an article. They still cannot publish — nothing
reaches the site until you merge the pull request — so the worst case is an
unwanted pull request you close. That is the same thing any stranger could do
on a public repository anyway.

One thing to watch the first time a new writer submits: Vercel does not always
build a preview for a pull request opened from someone else's fork. If the
preview link is missing from the pull request, either read the changed file
directly on GitHub, or add that writer as a repository collaborator and set
`open_authoring: false` in `devriz-site/public/admin/config.yml` — that puts
their drafts on branches in this repository, where previews always build. Only
do that for staff you trust with write access, and turn on branch protection
for `main` first.

### Reviewing an article

1. When the writer says a post is ready, open
   <https://github.com/gnitin07/devriz.healthcare/pulls>
2. Open the pull request. It is named after the article.
3. Vercel automatically adds a **preview link** in the comments. Click it to
   read the finished article on a real page, exactly as visitors will see it.
4. If something needs changing, tell the writer — they edit and it updates
   automatically.
5. When you are happy, click **Merge pull request**.

The article is live at devrizhealthcare.com/blogs about 30–60 seconds later.
The sitemap updates itself, so Google gets told about the new post
automatically.

### Publishing something yourself

Because you own the repository, when *you* log into /admin you can publish
directly without the review step.

### Taking a post down fast

Open the post in /admin, switch **Hide this post** ON, and publish. It
disappears from the website on the next deploy.

### What happens to uploaded images

Nothing you have to think about — upload photos straight off a camera or phone.
Every build runs `scripts/optimize-blog-images.mjs`, which turns each upload
into three WebP sizes (640 / 960 / 1400 px wide) plus a 1200x630 JPEG for
WhatsApp and Facebook link previews. The page then serves whichever size the
visitor's screen actually needs, and the original is deleted from the deploy so
it can never be downloaded.

In practice an 8 MB camera photo becomes roughly 85 KB on a phone. This matters
because Vercel's free plan allows 100 GB of transfer per month — one
uncompressed header image would eat that in about 12,000 page views.

Two things to know:

- Images are cached in the visitor's browser for a year, so a returning reader
  downloads nothing. If you ever need to *change* a picture, upload it under a
  new filename rather than replacing the old one.
- The header image field also accepts a full `https://` link if you would rather
  host a picture elsewhere (a CDN, for example). Pasted links are used exactly
  as given — they are not resized, so make sure they are already small.

To compress newly uploaded images without a full build:

```bash
npm run optimize:blog-images
```

---

## Troubleshooting

**"Login with GitHub" does nothing, or shows an error**
The environment variables `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` must be
set in Vercel for Production, and the GitHub OAuth App's callback URL must be
exactly `https://devrizhealthcare.com/api/callback`. After changing them,
redeploy.

**"Error loading the CMS configuration"**
The config file could not be fetched. Check
<https://devrizhealthcare.com/admin/config.yml> loads.

**Writer says they cannot publish**
That is correct and intended. Writers submit; only the owner merges.

---

## Where things live

| What | Where |
|---|---|
| Blog editor | devrizhealthcare.com/admin |
| Published articles | devrizhealthcare.com/blogs |
| Article files | `devriz-site/content/blog/*.md` |
| Uploaded images | `devriz-site/public/blog-images/` |
| Image compressor | `devriz-site/scripts/optimize-blog-images.mjs` |
| Editor settings | `devriz-site/public/admin/config.yml` |

---

## Short links for writers

Send these instead of explaining where to click. All three require logging in
first; the login screen appears automatically and then takes you where you were
going.

| Link | Opens |
|---|---|
| devrizhealthcare.com/write | Straight into a blank new article |
| devrizhealthcare.com/posts | The list of all articles, to open and edit one |
| devrizhealthcare.com/admin | The editor home page |

These are 302 redirects, not permanent ones, deliberately: they point at the
CMS's internal `#/collections/blog` addresses, which belong to Decap and could
change on a future version. A permanent redirect would be cached in every
writer's browser for good and could not be corrected.
