import {defineField, defineType} from 'sanity'

export const doctor = defineType({
  name: 'doctor',
  title: 'Doctors',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role / speciality',
      type: 'string',
      description: 'e.g. Senior Cosmetologist',
    }),
    defineField({
      name: 'experience',
      title: 'Experience line',
      type: 'string',
      description: 'e.g. 15+ years experience',
    }),
    defineField({
      name: 'stats',
      title: 'Extra badges',
      type: 'array',
      of: [{type: 'string'}],
      description: 'e.g. "1M+ happy clients", "4.8 ★ rated"',
    }),
    defineField({
      name: 'photo',
      title: 'Photo (portrait works best)',
      type: 'image',
      options: {hotspot: true},
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
    select: {title: 'name', subtitle: 'role', media: 'photo'},
  },
})
