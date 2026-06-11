import type { Repository, WorkItem } from '../types/app.js';

export const mockRepositories: readonly Repository[] = [
    { id: 'mock-repomux', fullName: 'hsi/Repomux' },
    { id: 'mock-create-hsi-app', fullName: 'hsi/create-hsi-app' },
    { id: 'mock-dotfiles', fullName: 'hsi/dotfiles' },
];

export const mockWorkItems: readonly WorkItem[] = [
    {
        assigneeLogins: [],
        body: 'Add a dark mode toggle to the app.\n\nIt should persist the preference, respect system preference by default, and update all surfaces.',
        codexReady: false,
        id: 'hsi/Repomux#128',
        number: 128,
        repo: 'hsi/Repomux',
        title: 'Add dark mode toggle',
        type: 'issue',
        url: '#',
    },
    {
        assigneeLogins: ['hsi'],
        body: 'Review the Supabase repository editor and simplify the empty state before merge.',
        codexReady: false,
        id: 'hsi/Repomux#124',
        number: 124,
        repo: 'hsi/Repomux',
        title: 'Simplify repository editor empty state',
        type: 'pr',
        url: '#',
    },
    {
        assigneeLogins: [],
        body: 'Replace the current manual issue refresh behavior with a query invalidation path.',
        codexReady: true,
        id: 'hsi/create-hsi-app#72',
        number: 72,
        repo: 'hsi/create-hsi-app',
        title: 'Use query invalidation for issue updates',
        type: 'issue',
        url: '#',
    },
];
