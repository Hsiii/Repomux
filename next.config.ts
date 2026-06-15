import type { NextConfig } from 'next';

const securityHeaders = [
    {
        key: 'Content-Security-Policy',
        value: [
            "base-uri 'self'",
            "default-src 'self'",
            "font-src 'self'",
            "frame-ancestors 'none'",
            "img-src 'self' data:",
            "object-src 'none'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
            "style-src 'self' 'unsafe-inline'",
            "connect-src 'self' https://api.github.com https://github.com https://vitals.vercel-insights.com",
        ].join('; '),
    },
    {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
    },
    {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
    },
    {
        key: 'X-Frame-Options',
        value: 'DENY',
    },
    {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
    },
];

const securityHeaderRoutes = [
    {
        headers: securityHeaders,
        source: '/(.*)',
    },
] as const;

const nextConfig: NextConfig = {
    headers() {
        return securityHeaderRoutes;
    },
};

export default nextConfig;
