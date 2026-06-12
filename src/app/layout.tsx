import type { JSX, ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';

import '../global.css';

const siteUrl = new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
);
const description =
    'Repomux turns GitHub issues and pull requests into Codex-ready work.';

export const metadata: Metadata = {
    applicationName: 'Repomux',
    authors: [{ name: 'Repomux' }],
    creator: 'Repomux',
    description,
    metadataBase: siteUrl,
    keywords: [
        'Repomux',
        'GitHub issues',
        'GitHub pull requests',
        'Codex',
        'async coding agents',
        'developer workflow',
    ],
    alternates: {
        canonical: '/',
    },
    icons: {
        icon: '/favicon.svg',
        shortcut: '/favicon.png',
        apple: '/favicon.png',
    },
    openGraph: {
        description,
        images: [
            {
                alt: 'Repomux logo',
                height: 512,
                url: '/repomux-logo.svg',
                width: 512,
            },
        ],
        locale: 'en_US',
        siteName: 'Repomux',
        title: 'Repomux',
        type: 'website',
        url: '/',
    },
    publisher: 'Repomux',
    robots: {
        follow: true,
        googleBot: {
            'follow': true,
            'index': true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
        },
        index: true,
    },
    title: 'Repomux',
    twitter: {
        card: 'summary',
        description,
        images: ['/repomux-logo.svg'],
        title: 'Repomux',
    },
    verification: {
        google: 'U0MZAhyxx3hG4euT-pHfkimkVmT8oOu0dAlgD0OFoaQ',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
};

interface RootLayoutProps {
    children: ReactNode;
}

export default function RootLayout(props: RootLayoutProps): JSX.Element {
    const { children } = props;

    return (
        <html lang='en'>
            <body>{children}</body>
        </html>
    );
}
