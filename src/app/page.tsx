import type { JSX } from 'react';

import { ClientOnlyApp } from '../components/ClientOnlyApp';

export default function HomePage(): JSX.Element {
    return <ClientOnlyApp />;
}
