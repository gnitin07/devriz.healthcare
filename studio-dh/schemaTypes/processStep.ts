import {defineField, defineType} from 'sanity'

export const processStep = defineType({
  name: 'processStep',
  title: 'Process Steps',
  type: 'document',
  description: 'The 3-step process cards (Consult → Products → Dispatch).',
  fields: [
    defineField({
      name: 'title',
      title: 'Step title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Step description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'accent',
      title: 'Accent colour (hex, optional)',
      type: 'string',
      description: 'e.g. #e8a33d — leave empty for automatic colours.',
    }),
    defineField({
      name: 'order',
      title: 'Order (1 = first step)',
      type: 'number',
      initialValue: 1,
    }),
  ],
  orderings: [
    {title: 'Order', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'title', subtitle: 'order'},
    prepare: ({title, subtitle}) => ({title, subtitle: `Step ${subtitle ?? '—'}`}),
  },
})
