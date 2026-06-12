import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            changeFrequency: 'weekly',
            lastModified: new Date('2026-06-12'),
            priority: 1,
            url: siteUrl,
        },
    ];
}
