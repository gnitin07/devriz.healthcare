/**
 * Live article preview for the blog editor.
 *
 * Writers here are not technical and have never seen the site's article
 * template. Without this they are typing into a plain form with no idea what
 * comes out — which is how you get a missing header image, a two-line article,
 * or an excerpt written as if nobody will read it.
 *
 * Empty fields render as labelled dashed placeholders, so before a single word
 * is typed the panel already reads as a wireframe of the finished page: where
 * the picture sits, where the headline goes, how long a real article looks.
 * As fields are filled the placeholders are replaced by the real thing, laid
 * out the way devrizhealthcare.com/blogs/<slug> actually lays it out.
 *
 * Plain ES5 and the globals Decap exposes for exactly this (window.h,
 * window.createClass) — this file is loaded by a <script> tag in index.html,
 * so it is never touched by Vite and cannot use JSX, imports or modern syntax.
 */
(function () {
  var h = window.h;
  var createClass = window.createClass;

  /** A labelled dashed box standing in for a field the writer has not filled. */
  function placeholder(kind, label, hint) {
    return h(
      'div',
      { className: 'ph ph-' + kind },
      h('span', { className: 'ph-label' }, label),
      hint ? h('span', { className: 'ph-hint' }, hint) : null
    );
  }

  /** "12 Aug 2026" — same format as lib/blog.js formatDate. */
  function formatDate(value) {
    if (!value) return '';
    var d = new Date(value);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return '';
    }
  }

  /** Mirrors lib/blog.js: ~200 words a minute, rounded up, minimum 1. */
  function readingTime(body) {
    if (!body) return 1;
    var words = String(body).trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
  }

  var BlogPreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var data = entry.get('data');
      var getAsset = this.props.getAsset;

      var title = data.get('title');
      var excerpt = data.get('excerpt');
      var image = data.get('image');
      var imageAlt = data.get('imageAlt');
      var author = data.get('author') || 'Devriz Healthcare Team';
      var date = data.get('date');
      var tags = data.get('tags');
      var body = data.get('body');
      var isDraft = data.get('draft') === true;

      // getAsset resolves an upload that only exists in the writer's branch
      // into something the browser can actually display.
      var imageSrc = null;
      if (image) {
        try {
          var asset = getAsset(image);
          imageSrc = asset ? asset.toString() : null;
        } catch (e) {
          imageSrc = null;
        }
      }

      var tagList = tags && tags.toArray ? tags.toArray().filter(Boolean) : [];
      var words = body ? String(body).trim().split(/\s+/).filter(Boolean).length : 0;

      return h(
        'div',
        { className: 'wrap' },

        isDraft
          ? h(
              'div',
              { className: 'banner banner-warn' },
              '"Hide this post" is ON — this article will not appear on the website.'
            )
          : null,

        h(
          'div',
          { className: 'note' },
          'This is how the article will look at devrizhealthcare.com. Dashed boxes are fields you have not filled in yet.'
        ),

        h(
          'article',
          { className: 'article' },

          h('div', { className: 'back' }, '← All articles'),

          tagList.length
            ? h(
                'div',
                { className: 'tags' },
                tagList.map(function (t, i) {
                  return h('span', { key: i }, t);
                })
              )
            : placeholder('tags', 'Tags', 'acne, pigmentation, hair fall'),

          title
            ? h('h1', {}, title)
            : placeholder('title', 'Headline', 'The words people search for go near the start'),

          h(
            'div',
            { className: 'meta' },
            h('span', {}, author),
            h('span', {}, formatDate(date) || 'date'),
            h('span', {}, readingTime(body) + ' min read')
          ),

          imageSrc
            ? h('img', { className: 'hero', src: imageSrc, alt: imageAlt || '' })
            : placeholder(
                'hero',
                'Header image',
                'Shown here and in the WhatsApp preview when the link is shared'
              ),

          image && !imageAlt
            ? h(
                'div',
                { className: 'banner banner-warn' },
                'The header image has no description yet. Google reads it, and screen readers read it aloud.'
              )
            : null,

          h(
            'div',
            { className: 'excerpt-box' },
            h('div', { className: 'excerpt-label' }, 'Shown in Google and on WhatsApp'),
            excerpt
              ? h('p', { className: 'excerpt' }, excerpt)
              : placeholder('excerpt', 'Short summary', 'About 150 characters')
          ),

          body
            ? h('div', { className: 'body' }, this.props.widgetFor('body'))
            : placeholder(
                'body',
                'The article',
                'Use Heading 2 for each section. Aim for 700 words or more.'
              ),

          h(
            'div',
            { className: 'cta' },
            h('h3', {}, 'Dealing with this concern yourself?'),
            h('p', {}, 'Get a proper diagnosis first — talk to a Devriz expert.'),
            h('div', { className: 'cta-btn' }, 'Book a consultation'),
            h('div', { className: 'cta-note' }, 'Added automatically to every article')
          ),

          // The two rules from the guide that get ignored most often, checked
          // where the writer can actually see them rather than in a document.
          h(
            'div',
            { className: 'counter' + (words && words < 700 ? ' counter-low' : '') },
            words
              ? words + ' words' + (words < 700 ? ' — short articles rarely rank; aim for 700+' : '')
              : 'No article text yet'
          ),

          words && !/^##\s/m.test(String(body))
            ? h(
                'div',
                { className: 'counter counter-low' },
                'No section headings yet — use "Heading 2" for each section so Google can see what the article covers. Aim for 4–7.'
              )
            : null
        )
      );
    },
  });

  window.CMS.registerPreviewStyle('/admin/preview.css');
  window.CMS.registerPreviewTemplate('blog', BlogPreview);
})();
