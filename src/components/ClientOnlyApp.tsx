'use client';

import type { JSX } from 'react';
import dynamic from 'next/dynamic';

import { AppProviders } from './AppProviders';

const App = dynamic(
    async () => {
        const module = await import('./App');

        return module.App;
    },
    {
        ssr: false,
    }
);

export function ClientOnlyApp(): JSX.Element {
    return (
        <AppProviders>
            <App />
        </AppProviders>
    );
}
