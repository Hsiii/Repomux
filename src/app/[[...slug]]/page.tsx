import type { JSX } from 'react';

import { ClientOnlyApp } from '../../components/ClientOnlyApp';

export function generateStaticParams(): Array<{ slug: string[] }> {
    return [{ slug: [] }];
}

export default function HomePage(): JSX.Element {
    return <ClientOnlyApp />;
}
