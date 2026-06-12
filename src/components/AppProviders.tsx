'use client';

import type { JSX, ReactNode } from 'react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface AppProvidersProps {
    children: ReactNode;
}

export function AppProviders(props: AppProvidersProps): JSX.Element {
    const { children } = props;
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
