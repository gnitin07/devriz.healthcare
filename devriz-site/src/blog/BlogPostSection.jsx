import { useEffect, useState } from "react";
import { useBooking } from "../lib/BookingContext";
import { useContent } from "../lib/ContentContext";
import { usePost, usePosts, formatDate, setSeo } from "../lib/blog";
import { HERO_SIZES } from "../lib/blog-images";

/**
 * The consultation banner: one supplied artwork, used in the sidebar on desktop
 * and full width under the article on a phone.
 *
 *   /images/blog-consult-banner.webp
 *
 * No aspect ratio is imposed — the CSS is width:100%, height:auto — so whatever
 * shape the artwork is drawn at is the shape it renders at, in both places.
 * One file, one design, nothing to keep in step.
 *
 * Until that file exists the banner renders nothing at all, rather than a
 * placeholder: an empty box on a live article looks broken to a reader.
 */
const BANNER_SRC = "/images/blog-consult-banner.webp";

const ConsultBanner = ({ onClick, className = "", eager = false }) => {
  const [missing, setMissing] = useState(false);
  if (missing) return null;

  return (
    <button
      type="button"
      className={`blog-consult-banner ${className}`.trim()}
      onClick={onClick}
      aria-label="Book your live video call consultation"
    >
      <img
        src={BANNER_SRC}
        alt="Book your live video call consultation with a Devriz expert"
        // The rail copy is on screen the moment the article opens; the
        // in-article copy is far below the fold.
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onError={() => setMissing(true)}
      />
    </button>
  );
};

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
      {/* Two columns on a large screen: the article, and a sticky rail holding
          the consultation banner and links to recent posts. The pair is centred
          as a block, so the margins stay even on a wide monitor. Below 1024px
          the rail is hidden and the banner moves into the article instead. */}
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

        {/* On a phone there is no rail, so the banner runs in the article
            itself, straight after the CTA block. Hidden from lg up, where the
            rail carries it. */}
        <ConsultBanner onClick={openBooking} className="lg:hidden" />

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
        {/* Block one: the supplied banner. Nothing is drawn in code, and
            nothing renders until the artwork exists. */}
        <ConsultBanner onClick={openBooking} eager />

        {/* Block two: what else there is to read, and a way to all of it. */}
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
            <a className="rail-recent-all" href="/blogs">
              See all articles →
            </a>
          </nav>
        )}
      </aside>
      </div>
    </section>
  );
};

export default BlogPostSection;
