import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { useGitHubConnection } from '../hooks/use-github-connection.js';
import {
    assignToCodex,
    fetchAccessibleRepositories,
    fetchWorkItems,
} from '../lib/github.js';
import { mockRepositories, mockWorkItems } from '../lib/mock-data.js';
import {
    getStoredActiveRepositories,
    loadRepositories,
    setStoredActiveRepositories,
} from '../lib/repositories.js';
import { supabase } from '../lib/supabase.js';
import type { Repository, WorkItem } from '../types/app.js';
import { GitHubAuthModal } from './modals/github-auth-modal.js';
import { RepositorySidebar } from './repository-sidebar.js';
import { WorkPanel } from './work-panel.js';

export function App(): JSX.Element {
    const [repositorySearchQuery, setRepositorySearchQuery] = useState('');
    const [activeRepositoryNames, setActiveRepositoryNames] = useState<
        readonly string[] | undefined
    >(getStoredActiveRepositories);
    const [isGitHubDialogOpen, setIsGitHubDialogOpen] = useState(false);
    const [includeUnassignedIssues, setIncludeUnassignedIssues] =
        useState(true);
    const [selectedItem, setSelectedItem] = useState(
        supabase === undefined ? mockWorkItems[0] : undefined
    );
    const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>(
        {}
    );
    const [statusMessage, setStatusMessage] = useState('');

    const {
        connectGitHub,
        disconnectGitHub,
        githubSession,
        githubToken,
        githubUserQuery,
    } = useGitHubConnection(setStatusMessage);

    const repositoriesQuery = useQuery({
        enabled: supabase !== undefined && githubSession !== undefined,
        queryFn: loadRepositories,
        queryKey: ['repositories'],
    });

    const accessibleRepositoriesQuery = useQuery({
        enabled: githubToken.trim() !== '',
        queryFn: async () => await fetchAccessibleRepositories(githubToken),
        queryKey: ['accessible-repositories', githubToken],
        staleTime: 60_000,
    });

    const availableRepositories = useMemo(() => {
        if ((accessibleRepositoriesQuery.data?.length ?? 0) > 0) {
            return accessibleRepositoriesQuery.data ?? [];
        }

        if (supabase === undefined) {
            return mockRepositories;
        }

        return repositoriesQuery.data ?? [];
    }, [accessibleRepositoriesQuery.data, repositoriesQuery.data]);

    const effectiveActiveRepositoryNames =
        activeRepositoryNames ??
        (availableRepositories.length === 0
            ? []
            : [availableRepositories[0].fullName]);

    const activeRepositories = availableRepositories.filter((repository) =>
        effectiveActiveRepositoryNames.includes(repository.fullName)
    );

    const filteredRepositories = useMemo(() => {
        const normalizedQuery = repositorySearchQuery.trim().toLowerCase();

        if (normalizedQuery === '') {
            return availableRepositories;
        }

        return availableRepositories.filter((repository) =>
            repository.fullName.toLowerCase().includes(normalizedQuery)
        );
    }, [availableRepositories, repositorySearchQuery]);

    const workItemsQuery = useQuery({
        enabled: supabase !== undefined && activeRepositories.length > 0,
        queryFn: async () => await fetchWorkItems(activeRepositories),
        queryKey: [
            'work-items',
            activeRepositories
                .map((repository) => repository.fullName)
                .toSorted()
                .join(','),
        ],
    });

    const workItems =
        supabase === undefined
            ? mockWorkItems.filter((item) =>
                  activeRepositories.some(
                      (repository) => repository.fullName === item.repo
                  )
              )
            : (workItemsQuery.data ?? []);

    const filteredWorkItems = workItems.filter((item) => {
        const githubLogin = githubUserQuery.data?.login;

        if (githubLogin === undefined) {
            return true;
        }

        if (item.assigneeLogins.includes(githubLogin)) {
            return true;
        }

        return includeUnassignedIssues && item.assigneeLogins.length === 0;
    });

    const selectedPrompt =
        selectedItem === undefined ? '' : (promptDrafts[selectedItem.id] ?? '');

    const assignMutation = useMutation({
        mutationFn: async () => {
            if (selectedItem === undefined) {
                return;
            }

            await assignToCodex(selectedItem, selectedPrompt, githubToken);
        },
        onSuccess: () => {
            setStatusMessage('Assigned to Codex.');
            setSelectedItem(undefined);
            workItemsQuery.refetch().catch((error: unknown) => {
                setStatusMessage(
                    error instanceof Error
                        ? error.message
                        : 'Unable to reload work queue.'
                );
            });
        },
    });

    useEffect(() => {
        setActiveRepositoryNames((current) => {
            if (current === undefined) {
                return current;
            }

            const next = current.filter((repositoryName) =>
                availableRepositories.some(
                    (repository) => repository.fullName === repositoryName
                )
            );

            if (next.length === current.length) {
                return current;
            }

            setStoredActiveRepositories(next);
            return next;
        });
    }, [availableRepositories]);

    function updateActiveRepositories(nextRepositoryNames: readonly string[]) {
        setStoredActiveRepositories(nextRepositoryNames);
        setActiveRepositoryNames(nextRepositoryNames);
    }

    function selectRepository(repository: Readonly<Repository>) {
        updateActiveRepositories([repository.fullName]);
        setSelectedItem(undefined);
        setStatusMessage('');
    }

    function updatePrompt(value: string) {
        if (selectedItem === undefined) {
            return;
        }

        setPromptDrafts((current: Readonly<Record<string, string>>) => ({
            ...current,
            [selectedItem.id]: value,
        }));
    }

    function selectItem(item: Readonly<WorkItem> | undefined) {
        setSelectedItem(item);
        setStatusMessage('');
    }

    let statusText = statusMessage;

    if (assignMutation.error instanceof Error) {
        statusText = assignMutation.error.message;
    } else if (accessibleRepositoriesQuery.error instanceof Error) {
        statusText = accessibleRepositoriesQuery.error.message;
    } else if (repositoriesQuery.error instanceof Error) {
        statusText = repositoriesQuery.error.message;
    } else if (workItemsQuery.error instanceof Error) {
        statusText = workItemsQuery.error.message;
    }

    const isGitHubConnected = githubToken.trim() !== '';

    return (
        <>
            {isGitHubConnected ? (
                <main className='app-shell'>
                    <RepositorySidebar
                        filteredRepositories={filteredRepositories}
                        githubToken={githubToken}
                        githubUser={githubUserQuery.data}
                        hasGitHubError={githubUserQuery.isError}
                        onConnectGitHub={() => {
                            setIsGitHubDialogOpen(true);
                        }}
                        onDisconnectGitHub={disconnectGitHub}
                        onSelectRepository={selectRepository}
                        onUpdateRepositorySearchQuery={setRepositorySearchQuery}
                        repositorySearchQuery={repositorySearchQuery}
                        selectedRepositoryNames={effectiveActiveRepositoryNames}
                    />

                    <WorkPanel
                        filteredWorkItems={filteredWorkItems}
                        githubToken={githubToken}
                        includeUnassignedIssues={includeUnassignedIssues}
                        isAssigning={assignMutation.isPending}
                        onAssign={() => {
                            assignMutation.mutate(undefined);
                        }}
                        onSelectItem={selectItem}
                        onUpdateIncludeUnassignedIssues={
                            setIncludeUnassignedIssues
                        }
                        onUpdatePrompt={updatePrompt}
                        selectedItem={selectedItem}
                        selectedPrompt={selectedPrompt}
                        statusText={statusText}
                    />
                </main>
            ) : (
                <main className='login-wall'>
                    <section className='login-wall__card'>
                        <h1 className='login-wall__title'>
                            Sign in to access your repositories
                        </h1>
                        <button
                            className='login-wall__button'
                            onClick={() => {
                                setIsGitHubDialogOpen(true);
                            }}
                            type='button'
                        >
                            <svg
                                aria-hidden='true'
                                className='login-wall__button-icon'
                                fill='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path d='M12 .5C5.65.5.5 5.65.5 12A11.5 11.5 0 0 0 8.36 22.1c.58.1.79-.25.79-.56v-2.17c-3.18.69-3.85-1.35-3.85-1.35-.52-1.31-1.27-1.66-1.27-1.66-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.33.96.1-.74.4-1.25.72-1.54-2.54-.29-5.22-1.27-5.22-5.64 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.19 1.18a11.1 11.1 0 0 1 5.82 0c2.22-1.49 3.19-1.18 3.19-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.38-2.68 5.34-5.24 5.63.41.35.78 1.03.78 2.08v3.08c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z' />
                            </svg>
                            Connect GitHub
                        </button>
                        {statusText === '' ? undefined : (
                            <p className='login-wall__status'>{statusText}</p>
                        )}
                    </section>
                </main>
            )}
            {isGitHubDialogOpen ? (
                <GitHubAuthModal
                    onClose={() => {
                        setIsGitHubDialogOpen(false);
                    }}
                    onSubmit={connectGitHub}
                />
            ) : undefined}
        </>
    );
}
