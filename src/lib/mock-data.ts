import type { Repository, WorkItem } from '../types/app.js';

export const mockRepositories: readonly Repository[] = [
    { id: 'mock-repomux', fullName: 'Hsiii/Repomux' },
    { id: 'mock-create-hsi-app', fullName: 'Hsiii/create-hsi-app' },
    { id: 'mock-dotfiles', fullName: 'Hsiii/dotfiles' },
];

export const mockWorkItems: readonly WorkItem[] = [
    {
        assigneeLogins: [],
        body: 'Add a dark mode toggle.\n\nPersist the choice, respect system preference, and cover all surfaces.',
        codexReady: false,
        id: 'Hsiii/Repomux#128',
        number: 128,
        repo: 'Hsiii/Repomux',
        title: 'Add dark mode',
        type: 'issue',
        url: '#',
    },
    {
        assigneeLogins: ['Hsiii'],
        body: 'Review the Supabase repository editor. Simplify the empty state before merge.',
        codexReady: false,
        id: 'Hsiii/Repomux#124',
        number: 124,
        repo: 'Hsiii/Repomux',
        title: 'Simplify repo empty state',
        type: 'pr',
        url: '#',
    },
    {
        assigneeLogins: [],
        body: 'Replace manual issue refresh with query invalidation.',
        codexReady: true,
        id: 'Hsiii/create-hsi-app#72',
        number: 72,
        repo: 'Hsiii/create-hsi-app',
        title: 'Use query invalidation',
        type: 'issue',
        url: '#',
    },
];
