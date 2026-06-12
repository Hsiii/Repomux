import type { JSX } from 'react';

import { App } from '../components/App';
import { AppProviders } from '../components/AppProviders';

export default function HomePage(): JSX.Element {
    return (
        <AppProviders>
            <App />
        </AppProviders>
    );
}
