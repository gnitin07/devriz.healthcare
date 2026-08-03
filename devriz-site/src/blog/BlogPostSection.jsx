import { useEffect } from "react";
import { useBooking } from "../lib/BookingContext";
import { useContent } from "../lib/ContentContext";
import { getPost, getPosts, formatDate, setSeo } from "../lib/blog";

const BlogPostSection = ({ slug }) => {
  const post = getPost(slug);
  const { openBooking } = useBooking();
  const { settings } = useContent();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!post) return;
    setSeo({
      title: `${post.seoTitle || post.title} | Devriz Healthcare`,
      description: post.excerpt,
      canonical: `https://devrizhealthcare.com/blogs/${post.slug}`,
    });
  }, [post]);

  if (!post) {
    return (
      <section className="blog-section">
        <div className="blog-inner blog-notfound">
          <h1>Article not found</h1>
          <p>It may have been moved or renamed.</p>
          <a href="/blogs" className="blog-back">← All articles</a>
        </div>
      </section>
    );
  }

  // Up to two further reads, newest first, excluding the current post.
  const more = getPosts().filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <section className="blog-section">
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

        {post.image && (
          <img className="blog-hero-img" src={post.image} alt={post.imageAlt} />
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
    </section>
  );
};

export default BlogPostSection;
