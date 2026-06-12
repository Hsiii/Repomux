import type { Repository, WorkItem } from '../types/app.js';

export const mockRepositories: readonly Repository[] = [
    { id: 'mock-repomux', fullName: 'hsi/Repomux' },
    { id: 'mock-create-hsi-app', fullName: 'hsi/create-hsi-app' },
    { id: 'mock-dotfiles', fullName: 'hsi/dotfiles' },
];

export const mockWorkItems: readonly WorkItem[] = [
    {
        assigneeLogins: [],
        body: 'Add a dark mode toggle.\n\nPersist the choice, respect system preference, and cover all surfaces.',
        codexReady: false,
        id: 'hsi/Repomux#128',
        number: 128,
        repo: 'hsi/Repomux',
        title: 'Add dark mode',
        type: 'issue',
        url: '#',
    },
    {
        assigneeLogins: ['hsi'],
        body: 'Review the Supabase repository editor. Simplify the empty state before merge.',
        codexReady: false,
        id: 'hsi/Repomux#124',
        number: 124,
        repo: 'hsi/Repomux',
        title: 'Simplify repo empty state',
        type: 'pr',
        url: '#',
    },
    {
        assigneeLogins: [],
        body: 'Replace manual issue refresh with query invalidation.',
        codexReady: true,
        id: 'hsi/create-hsi-app#72',
        number: 72,
        repo: 'hsi/create-hsi-app',
        title: 'Use query invalidation',
        type: 'issue',
        url: '#',
    },
];
