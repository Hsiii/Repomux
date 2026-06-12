import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            allow: '/',
            userAgent: '*',
        },
        sitemap: new URL('/sitemap.xml', siteUrl).toString(),
    };
}
