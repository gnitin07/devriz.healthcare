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
   | **Header image** | Click, then upload a landscape photo. This is the picture that shows in WhatsApp previews. |
   | **Header image description** | A few words describing the photo, e.g. "close-up of clear skin". Google reads this. |
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
Add a short description for every image.

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
| Editor settings | `devriz-site/public/admin/config.yml` |
