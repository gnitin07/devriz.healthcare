import {defineField, defineType} from 'sanity'

export const heroBanner = defineType({
  name: 'heroBanner',
  title: 'Hero Slider',
  type: 'document',
  description: 'Slides in the animated hero carousel. Upload a fully-designed banner image, OR a background image + overlay text.',
  groups: [
    {name: 'images', title: 'Images', default: true},
    {name: 'text', title: 'Overlay text (optional)'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Internal name',
      type: 'string',
      description: 'Only for you to identify the slide in the studio.',
      validation: (rule) => rule.required(),
    }),

    // --- images (different upload for desktop vs mobile) ---
    defineField({
      name: 'desktopImage',
      title: 'Desktop image (wide, e.g. 1920×760)',
      type: 'image',
      group: 'images',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'mobileImage',
      title: 'Mobile image (tall/square, e.g. 900×1100)',
      type: 'image',
      group: 'images',
      options: {hotspot: true},
      description: 'Shown on phones. If empty, the desktop image is used and auto-cropped to the hotspot.',
    }),
    defineField({
      name: 'alt',
      title: 'Alt text (what the image shows)',
      type: 'string',
      group: 'images',
    }),

    // --- optional overlay text (leave blank for fully-designed banners) ---
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      group: 'text',
      description: 'Leave empty if your image already has text baked in.',
    }),
    defineField({
      name: 'subheading',
      title: 'Subheading',
      type: 'text',
      rows: 2,
      group: 'text',
    }),
    defineField({
      name: 'ctaLabel',
      title: 'Button label',
      type: 'string',
      group: 'text',
      description: 'e.g. Talk to a skin expert',
    }),
    defineField({
      name: 'textPosition',
      title: 'Text position',
      type: 'string',
      group: 'text',
      options: {
        list: [
          {title: 'Left', value: 'left'},
          {title: 'Center', value: 'center'},
          {title: 'Right', value: 'right'},
        ],
        layout: 'radio',
      },
      initialValue: 'left',
    }),
    defineField({
      name: 'textTheme',
      title: 'Text colour',
      type: 'string',
      group: 'text',
      options: {
        list: [
          {title: 'Dark text (for light images)', value: 'dark'},
          {title: 'Light text (for dark images)', value: 'light'},
        ],
        layout: 'radio',
      },
      initialValue: 'dark',
    }),

    // --- behaviour ---
    defineField({
      name: 'link',
      title: 'Link (where the slide / button goes)',
      type: 'url',
      description: 'Optional. Makes the slide and its button clickable.',
      validation: (rule) => rule.uri({allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel']}),
    }),
    defineField({
      name: 'order',
      title: 'Order (1 shows first)',
      type: 'number',
      initialValue: 1,
    }),
  ],
  orderings: [
    {title: 'Order', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'title', media: 'desktopImage', subtitle: 'order'},
    prepare: ({title, media, subtitle}) => ({
      title,
      media,
      subtitle: `Slide ${subtitle ?? '—'}`,
    }),
  },
})
