import { useEffect } from "react";
import { usePosts, formatDate, setSeo } from "../lib/blog";
import { CARD_SIZES } from "../lib/blog-images";

const BlogListSection = () => {
  // Prerendered pages carry the list with them, so this is already populated on
  // first render; `loading` only matters on client-side navigation.
  const { posts, loading } = usePosts();

  useEffect(() => {
    window.scrollTo(0, 0);
    setSeo({
      title: "Skin, Hair & Body Care Blog | Devriz Healthcare",
      description:
        "Doctor-backed guides on acne, pigmentation, hair fall and everyday skin care — written by the Devriz Healthcare team.",
      canonical: "https://devrizhealthcare.com/blogs",
    });
  }, []);

  return (
    <section className="blog-section">
      <div className="blog-inner">
        <header className="blog-header">
          <p className="section-eyebrow text-teal">Devriz Healthcare Blog</p>
          <h1>Skin, hair &amp; body care, explained by experts</h1>
          <p className="blog-sub">
            Practical, doctor-backed answers to the questions we hear every day
            in consultations.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="blog-empty">
            {loading
              ? "Loading articles…"
              : "First articles are on their way — check back soon."}
          </p>
        ) : (
          <div className="blog-grid">
            {posts.map((p) => (
              <a key={p.slug} href={`/blogs/${p.slug}`} className="blog-card">
                {p.img ? (
                  <img
                    src={p.img.src}
                    srcSet={p.img.srcset || undefined}
                    sizes={p.img.srcset ? CARD_SIZES : undefined}
                    width={p.img.width || undefined}
                    height={p.img.height || undefined}
                    alt={p.imageAlt}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="blog-card-ph" />
                )}
                <div className="blog-card-body">
                  {p.tags.length > 0 && (
                    <div className="blog-tags">
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                  )}
                  <h2>{p.title}</h2>
                  <p>{p.excerpt}</p>
                  <div className="blog-meta">
                    <span>{formatDate(p.date)}</span>
                    <span>{p.readingTime} min read</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogListSection;
