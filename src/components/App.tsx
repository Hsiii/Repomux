import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    Check,
    CircleArrowUp,
    CircleDot,
    GitPullRequestArrow,
    LogOut,
    Plus,
    Rocket,
    Trash2,
    Umbrella,
    X,
} from 'lucide-react';

interface Repository {
    fullName: string;
    id: string;
}

interface GitHubIssue {
    assignees?: ReadonlyArray<{ readonly login?: string }>;
    body?: string;
    html_url: string;
    labels: ReadonlyArray<string | { readonly name?: string }>;
    number: number;
    pull_request?: unknown;
    repository_url: string;
    title: string;
}

interface GitHubUser {
    login: string;
    name?: string | null;
}

interface OAuthTokenResponse {
    accessToken: string;
    scope: string;
    tokenType: string;
}

interface WorkItem {
    assigneeLogins: readonly string[];
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
const githubOAuthClientId = import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID as
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

function getStoredGitHubToken(): string {
    return globalThis.localStorage.getItem('repomux.githubToken') ?? '';
}

function getStoredActiveRepositories(): readonly string[] | undefined {
    const storedValue = globalThis.localStorage.getItem(
        'repomux.activeRepositories'
    );

    if (storedValue === null) {
        return undefined;
    }

    return storedValue
        .split('\n')
        .filter((repositoryName) => repositoryName !== '');
}

function getOAuthRedirectUri(): string {
    return `${globalThis.location.origin}${globalThis.location.pathname}`;
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
                assigneeLogins:
                    issue.assignees?.flatMap((assignee) =>
                        assignee.login === undefined ? [] : [assignee.login]
                    ) ?? [],
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

async function exchangeGitHubOAuthCode(
    code: string,
    redirectUri: string
): Promise<OAuthTokenResponse> {
    if (
        supabaseUrl === undefined ||
        supabaseKey === undefined ||
        supabase === undefined
    ) {
        throw new Error('Supabase is required for GitHub OAuth.');
    }

    const response = await fetch(
        `${supabaseUrl}/functions/v1/github-oauth-token`,
        {
            body: JSON.stringify({ code, redirectUri }),
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
            },
            method: 'POST',
        }
    );

    const payload = (await response.json()) as
        | OAuthTokenResponse
        | { error?: string };

    if (!response.ok || !('accessToken' in payload)) {
        const errorMessage =
            'error' in payload ? payload.error : 'GitHub OAuth failed.';

        throw new Error(errorMessage ?? 'GitHub OAuth failed.');
    }

    return payload;
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
    const [activeRepositoryNames, setActiveRepositoryNames] = useState<
        readonly string[] | undefined
    >(getStoredActiveRepositories);
    const [githubToken, setGithubToken] = useState(getStoredGitHubToken);
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

    const githubUserQuery = useQuery({
        enabled: githubToken.trim() !== '',
        queryFn: async () =>
            await fetchJson<GitHubUser>(
                'https://api.github.com/user',
                githubToken.trim()
            ),
        retry: false,
        queryKey: ['github-user', githubToken],
    });

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

    useEffect(() => {
        const searchParams = new URLSearchParams(globalThis.location.search);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const oauthError =
            searchParams.get('error_description') ?? searchParams.get('error');

        if (code === null && oauthError === null) {
            return;
        }

        searchParams.delete('code');
        searchParams.delete('state');
        searchParams.delete('error');
        searchParams.delete('error_description');
        globalThis.history.replaceState(
            undefined,
            '',
            `${globalThis.location.pathname}${
                searchParams.size === 0 ? '' : `?${searchParams.toString()}`
            }`
        );

        if (oauthError !== null) {
            setStatusMessage(oauthError);
            return;
        }

        const storedState = globalThis.localStorage.getItem(
            'repomux.githubOAuthState'
        );
        globalThis.localStorage.removeItem('repomux.githubOAuthState');

        if (state === null || storedState === null || state !== storedState) {
            setStatusMessage('GitHub OAuth state did not match.');
            return;
        }

        exchangeGitHubOAuthCode(code ?? '', getOAuthRedirectUri())
            .then((tokenResponse) => {
                globalThis.localStorage.setItem(
                    'repomux.githubToken',
                    tokenResponse.accessToken
                );
                setGithubToken(tokenResponse.accessToken);
                setStatusMessage('GitHub connected.');
                workItemsQuery.refetch().catch((error: unknown) => {
                    setStatusMessage(
                        error instanceof Error
                            ? error.message
                            : 'Unable to reload work queue.'
                    );
                });
            })
            .catch((error: unknown) => {
                setStatusMessage(
                    error instanceof Error
                        ? error.message
                        : 'GitHub OAuth failed.'
                );
            });
    }, [workItemsQuery]);

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

            globalThis.localStorage.setItem(
                'repomux.activeRepositories',
                next.join('\n')
            );

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

    function addRepository() {
        const fullName = normalizeRepository(repoInput);

        if (!/^[\w.-]+\/[\w.-]+$/u.test(fullName)) {
            setStatusMessage('Use owner/repo.');
            return;
        }

        addRepositoryMutation.mutate(fullName);
    }

    function updateActiveRepositories(nextRepositoryNames: readonly string[]) {
        globalThis.localStorage.setItem(
            'repomux.activeRepositories',
            nextRepositoryNames.join('\n')
        );
        setActiveRepositoryNames(nextRepositoryNames);
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

    function connectGitHub() {
        if (githubOAuthClientId === undefined || githubOAuthClientId === '') {
            setStatusMessage('GitHub OAuth client ID is not configured.');
            return;
        }

        const state = globalThis.crypto.randomUUID();
        const authorizationUrl = new URL(
            'https://github.com/login/oauth/authorize'
        );

        globalThis.localStorage.setItem('repomux.githubOAuthState', state);
        authorizationUrl.searchParams.set('client_id', githubOAuthClientId);
        authorizationUrl.searchParams.set(
            'redirect_uri',
            getOAuthRedirectUri()
        );
        authorizationUrl.searchParams.set('scope', 'repo');
        authorizationUrl.searchParams.set('state', state);

        globalThis.location.assign(authorizationUrl);
    }

    function disconnectGitHub() {
        globalThis.localStorage.removeItem('repomux.githubToken');
        setGithubToken('');
        setStatusMessage('');
        workItemsQuery.refetch().catch((error: unknown) => {
            setStatusMessage(
                error instanceof Error
                    ? error.message
                    : 'Unable to reload work queue.'
            );
        });
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

    function renderRepositoryRow(
        repository: Readonly<Repository>,
        isActiveRepository: boolean
    ) {
        return (
            <div className='repo-row' key={repository.id}>
                <span className='repo-row__label'>{repository.fullName}</span>
                <button
                    aria-label={
                        isActiveRepository
                            ? `Remove ${repository.fullName} from active`
                            : `Move ${repository.fullName} to active`
                    }
                    className='repo-row__action'
                    onClick={() => {
                        if (isActiveRepository) {
                            removeRepositoryFromActive(repository);
                            return;
                        }

                        moveRepositoryToActive(repository);
                    }}
                    type='button'
                >
                    {isActiveRepository ? (
                        <ArrowDown aria-hidden='true' size={18} />
                    ) : (
                        <ArrowUp aria-hidden='true' size={18} />
                    )}
                </button>
                <button
                    aria-label={`Remove ${repository.fullName}`}
                    className='repo-row__remove'
                    onClick={() => {
                        setRepositoryPendingRemoval(repository);
                    }}
                    type='button'
                >
                    <X aria-hidden='true' size={18} />
                </button>
            </div>
        );
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
                <section className='repo-panel__section'>
                    <div className='repo-groups'>
                        <section className='repo-group'>
                            <div className='repo-group__header'>
                                <div className='repo-group__heading'>
                                    <Rocket aria-hidden='true' size={16} />
                                    <h2 className='repo-group__title'>
                                        Active repos
                                    </h2>
                                </div>
                                <button
                                    aria-label='Add repository'
                                    className='section-add-button'
                                    onClick={() => {
                                        setIsAddRepositoryOpen(true);
                                    }}
                                    type='button'
                                >
                                    <Plus aria-hidden='true' size={18} />
                                </button>
                            </div>
                            <div className='repo-list'>
                                {activeRepositories.map((repository) =>
                                    renderRepositoryRow(repository, true)
                                )}
                            </div>
                        </section>

                        <section className='repo-group'>
                            <div className='repo-group__header'>
                                <div className='repo-group__heading'>
                                    <Umbrella aria-hidden='true' size={16} />
                                    <h2 className='repo-group__title'>
                                        Pocket repos
                                    </h2>
                                </div>
                                <button
                                    aria-label='Add repository'
                                    className='section-add-button'
                                    onClick={() => {
                                        setIsAddRepositoryOpen(true);
                                    }}
                                    type='button'
                                >
                                    <Plus aria-hidden='true' size={18} />
                                </button>
                            </div>
                            <div className='repo-list'>
                                {normalRepositories.map((repository) =>
                                    renderRepositoryRow(repository, false)
                                )}
                            </div>
                        </section>
                    </div>

                    <div className='github-account-card'>
                        <span aria-hidden='true' className='github-mark'>
                            GH
                        </span>
                        {githubToken.trim() === '' ? (
                            <>
                                <div className='github-account-card__main'>
                                    <span className='github-account-card__name'>
                                        GitHub
                                    </span>
                                    <span className='github-account-card__meta'>
                                        Not connected
                                    </span>
                                </div>
                                <button
                                    className='github-account-card__button'
                                    onClick={() => {
                                        setIsGitHubDialogOpen(true);
                                    }}
                                    type='button'
                                >
                                    Connect
                                </button>
                            </>
                        ) : (
                            <>
                                <div className='github-account-card__main'>
                                    <span className='github-account-card__name'>
                                        {githubUserQuery.data?.name ??
                                            githubUserQuery.data?.login ??
                                            'GitHub'}
                                    </span>
                                    <span className='github-account-card__meta'>
                                        {githubUserQuery.isError
                                            ? 'Token needs attention'
                                            : (githubUserQuery.data?.login ??
                                              'Connected')}
                                    </span>
                                </div>
                                <button
                                    aria-label='Log out of GitHub'
                                    className='github-account-card__icon-button'
                                    onClick={disconnectGitHub}
                                    type='button'
                                >
                                    <LogOut aria-hidden='true' size={18} />
                                </button>
                            </>
                        )}
                    </div>
                </section>
            </aside>

            <section className='work-panel'>
                {selectedItem === undefined ? (
                    <>
                        <div className='work-panel__header'>
                            <h2 className='work-title'>Work queue</h2>
                            <div className='work-filters'>
                                <label className='work-filter work-filter--check'>
                                    <input
                                        checked={includeUnassignedIssues}
                                        onChange={(event) => {
                                            setIncludeUnassignedIssues(
                                                event.target.checked
                                            );
                                        }}
                                        type='checkbox'
                                    />
                                    <span>Include unassigned</span>
                                </label>
                            </div>
                        </div>

                        <div
                            className={
                                filteredWorkItems.length === 0
                                    ? 'queue-list queue-list--empty'
                                    : 'queue-list'
                            }
                        >
                            {filteredWorkItems.length === 0 ? (
                                <p className='empty-state'>
                                    No open issues or pull requests found.
                                </p>
                            ) : (
                                filteredWorkItems.map((item) => (
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
                                                {item.title}
                                            </span>
                                            <span className='queue-row__meta'>
                                                <span className='queue-row__repo'>
                                                    {item.repo}
                                                </span>
                                                <span className='queue-row__number'>
                                                    #{item.number}
                                                </span>
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
                                                    className='readiness__empty'
                                                />
                                            )}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
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
                                        {selectedItem.title}
                                    </h2>
                                    <p className='detail-meta'>
                                        <span>{selectedItem.repo}</span>
                                        <span>#{selectedItem.number}</span>
                                    </p>
                                </div>
                            </div>
                            <span className='readiness readiness--detail'>
                                {selectedItem.codexReady ? (
                                    <Check aria-label='Codex ready' size={20} />
                                ) : (
                                    <span
                                        aria-label='Not codex ready'
                                        className='readiness__empty'
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

            {isAddRepositoryOpen ? (
                <div className='modal-backdrop'>
                    <form
                        aria-labelledby='add-repository-title'
                        className='modal-card'
                        onSubmit={(event) => {
                            event.preventDefault();
                            addRepository();
                        }}
                        role='dialog'
                    >
                        <div className='modal-header'>
                            <div>
                                <h2
                                    className='modal-title'
                                    id='add-repository-title'
                                >
                                    Add repository
                                </h2>
                                <p className='modal-description'>
                                    Add a GitHub repository to the queue.
                                </p>
                            </div>
                            <button
                                aria-label='Close add repository'
                                className='modal-icon-button'
                                onClick={() => {
                                    setIsAddRepositoryOpen(false);
                                }}
                                type='button'
                            >
                                <X aria-hidden='true' size={18} />
                            </button>
                        </div>

                        <label className='field-label' htmlFor='repo-input'>
                            Repository
                        </label>
                        <input
                            autoFocus
                            className='modal-input'
                            id='repo-input'
                            onChange={(event) => {
                                setRepoInput(event.target.value);
                            }}
                            placeholder='owner/repo or GitHub URL'
                            type='text'
                            value={repoInput}
                        />

                        <label className='checkbox-row'>
                            <input
                                checked={continueAddingRepositories}
                                onChange={(event) => {
                                    setContinueAddingRepositories(
                                        event.target.checked
                                    );
                                }}
                                type='checkbox'
                            />
                            <span>Continue adding next</span>
                        </label>

                        <button
                            className='modal-primary-button'
                            disabled={addRepositoryMutation.isPending}
                            type='submit'
                        >
                            <span>
                                {addRepositoryMutation.isPending
                                    ? 'Adding'
                                    : 'Add repository'}
                            </span>
                            <Plus aria-hidden='true' size={20} />
                        </button>
                    </form>
                </div>
            ) : undefined}

            {repositoryPendingRemoval === undefined ? undefined : (
                <div className='modal-backdrop'>
                    <div
                        aria-labelledby='remove-repository-title'
                        className='modal-card'
                        role='dialog'
                    >
                        <div className='modal-header'>
                            <div>
                                <h2
                                    className='modal-title'
                                    id='remove-repository-title'
                                >
                                    Remove repository
                                </h2>
                                <p className='modal-description'>
                                    Remove {repositoryPendingRemoval.fullName}{' '}
                                    from the active queue.
                                </p>
                            </div>
                            <button
                                aria-label='Close remove repository'
                                className='modal-icon-button'
                                onClick={() => {
                                    setRepositoryPendingRemoval(undefined);
                                }}
                                type='button'
                            >
                                <X aria-hidden='true' size={18} />
                            </button>
                        </div>

                        <div className='modal-actions'>
                            <button
                                className='modal-secondary-button'
                                onClick={() => {
                                    setRepositoryPendingRemoval(undefined);
                                }}
                                type='button'
                            >
                                Cancel
                            </button>
                            <button
                                className='modal-danger-button'
                                disabled={removeRepositoryMutation.isPending}
                                onClick={() => {
                                    removeRepositoryMutation.mutate(
                                        repositoryPendingRemoval
                                    );
                                }}
                                type='button'
                            >
                                <span>
                                    {removeRepositoryMutation.isPending
                                        ? 'Removing'
                                        : 'Remove'}
                                </span>
                                <Trash2 aria-hidden='true' size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isGitHubDialogOpen ? (
                <div className='modal-backdrop'>
                    <form
                        aria-labelledby='github-auth-title'
                        className='modal-card'
                        onSubmit={(event) => {
                            event.preventDefault();
                            connectGitHub();
                        }}
                        role='dialog'
                    >
                        <div className='modal-header'>
                            <div>
                                <h2
                                    className='modal-title'
                                    id='github-auth-title'
                                >
                                    GitHub account
                                </h2>
                                <p className='modal-description'>
                                    Connect a GitHub token for queue reads and
                                    Codex assignment.
                                </p>
                            </div>
                            <button
                                aria-label='Close GitHub account'
                                className='modal-icon-button'
                                onClick={() => {
                                    setIsGitHubDialogOpen(false);
                                }}
                                type='button'
                            >
                                <X aria-hidden='true' size={18} />
                            </button>
                        </div>

                        <button className='modal-primary-button' type='submit'>
                            <span>Continue with GitHub</span>
                            <span aria-hidden='true' className='github-mark'>
                                GH
                            </span>
                        </button>
                    </form>
                </div>
            ) : undefined}
        </main>
    );
}
