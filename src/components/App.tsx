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
    normalizeRepository,
    setStoredActiveRepositories,
} from '../lib/repositories.js';
import { supabase } from '../lib/supabase.js';
import type { Repository, WorkItem } from '../types/app.js';
import { AddRepositoryModal } from './modals/add-repository-modal.js';
import { GitHubAuthModal } from './modals/github-auth-modal.js';
import { RemoveRepositoryModal } from './modals/remove-repository-modal.js';
import { RepositorySidebar } from './repository-sidebar.js';
import { WorkPanel } from './work-panel.js';

function fullNameForStatus(input: string): string {
    const fullName = normalizeRepository(input);

    return fullName === '' ? 'repository' : fullName;
}

export function App(): JSX.Element {
    const [localRepositories, setLocalRepositories] =
        useState(mockRepositories);
    const [repoInput, setRepoInput] = useState('');
    const [activeRepositoryNames, setActiveRepositoryNames] = useState<
        readonly string[] | undefined
    >(getStoredActiveRepositories);
    const [isGitHubDialogOpen, setIsGitHubDialogOpen] = useState(false);
    const [isAddRepositoryOpen, setIsAddRepositoryOpen] = useState(false);
    const [continueAddingRepositories, setContinueAddingRepositories] =
        useState(false);
    const [includeUnassignedIssues, setIncludeUnassignedIssues] =
        useState(true);
    const [repositoryPendingRemoval, setRepositoryPendingRemoval] = useState<
        Repository | undefined
    >();
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

    const displayedRepositories =
        supabase === undefined
            ? localRepositories
            : (repositoriesQuery.data ?? []);

    const effectiveActiveRepositoryNames =
        activeRepositoryNames ??
        (displayedRepositories.length === 0
            ? []
            : [displayedRepositories[0].fullName]);

    const activeRepositories = displayedRepositories.filter((repository) =>
        effectiveActiveRepositoryNames.includes(repository.fullName)
    );

    const normalRepositories = displayedRepositories.filter(
        (repository) =>
            !effectiveActiveRepositoryNames.includes(repository.fullName)
    );

    const visibleRepositories = useMemo(
        () => activeRepositories,
        [activeRepositories]
    );

    const workItemsQuery = useQuery({
        enabled: supabase !== undefined && visibleRepositories.length > 0,
        queryFn: async () => await fetchWorkItems(visibleRepositories),
        queryKey: [
            'work-items',
            visibleRepositories
                .map((repository) => repository.fullName)
                .toSorted()
                .join(','),
        ],
    });

    const workItems =
        supabase === undefined
            ? mockWorkItems.filter((item) =>
                  visibleRepositories.some(
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

    const accessibleRepositoriesQuery = useQuery({
        enabled: isAddRepositoryOpen && githubToken.trim() !== '',
        queryFn: async () => await fetchAccessibleRepositories(githubToken),
        queryKey: ['accessible-repositories', githubToken],
        staleTime: 60_000,
    });

    const filteredAccessibleRepositories = useMemo(() => {
        const normalizedQuery = repoInput.trim().toLowerCase();
        const repositories = accessibleRepositoriesQuery.data ?? [];

        if (normalizedQuery === '') {
            return repositories.slice(0, 24);
        }

        return repositories
            .filter((repository) =>
                repository.fullName.toLowerCase().includes(normalizedQuery)
            )
            .slice(0, 24);
    }, [accessibleRepositoriesQuery.data, repoInput]);

    const hasExactAccessibleRepositoryMatch = (
        accessibleRepositoriesQuery.data ?? []
    ).some(
        (repository) => repository.fullName === normalizeRepository(repoInput)
    );

    const addRepositoryMutation = useMutation({
        mutationFn: async (fullName: string) => {
            if (supabase === undefined) {
                setLocalRepositories((current) => [
                    ...current,
                    { fullName, id: `local-${fullName}` },
                ]);
                return;
            }

            if (githubSession === undefined) {
                throw new Error('Connect GitHub before adding repositories.');
            }

            const { error } = await supabase.from('repositories').insert({
                full_name: fullName,
                is_active: true,
                user_id: githubSession.user.id,
            });

            if (error !== null) {
                throw new Error(error.message);
            }
        },
        onSuccess: () => {
            setRepoInput('');
            setStatusMessage(`Added ${fullNameForStatus(repoInput)}.`);
            if (!continueAddingRepositories) {
                setIsAddRepositoryOpen(false);
            }
            repositoriesQuery.refetch().catch((error: unknown) => {
                setStatusMessage(
                    error instanceof Error
                        ? error.message
                        : 'Unable to reload repositories.'
                );
            });
        },
        onError: (error: unknown) => {
            setStatusMessage(
                error instanceof Error
                    ? error.message
                    : 'Unable to add repository.'
            );
        },
    });

    const removeRepositoryMutation = useMutation({
        mutationFn: async (repository: Readonly<Repository>) => {
            if (supabase === undefined) {
                setLocalRepositories((current) =>
                    current.filter((item) => item.id !== repository.id)
                );
                setRepositoryPendingRemoval(undefined);
                return;
            }

            const { error } = await supabase
                .from('repositories')
                .update({ is_active: false })
                .eq('id', repository.id);

            if (error !== null) {
                throw new Error(error.message);
            }
        },
        onSuccess: () => {
            setRepositoryPendingRemoval(undefined);
            setStatusMessage('Removed repository.');
            repositoriesQuery.refetch().catch((error: unknown) => {
                setStatusMessage(
                    error instanceof Error
                        ? error.message
                        : 'Unable to reload repositories.'
                );
            });
        },
        onError: (error: unknown) => {
            setStatusMessage(
                error instanceof Error
                    ? error.message
                    : 'Unable to remove repository.'
            );
        },
    });

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
                displayedRepositories.some(
                    (repository) => repository.fullName === repositoryName
                )
            );

            if (next.length === current.length) {
                return current;
            }

            setStoredActiveRepositories(next);
            return next;
        });
    }, [displayedRepositories]);

    useEffect(() => {
        function openAddRepositoryDialog(event: KeyboardEvent) {
            if (
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === 'n'
            ) {
                event.preventDefault();
                setIsAddRepositoryOpen(true);
            }
        }

        globalThis.addEventListener('keydown', openAddRepositoryDialog);

        return () => {
            globalThis.removeEventListener('keydown', openAddRepositoryDialog);
        };
    }, []);

    function updateActiveRepositories(nextRepositoryNames: readonly string[]) {
        setStoredActiveRepositories(nextRepositoryNames);
        setActiveRepositoryNames(nextRepositoryNames);
    }

    function addRepository() {
        const fullName = normalizeRepository(repoInput);

        if (githubToken.trim() === '') {
            setStatusMessage('Connect GitHub before adding repositories.');
            return;
        }

        const accessibleRepository = (
            accessibleRepositoriesQuery.data ?? []
        ).find((repository) => repository.fullName === fullName);

        if (accessibleRepository === undefined) {
            setStatusMessage(
                'Choose a repository from your accessible GitHub repositories.'
            );
            return;
        }

        addRepositoryMutation.mutate(accessibleRepository.fullName);
    }

    function moveRepositoryToActive(repository: Readonly<Repository>) {
        updateActiveRepositories([
            ...effectiveActiveRepositoryNames.filter(
                (repositoryName) => repositoryName !== repository.fullName
            ),
            repository.fullName,
        ]);
    }

    function removeRepositoryFromActive(repository: Readonly<Repository>) {
        updateActiveRepositories(
            effectiveActiveRepositoryNames.filter(
                (repositoryName) => repositoryName !== repository.fullName
            )
        );
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
    } else if (addRepositoryMutation.error instanceof Error) {
        statusText = addRepositoryMutation.error.message;
    } else if (removeRepositoryMutation.error instanceof Error) {
        statusText = removeRepositoryMutation.error.message;
    } else if (accessibleRepositoriesQuery.error instanceof Error) {
        statusText = accessibleRepositoriesQuery.error.message;
    } else if (repositoriesQuery.error instanceof Error) {
        statusText = repositoriesQuery.error.message;
    } else if (workItemsQuery.error instanceof Error) {
        statusText = workItemsQuery.error.message;
    }

    return (
        <main className='app-shell'>
            <RepositorySidebar
                activeRepositories={activeRepositories}
                githubToken={githubToken}
                githubUser={githubUserQuery.data}
                hasGitHubError={githubUserQuery.isError}
                normalRepositories={normalRepositories}
                onConnectGitHub={() => {
                    setIsGitHubDialogOpen(true);
                }}
                onDisconnectGitHub={disconnectGitHub}
                onMoveRepositoryToActive={moveRepositoryToActive}
                onOpenAddRepository={() => {
                    setIsAddRepositoryOpen(true);
                }}
                onRemoveRepository={(repository) => {
                    setRepositoryPendingRemoval(repository);
                }}
                onRemoveRepositoryFromActive={removeRepositoryFromActive}
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
                onUpdateIncludeUnassignedIssues={setIncludeUnassignedIssues}
                onUpdatePrompt={updatePrompt}
                selectedItem={selectedItem}
                selectedPrompt={selectedPrompt}
                statusText={statusText}
            />

            {isAddRepositoryOpen ? (
                <AddRepositoryModal
                    accessibleRepositories={filteredAccessibleRepositories}
                    continueAddingRepositories={continueAddingRepositories}
                    hasExactMatch={hasExactAccessibleRepositoryMatch}
                    isGitHubConnected={githubToken.trim() !== ''}
                    isPending={addRepositoryMutation.isPending}
                    isRepositoryListPending={
                        accessibleRepositoriesQuery.isPending
                    }
                    onClose={() => {
                        setIsAddRepositoryOpen(false);
                    }}
                    onPickRepository={setRepoInput}
                    onSubmit={addRepository}
                    onToggleContinueAddingRepositories={
                        setContinueAddingRepositories
                    }
                    onUpdateRepoInput={setRepoInput}
                    repoInput={repoInput}
                />
            ) : undefined}

            {repositoryPendingRemoval === undefined ? undefined : (
                <RemoveRepositoryModal
                    isPending={removeRepositoryMutation.isPending}
                    onClose={() => {
                        setRepositoryPendingRemoval(undefined);
                    }}
                    onRemove={() => {
                        removeRepositoryMutation.mutate(
                            repositoryPendingRemoval
                        );
                    }}
                    repository={repositoryPendingRemoval}
                />
            )}

            {isGitHubDialogOpen ? (
                <GitHubAuthModal
                    onClose={() => {
                        setIsGitHubDialogOpen(false);
                    }}
                    onSubmit={connectGitHub}
                />
            ) : undefined}
        </main>
    );
}
