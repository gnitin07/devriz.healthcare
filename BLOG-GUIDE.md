# Writing on the Devriz blog

The editor lives at **https://devrizhealthcare.com/admin**.

Sign in with the password Nitin gave you. That is all — no GitHub account, no
pull request, no approval step. When you press **Publish**, the article is on
the website by the time the button finishes.

---

## The short version

1. Go to `/admin`, sign in.
2. **+ New post**.
3. Type the headline.
4. Write the article, or paste it in from ChatGPT.
5. Add a header image and describe it.
6. Write the short summary.
7. **Publish**.

You stay signed in on that device for 30 days.

---

## Pasting from ChatGPT

Copy from ChatGPT and paste straight into the article box. Headings stay
headings, bold stays bold, lists stay lists, and the text picks up the website's
own font and sizes automatically.

You do not need to reformat anything afterwards, and you should not paste into
Word first — that adds invisible formatting the website then has to strip back
out.

---

## The toolbar

| Button | What it does |
|---|---|
| **Text style** dropdown | Normal text, or Heading 2 / 3 / 4 |
| **B** / *I* / U | Bold, italic, underline |
| •• / 1. | Bulleted and numbered lists |
| ❝ | A pull quote |
| 🔗 | Turn the selected words into a link |
| 🖼 | Drop a picture in at the cursor |
| ▭ | Drop a **button** in — usually the ₹49 consultation link |
| — | A divider line |
| ⌫ᶠ | Strip formatting off the selected text |
| ↶ ↷ | Undo, redo |

**Headings.** Use *Heading 2* for each main section — that is what Google reads
to work out what the article covers. *Heading 3* for a sub-point inside a
section. The post title is already the page's main heading, so the editor warns
you if you use Heading 1 inside the article; take the warning.

**Links.** Select the words first, then press 🔗. A link to another page on this
site starts with a slash — `/consult`, or
`/blogs/what-is-skin-pigmentation-causes-and-care-guide`. Anything elsewhere
needs the full `https://…`.

**Buttons.** Press ▭ anywhere in the article. Put one where the argument for
booking actually lands, not only at the end — the fixed ₹49 block at the foot of
every article is already there.

---

## Pictures

Press 🖼 and choose a file. Upload it at whatever size your phone or camera
produced — it is shrunk and compressed inside your browser before it is even
sent, so a 6 MB photo becomes about 10 KB and the visitor never downloads the
big one.

**Every picture needs a description.** After inserting one, a panel opens under
the article with an *Image description* box. Write what is actually in the
photo:

- ✅ "close-up of dark patches on a woman's cheek"
- ❌ "pigmentation image"

That text is what Google Images reads, what a blind visitor's screen reader
reads aloud, and what is shown if the picture fails to load. **A post will not
publish while any picture is missing one.** Click a picture at any time to edit
its description.

The **header image** is separate, in the right-hand column. It appears at the
top of the article, on the blog list, and — most importantly — as the picture in
the WhatsApp preview when the link is shared. Without it, the link shares as a
bare grey box.

---

## Short summary

One or two sentences, around 150 characters. This is the grey text under your
headline in Google, and the text under the link on WhatsApp.

Leave it out and Google picks a sentence from the article itself — usually not
the one you would have chosen.

---

## The web address

Under the headline you will see:

```
devrizhealthcare.com/blogs/  why-does-acne-keep-coming-back
```

It fills itself in from the headline. You can edit it — keep it short, and keep
the words people would actually search for.

**Do not change it once a post is live.** Every link already shared on WhatsApp,
and Google's record of the page, points at the old address; changing it breaks
all of them. The editor warns you when you are about to.

---

## Search & sharing panel

At the bottom of the right-hand column. It shows what the article will look like
in a Google result, updating as you type.

Both boxes are optional — leave them empty and the post title and short summary
are used. Fill them in only when the Google version should read differently from
the version on the page.

The counters turn amber as you approach the length Google cuts off, and red past
it.

---

## Draft, Preview, Publish

- **Save draft** — keeps your work on the server. Not on the website.
- **Preview** — shows the finished article exactly as a reader will see it.
  Switch between Desktop and Phone at the top.
- **Publish** — puts it live. Immediately.

Publish stays greyed out until the post has everything it needs; hover over it
and it tells you what is missing.

Editing a live post works the same way — the button reads **Update**, and the
change is live as soon as you press it.

---

## Deleting

**Delete** takes the post off the website straight away and moves it to
**Trash**. Nothing is lost.

From Trash you can **Restore** it — it comes back as a draft, so it never
reappears on the website by surprise — or delete it for ever, which really is
for ever.

---

## Backups

**Download a backup** in the left-hand menu gives you a zip of every article and
every picture: plain files, openable on any computer.

There is no automatic version history behind this editor. That is the trade for
being able to publish without waiting for anyone. Press the button now and
then — especially before deleting something.

---

## If something looks wrong

**"That password is not right."** — check with Nitin. After eight wrong tries it
locks you out for fifteen minutes.

**"Your session expired."** — sign in again; the 30 days ran out.

**A published post is not showing** — press **Rebuild the pages** in the
left-hand menu, then reload. If it still does not appear, the app needs a
restart from hPanel.

**Publish is greyed out** — hover over it, or read the amber box at the bottom
of the right-hand column. It lists exactly what is missing.

---

## For Nitin — setting it up

The editor needs one environment variable on the server:

```
ADMIN_PASSWORD=<a long password you share with the writer>
```

hPanel → the app → **Environment variables** → add it → **restart the app**.
Until it is set, `/admin` shows a message saying so and nobody can sign in.
Changing the password signs everyone out immediately.

If you would rather the plain password not sit in hPanel, generate a hash and
set `ADMIN_PASSWORD_HASH` instead:

```bash
node server/auth.mjs "the password"
```

Articles and pictures are stored in `devriz-content/`, a folder one level ABOVE
the application root, so that uploading a new build can never overwrite them.
Full deployment details are in [HOSTING.md](HOSTING.md).
