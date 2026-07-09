import {defineField, defineType} from 'sanity'

export const transformation = defineType({
  name: 'transformation',
  title: 'Transformations (Before/After)',
  type: 'document',
  description: 'Customer journeys shown in the horizontal-scroll section.',
  fields: [
    defineField({
      name: 'name',
      title: 'Customer name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'concern',
      title: 'Concern',
      type: 'string',
      description: 'e.g. Pigmentation, Acne, Hair fall',
    }),
    defineField({
      name: 'video',
      title: 'Testimonial video (optional, mp4)',
      type: 'file',
      options: {accept: 'video/*'},
      description: 'If you upload a video, it is shown instead of the before/after photos.',
    }),
    defineField({
      name: 'before',
      title: 'Before photo',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'after',
      title: 'After photo',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'review',
      title: 'Review text',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'rating',
      title: 'Rating (1–5)',
      type: 'number',
      initialValue: 5,
      validation: (rule) => rule.min(1).max(5),
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      initialValue: 1,
    }),
  ],
  orderings: [
    {title: 'Order', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'name', subtitle: 'concern', media: 'after'},
  },
})
