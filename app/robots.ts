import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://templar-archives.vercel.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/auth/',
          '/reporter/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
