import type { JSX, ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';

import '../global.css';

export const metadata: Metadata = {
    description:
        'Repomux turns GitHub issues and pull requests into Codex-ready work.',
    icons: {
        icon: '/favicon.svg',
    },
    title: 'Repomux',
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
