import {defineField, defineType} from 'sanity'

export const whyBanner = defineType({
  name: 'whyBanner',
  title: '“Why consultation” Cards',
  type: 'document',
  description: 'The trust cards in the "Why consultation before treatment is important" section (4 work best).',
  fields: [
    defineField({
      name: 'title',
      title: 'Card title',
      type: 'string',
      description: 'e.g. Correct concern identification',
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: 'description',
      title: 'Card description',
      type: 'text',
      rows: 3,
      description: 'One or two sentences explaining the point.',
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
    select: {title: 'title', subtitle: 'order'},
    prepare: ({title, subtitle}) => ({title, subtitle: `Position ${subtitle ?? '—'}`}),
  },
})
