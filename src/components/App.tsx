import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    ArrowLeft,
    Check,
    CircleArrowUp,
    CircleDot,
    GitPullRequestArrow,
    Plus,
    X,
} from 'lucide-react';

interface Repository {
    fullName: string;
    id: string;
}

interface GitHubIssue {
    body?: string;
    html_url: string;
    labels: ReadonlyArray<string | { readonly name?: string }>;
    number: number;
    pull_request?: unknown;
    repository_url: string;
    title: string;
}

interface WorkItem {
    body: string;
    codexReady: boolean;
    id: string;
    number: number;
    repo: string;
    title: string;
    type: 'issue' | 'pr';
    url: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
    | string
    | undefined;

const supabase =
    supabaseUrl === undefined || supabaseKey === undefined
        ? undefined
        : createClient(supabaseUrl, supabaseKey);

const mockRepositories: readonly Repository[] = [
    { id: 'mock-repomux', fullName: 'hsi/Repomux' },
    { id: 'mock-create-hsi-app', fullName: 'hsi/create-hsi-app' },
    { id: 'mock-dotfiles', fullName: 'hsi/dotfiles' },
];

const mockWorkItems: readonly WorkItem[] = [
    {
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

function getStoredGitHubToken(): string {
    return globalThis.localStorage.getItem('repomux.githubToken') ?? '';
}

function repositoryFromIssue(issue: GitHubIssue): string {
    const marker = '/repos/';
    const index = issue.repository_url.indexOf(marker);

    if (index === -1) {
        return issue.repository_url;
    }

    return issue.repository_url.slice(index + marker.length);
}

function hasLabel(issue: GitHubIssue, labelName: string): boolean {
    return issue.labels.some((label) => {
        if (typeof label === 'string') {
            return label === labelName;
        }

        return label.name === labelName;
    });
}

function headers(token: string): Headers {
    const requestHeaders = new Headers({
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    });

    if (token !== '') {
        requestHeaders.set('Authorization', `Bearer ${token}`);
    }

    return requestHeaders;
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
    const response = await fetch(url, { headers: headers(token) });

    if (!response.ok) {
        throw new Error(`GitHub returned ${response.status}`);
    }

    return await (response.json() as Promise<T>);
}

async function fetchWorkItems(
    repositories: ReadonlyArray<Readonly<Repository>>
): Promise<readonly WorkItem[]> {
    const token = getStoredGitHubToken();
    const requests = repositories.map(async (repository) => {
        const issues = await fetchJson<GitHubIssue[]>(
            `https://api.github.com/repos/${repository.fullName}/issues?state=open&per_page=30`,
            token
        );

        return issues.map((issue): WorkItem => {
            const repo = repositoryFromIssue(issue);

            return {
                body: typeof issue.body === 'string' ? issue.body.trim() : '',
                codexReady: hasLabel(issue, 'codex-ready'),
                id: `${repo}#${issue.number}`,
                number: issue.number,
                repo,
                title: issue.title,
                type: issue.pull_request === undefined ? 'issue' : 'pr',
                url: issue.html_url,
            };
        });
    });

    const requestResults = await Promise.all(requests);
    const items = requestResults.flat();

    return items.toSorted((first, second) => {
        if (first.codexReady !== second.codexReady) {
            return first.codexReady ? 1 : -1;
        }

        return second.number - first.number;
    });
}

async function loadRepositories(): Promise<readonly Repository[]> {
    if (supabase === undefined) {
        return [];
    }

    const { data, error } = await supabase
        .from('repositories')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name');

    if (error !== null) {
        throw new Error(error.message);
    }

    return data.map((repository) => ({
        fullName: repository.full_name as string,
        id: repository.id as string,
    }));
}

async function assignToCodex(
    item: Readonly<WorkItem>,
    prompt: string,
    token: string
) {
    if (token.trim() === '') {
        throw new Error('GitHub token is required to assign work.');
    }

    globalThis.localStorage.setItem('repomux.githubToken', token.trim());

    const commentResponse = await fetch(
        `https://api.github.com/repos/${item.repo}/issues/${item.number}/comments`,
        {
            body: JSON.stringify({
                body: `## Codex prompt\n\n${prompt.trim()}`,
            }),
            headers: headers(token.trim()),
            method: 'POST',
        }
    );

    if (!commentResponse.ok) {
        throw new Error(`GitHub comment failed with ${commentResponse.status}`);
    }

    const labelResponse = await fetch(
        `https://api.github.com/repos/${item.repo}/issues/${item.number}/labels`,
        {
            body: JSON.stringify({ labels: ['codex-ready'] }),
            headers: headers(token.trim()),
            method: 'POST',
        }
    );

    if (!labelResponse.ok) {
        throw new Error(`GitHub label failed with ${labelResponse.status}`);
    }
}

function normalizeRepository(input: string): string {
    const trimmedInput = input.trim();
    const sshMatch =
        /^git@github\.com:(?<owner>[\w.-]+)\/(?<repo>[\w.-]+?)(?:\.git)?$/u.exec(
            trimmedInput
        );

    if (sshMatch?.groups !== undefined) {
        return `${sshMatch.groups.owner}/${sshMatch.groups.repo}`;
    }

    try {
        const repositoryUrl = new URL(trimmedInput);

        if (repositoryUrl.hostname !== 'github.com') {
            return trimmedInput;
        }

        const pathSegments = repositoryUrl.pathname.split('/').filter(Boolean);

        if (pathSegments.length < 2) {
            return trimmedInput;
        }

        const [owner, repo] = pathSegments;

        return `${owner}/${repo.replace(/\.git$/u, '')}`;
    } catch {
        return trimmedInput.replace(/\.git$/u, '');
    }
}

export function App(): JSX.Element {
    const [localRepositories, setLocalRepositories] =
        useState(mockRepositories);
    const [repoInput, setRepoInput] = useState('');
    const [githubToken, setGithubToken] = useState(getStoredGitHubToken);
    const [selectedRepository, setSelectedRepository] = useState(
        supabase === undefined ? mockRepositories[0]?.fullName : undefined
    );
    const [selectedItem, setSelectedItem] = useState(
        supabase === undefined ? mockWorkItems[0] : undefined
    );
    const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>(
        {}
    );
    const [statusMessage, setStatusMessage] = useState('');

    const repositoriesQuery = useQuery({
        enabled: supabase !== undefined,
        queryFn: loadRepositories,
        queryKey: ['repositories'],
    });

    const repositories =
        supabase === undefined
            ? localRepositories
            : (repositoriesQuery.data ?? []);

    const displayedRepositories = repositories;

    const visibleRepositories = useMemo(() => {
        if (selectedRepository === undefined) {
            return displayedRepositories;
        }

        return displayedRepositories.filter(
            (repository) => repository.fullName === selectedRepository
        );
    }, [displayedRepositories, selectedRepository]);

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
            ? mockWorkItems.filter(
                  (item) =>
                      selectedRepository === undefined ||
                      item.repo === selectedRepository
              )
            : (workItemsQuery.data ?? []);

    const selectedPrompt =
        selectedItem === undefined ? '' : (promptDrafts[selectedItem.id] ?? '');

    const addRepositoryMutation = useMutation({
        mutationFn: async (fullName: string) => {
            if (supabase === undefined) {
                setLocalRepositories((current) => [
                    ...current,
                    { fullName, id: `local-${fullName}` },
                ]);
                return;
            }

            const { error } = await supabase.from('repositories').insert({
                full_name: fullName,
                is_active: true,
            });

            if (error !== null) {
                throw new Error(error.message);
            }
        },
        onSuccess: () => {
            setRepoInput('');
            repositoriesQuery.refetch().catch((error: unknown) => {
                setStatusMessage(
                    error instanceof Error
                        ? error.message
                        : 'Unable to reload repositories.'
                );
            });
        },
    });

    const removeRepositoryMutation = useMutation({
        mutationFn: async (repository: Readonly<Repository>) => {
            if (supabase === undefined) {
                setLocalRepositories((current) =>
                    current.filter((item) => item.id !== repository.id)
                );
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
            repositoriesQuery.refetch().catch((error: unknown) => {
                setStatusMessage(
                    error instanceof Error
                        ? error.message
                        : 'Unable to reload repositories.'
                );
            });
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
        if (
            selectedRepository !== undefined &&
            !displayedRepositories.some(
                (repository) => repository.fullName === selectedRepository
            )
        ) {
            setSelectedRepository(undefined);
        }
    }, [displayedRepositories, selectedRepository]);

    function addRepository() {
        const fullName = normalizeRepository(repoInput);

        if (!/^[\w.-]+\/[\w.-]+$/u.test(fullName)) {
            setStatusMessage('Use owner/repo.');
            return;
        }

        addRepositoryMutation.mutate(fullName);
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

    let statusText = statusMessage;

    if (assignMutation.error instanceof Error) {
        statusText = assignMutation.error.message;
    } else if (repositoriesQuery.error instanceof Error) {
        statusText = repositoriesQuery.error.message;
    } else if (workItemsQuery.error instanceof Error) {
        statusText = workItemsQuery.error.message;
    }

    return (
        <main className='app-shell'>
            <aside aria-label='Repositories' className='repo-panel'>
                <h1 className='app-title'>Repomux</h1>

                <section className='repo-panel__section'>
                    <h2 className='section-title'>Repositories</h2>
                    <form
                        className='repo-form'
                        onSubmit={(event) => {
                            event.preventDefault();
                            addRepository();
                        }}
                    >
                        <label className='sr-only' htmlFor='repo-input'>
                            Repository full name
                        </label>
                        <input
                            className='repo-form__input'
                            id='repo-input'
                            onChange={(event) => {
                                setRepoInput(event.target.value);
                            }}
                            placeholder='owner/repo'
                            type='text'
                            value={repoInput}
                        />
                        <button
                            className='icon-button icon-button--primary'
                            disabled={addRepositoryMutation.isPending}
                            type='submit'
                        >
                            <Plus aria-hidden='true' size={20} />
                            <span className='sr-only'>Add repository</span>
                        </button>
                    </form>

                    <div className='repo-list'>
                        {displayedRepositories.map((repository) => (
                            <div
                                className='repo-row'
                                data-selected={
                                    selectedRepository === repository.fullName
                                }
                                key={repository.id}
                            >
                                <button
                                    aria-pressed={
                                        selectedRepository ===
                                        repository.fullName
                                    }
                                    className='repo-row__select'
                                    onClick={() => {
                                        setSelectedRepository((current) =>
                                            current === repository.fullName
                                                ? undefined
                                                : repository.fullName
                                        );
                                        setSelectedItem(undefined);
                                    }}
                                    type='button'
                                >
                                    {repository.fullName}
                                </button>
                                <button
                                    aria-label={`Remove ${repository.fullName}`}
                                    className='repo-row__remove'
                                    onClick={() => {
                                        removeRepositoryMutation.mutate(
                                            repository
                                        );
                                    }}
                                    type='button'
                                >
                                    <X aria-hidden='true' size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            </aside>

            <section className='work-panel'>
                {selectedItem === undefined ? (
                    <>
                        <div className='work-panel__header'>
                            <h2 className='work-title'>Work queue</h2>
                            {selectedRepository === undefined ? undefined : (
                                <p className='work-subtitle'>
                                    {selectedRepository}
                                </p>
                            )}
                        </div>

                        <div className='queue-list'>
                            {workItems.map((item) => (
                                <button
                                    className='queue-row'
                                    key={item.id}
                                    onClick={() => {
                                        setSelectedItem(item);
                                        setStatusMessage('');
                                    }}
                                    type='button'
                                >
                                    <span className='queue-row__type'>
                                        {item.type === 'issue' ? (
                                            <CircleDot
                                                aria-label='Issue'
                                                size={18}
                                            />
                                        ) : (
                                            <GitPullRequestArrow
                                                aria-label='Pull request'
                                                size={18}
                                            />
                                        )}
                                    </span>
                                    <span className='queue-row__content'>
                                        <span className='queue-row__title'>
                                            <span className='muted'>
                                                #{item.number}
                                            </span>{' '}
                                            {item.title}
                                        </span>
                                        <span className='queue-row__repo'>
                                            {item.repo}
                                        </span>
                                    </span>
                                    <span className='readiness'>
                                        {item.codexReady ? (
                                            <Check
                                                aria-label='Codex ready'
                                                size={18}
                                            />
                                        ) : (
                                            <span
                                                aria-label='Not codex ready'
                                                className='readiness__dot'
                                            />
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {workItems.length === 0 ? (
                            <p className='empty-state'>
                                No open issues or pull requests found.
                            </p>
                        ) : undefined}
                    </>
                ) : (
                    <article className='detail-panel'>
                        <button
                            className='back-button'
                            onClick={() => {
                                setSelectedItem(undefined);
                            }}
                            type='button'
                        >
                            <ArrowLeft aria-hidden='true' size={22} />
                            Back
                        </button>

                        <header className='detail-header'>
                            <div className='detail-header__main'>
                                <span className='detail-header__type'>
                                    {selectedItem.type === 'issue' ? (
                                        <CircleDot
                                            aria-label='Issue'
                                            size={36}
                                        />
                                    ) : (
                                        <GitPullRequestArrow
                                            aria-label='Pull request'
                                            size={36}
                                        />
                                    )}
                                </span>
                                <div>
                                    <h2 className='detail-title'>
                                        <span className='muted'>
                                            #{selectedItem.number}
                                        </span>{' '}
                                        {selectedItem.title}
                                    </h2>
                                    <p className='detail-meta'>
                                        {selectedItem.repo}
                                    </p>
                                </div>
                            </div>
                            <span className='readiness readiness--detail'>
                                {selectedItem.codexReady ? (
                                    <Check aria-label='Codex ready' size={20} />
                                ) : (
                                    <span
                                        aria-label='Not codex ready'
                                        className='readiness__dot'
                                    />
                                )}
                            </span>
                        </header>

                        <div className='issue-body'>
                            {selectedItem.body === ''
                                ? 'No body provided.'
                                : selectedItem.body}
                        </div>

                        <label className='prompt-label' htmlFor='prompt'>
                            Prompt / context
                        </label>
                        <textarea
                            className='prompt-input'
                            id='prompt'
                            onChange={(event) => {
                                updatePrompt(event.target.value);
                            }}
                            placeholder='Add any additional context or instructions for Codex...'
                            value={selectedPrompt}
                        />

                        <label className='token-label' htmlFor='github-token'>
                            GitHub token
                        </label>
                        <input
                            className='token-input'
                            id='github-token'
                            onChange={(event) => {
                                setGithubToken(event.target.value);
                            }}
                            placeholder='ghp_...'
                            type='password'
                            value={githubToken}
                        />

                        <button
                            className='assign-button'
                            disabled={
                                selectedPrompt.trim() === '' ||
                                githubToken.trim() === '' ||
                                assignMutation.isPending
                            }
                            onClick={() => {
                                assignMutation.mutate(undefined);
                            }}
                            type='button'
                        >
                            <span>
                                {assignMutation.isPending
                                    ? 'Assigning'
                                    : 'Assign to Codex'}
                            </span>
                            <CircleArrowUp aria-hidden='true' size={28} />
                        </button>
                    </article>
                )}

                {statusText === '' ? undefined : (
                    <p className='status-message'>{statusText}</p>
                )}
            </section>
        </main>
    );
}
