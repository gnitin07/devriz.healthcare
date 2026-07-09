import {defineField, defineType} from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  description: 'Global settings — create only ONE of these.',
  fields: [
    defineField({
      name: 'consultPrice',
      title: 'Consultation price (₹)',
      type: 'number',
      initialValue: 49,
    }),
    defineField({
      name: 'originalPrice',
      title: 'Original price shown struck-through (₹)',
      type: 'number',
      initialValue: 499,
    }),
    defineField({
      name: 'bookingLink',
      title: 'Booking / consultation page link',
      type: 'url',
      description: 'Where every "Consult" button sends people.',
    }),
    defineField({
      name: 'whatsapp',
      title: 'WhatsApp number (with country code)',
      type: 'string',
    }),
    defineField({
      name: 'whyDoctorImage',
      title: 'Doctor photo for the "Why consultation" section',
      type: 'image',
      options: {hotspot: true},
      description: 'Professional portrait; moves subtly as visitors scroll.',
    }),
    defineField({
      name: 'stats',
      title: 'Trust stats (shown under the hero)',
      type: 'array',
      of: [{type: 'string'}],
      description: 'e.g. "1M+ happy customers", "15+ years experience", "93% visible results", "4.8 ★ average rating"',
    }),
    defineField({name: 'email', title: 'Contact email', type: 'string'}),
    defineField({name: 'address', title: 'Address', type: 'string'}),
    defineField({name: 'facebook', title: 'Facebook URL', type: 'url'}),
    defineField({name: 'instagram', title: 'Instagram URL', type: 'url'}),
    defineField({name: 'youtube', title: 'YouTube URL', type: 'url'}),
    defineField({name: 'linkedin', title: 'LinkedIn URL', type: 'url'}),
  ],
  preview: {
    prepare: () => ({title: 'Site Settings'}),
  },
})
