import { useEffect } from "react";
import { useBooking } from "../lib/BookingContext";
import { useContent } from "../lib/ContentContext";
import { usePost, usePosts, formatDate, setSeo } from "../lib/blog";
import { HERO_SIZES } from "../lib/blog-images";

const BlogPostSection = ({ slug }) => {
  // On a direct load the article is embedded in the page, so `post` is there
  // from the first render and this never flashes. `loading` is for arriving
  // here from another article without a page load.
  const { post, loading } = usePost(slug);
  const { posts } = usePosts();
  const { openBooking } = useBooking();
  const { settings } = useContent();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!post) return;
    setSeo({
      title: `${post.seoTitle || post.title} | Devriz Healthcare`,
      description: post.seoDescription || post.excerpt,
      canonical: `https://devrizhealthcare.com/blogs/${post.slug}`,
    });
  }, [post]);

  if (!post) {
    return (
      <section className="blog-section">
        <div className="blog-inner blog-notfound">
          <h1>{loading ? "Loading…" : "Article not found"}</h1>
          {!loading && (
            <>
              <p>It may have been moved or renamed.</p>
              <a href="/blogs" className="blog-back">← All articles</a>
            </>
          )}
        </div>
      </section>
    );
  }

  // Up to two further reads, newest first, excluding the current post.
  const others = posts.filter((p) => p.slug !== post.slug);
  const more = others.slice(0, 2);
  /** The rail has room for more, and it is visible for the whole article. */
  const recent = others.slice(0, 4);

  return (
    <section className="blog-section">
      {/* Two columns on a large screen. The article used to be centred in a
          max-w-3xl column, which on a wide monitor left two broad empty margins;
          it now sits to the left and the reclaimed space on the right carries a
          sticky consultation card and links to other articles. Below 1024px the
          rail is hidden and the layout is exactly as it was. */}
      <div className="blog-layout">
      <article className="blog-article">
        <a href="/blogs" className="blog-back">← All articles</a>

        <header className="blog-article-head">
          {post.tags.length > 0 && (
            <div className="blog-tags">
              {post.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          )}
          <h1>{post.title}</h1>
          <div className="blog-meta">
            <span>{post.author}</span>
            <span>{formatDate(post.date)}</span>
            <span>{post.readingTime} min read</span>
          </div>
        </header>

        {post.img && (
          <img
            className="blog-hero-img"
            src={post.img.src}
            srcSet={post.img.srcset || undefined}
            sizes={post.img.srcset ? HERO_SIZES : undefined}
            width={post.img.width || undefined}
            height={post.img.height || undefined}
            alt={post.imageAlt}
            // Above the fold on every article: fetched eagerly, but at the one
            // width this screen actually needs.
            fetchPriority="high"
            decoding="async"
          />
        )}

        {/* Markdown authored in the CMS and reviewed by an owner before merge. */}
        <div
          className="blog-body"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        {/* every article funnels into the ₹49 consult */}
        <aside className="blog-cta">
          <h3>Dealing with this concern yourself?</h3>
          <p>
            Get a proper diagnosis first — talk to a Devriz expert for just ₹
            {settings.consultPrice}.
          </p>
          <button type="button" onClick={openBooking}>
            Book a consultation @ ₹{settings.consultPrice}
          </button>
        </aside>

        {/* Hidden on large screens, where the rail already lists other
            articles — the same links twice on one page helps nobody. */}
        {more.length > 0 && (
          <nav className="blog-more">
            <h3>Keep reading</h3>
            <div className="blog-more-grid">
              {more.map((p) => (
                <a key={p.slug} href={`/blogs/${p.slug}`}>
                  <span>{p.title}</span>
                  <em>{p.readingTime} min read</em>
                </a>
              ))}
            </div>
          </nav>
        )}
      </article>

      <aside className="blog-rail">
        <div className="rail-consult">
          <img
            src="/images/doctor-rachita.webp"
            alt="Devriz doctor ready for a video consultation"
            loading="lazy"
            decoding="async"
          />
          <div className="rail-consult-body">
            <h3>Book your live video call consultation now</h3>
            <p>
              Talk face to face with a Devriz expert about your skin, hair or
              body concern — ₹{settings.consultPrice}.
            </p>
            <button type="button" onClick={openBooking}>
              Book my video call
            </button>
          </div>
        </div>

        {recent.length > 0 && (
          <nav className="rail-recent">
            <h3>Recent blogs from Devriz</h3>
            {recent.map((p) => (
              <a key={p.slug} href={`/blogs/${p.slug}`}>
                {p.img ? (
                  <img src={p.img.src} alt={p.imageAlt} loading="lazy" decoding="async" />
                ) : (
                  <span className="rail-recent-ph" aria-hidden="true" />
                )}
                <span className="rail-recent-text">
                  <span>{p.title}</span>
                  <em>{p.readingTime} min read</em>
                </span>
              </a>
            ))}
          </nav>
        )}
      </aside>
      </div>
    </section>
  );
};

export default BlogPostSection;
