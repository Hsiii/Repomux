import type { NextRequest } from 'next/server';

import type {
    GitHubIssue,
    GitHubUser,
    Repository,
    WorkItem,
} from '../../types/app';

const githubApiOrigin = 'https://api.github.com';
const githubOAuthOrigin = 'https://github.com';
const githubTokenCookieName = 'repomux.githubToken';
const githubOAuthStateCookieName = 'repomux.githubOAuthState';
const githubTokenCookieMaxAge = 60 * 60 * 24 * 30;
const githubOAuthStateCookieMaxAge = 60 * 10;
const githubLocalRelayStatePrefix = 'repomux-local-relay.';

interface GitHubLocalRelayState {
    readonly callbackUrl: string;
    readonly state: string;
}

function getEnvironmentVariable(name: string): string | undefined {
    const value = process.env[name]?.trim();

    if (value === undefined || value === '') {
        return undefined;
    }

    return value;
}

function isLocalGitHubOAuthRequest(request: NextRequest): boolean {
    const { hostname } = new URL(request.url);

    return isLoopbackHostname(hostname);
}

function isLoopbackHostname(hostname: string): boolean {
    return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '[::1]'
    );
}

function isLoopbackUrl(url: URL): boolean {
    return (
        url.protocol === 'http:' &&
        isLoopbackHostname(url.hostname) &&
        url.pathname === '/api/github/callback'
    );
}

function hasGitHubDevCredential(): boolean {
    return (
        getEnvironmentVariable('GITHUB_DEV_CLIENT_ID') !== undefined ||
        getEnvironmentVariable('GITHUB_DEV_CLIENT_SECRET') !== undefined
    );
}

function getGitHubClientId(request: NextRequest): string {
    const variableName =
        isLocalGitHubOAuthRequest(request) && hasGitHubDevCredential()
            ? 'GITHUB_DEV_CLIENT_ID'
            : 'GITHUB_CLIENT_ID';
    const clientId = getEnvironmentVariable(variableName);

    if (clientId === undefined || clientId === '') {
        throw new Error(
            `Missing required environment variable: ${variableName}`
        );
    }

    return clientId;
}

function getGitHubClientSecret(request: NextRequest): string {
    const variableName =
        isLocalGitHubOAuthRequest(request) && hasGitHubDevCredential()
            ? 'GITHUB_DEV_CLIENT_SECRET'
            : 'GITHUB_CLIENT_SECRET';
    const clientSecret = getEnvironmentVariable(variableName);

    if (clientSecret === undefined || clientSecret === '') {
        throw new Error(
            `Missing required environment variable: ${variableName}`
        );
    }

    return clientSecret;
}

function getGitHubOAuthScope(): string {
    const scope = getEnvironmentVariable('NEXT_PUBLIC_GITHUB_OAUTH_SCOPE');

    if (scope === undefined || scope === '') {
        return 'repo';
    }

    return scope;
}

function getGitHubRedirectUri(request: NextRequest): string {
    let configuredRedirectUri: string | undefined;

    if (isLocalGitHubOAuthRequest(request)) {
        configuredRedirectUri = hasGitHubDevCredential()
            ? getEnvironmentVariable('GITHUB_DEV_OAUTH_REDIRECT_URI')
            : getEnvironmentVariable('GITHUB_OAUTH_REDIRECT_URI');
    } else {
        configuredRedirectUri = getEnvironmentVariable(
            'GITHUB_OAUTH_REDIRECT_URI'
        );
    }

    if (configuredRedirectUri !== undefined && configuredRedirectUri !== '') {
        return configuredRedirectUri;
    }

    return new URL('/api/github/callback', request.url).toString();
}

function getLocalGitHubCallbackUri(request: NextRequest): string {
    return new URL('/api/github/callback', request.url).toString();
}

function encodeGitHubLocalRelayState(payload: GitHubLocalRelayState): string {
    return `${githubLocalRelayStatePrefix}${Buffer.from(
        JSON.stringify(payload)
    ).toString('base64url')}`;
}

function decodeGitHubLocalRelayState(
    state: string
): GitHubLocalRelayState | undefined {
    if (!state.startsWith(githubLocalRelayStatePrefix)) {
        return undefined;
    }

    try {
        const payload = JSON.parse(
            Buffer.from(
                state.slice(githubLocalRelayStatePrefix.length),
                'base64url'
            ).toString('utf8')
        ) as Partial<GitHubLocalRelayState>;

        if (
            typeof payload.callbackUrl !== 'string' ||
            typeof payload.state !== 'string' ||
            payload.state === ''
        ) {
            return undefined;
        }

        return {
            callbackUrl: payload.callbackUrl,
            state: payload.state,
        };
    } catch {
        return undefined;
    }
}

function getGitHubHeaders(token: string): Headers {
    return new Headers({
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
    });
}

function getGitHubToken(request: NextRequest): string | undefined {
    return request.cookies.get(githubTokenCookieName)?.value;
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

export function createGitHubStateCookieValue(request: NextRequest): string {
    const state = crypto.randomUUID();
    const redirectUri = getGitHubRedirectUri(request);

    if (
        !isLocalGitHubOAuthRequest(request) ||
        redirectUri === getLocalGitHubCallbackUri(request)
    ) {
        return state;
    }

    return encodeGitHubLocalRelayState({
        callbackUrl: getLocalGitHubCallbackUri(request),
        state,
    });
}

export function createGitHubAuthorizeUrl(
    request: NextRequest,
    state: string
): URL {
    const authorizeUrl = new URL('/login/oauth/authorize', githubOAuthOrigin);

    authorizeUrl.searchParams.set('client_id', getGitHubClientId(request));
    authorizeUrl.searchParams.set(
        'redirect_uri',
        getGitHubRedirectUri(request)
    );
    authorizeUrl.searchParams.set('scope', getGitHubOAuthScope());
    authorizeUrl.searchParams.set('state', state);

    return authorizeUrl;
}

export function getGitHubOAuthStateCookieName(): string {
    return githubOAuthStateCookieName;
}

export function getGitHubTokenCookieName(): string {
    return githubTokenCookieName;
}

export function getGitHubOAuthStateCookieMaxAge(): number {
    return githubOAuthStateCookieMaxAge;
}

export function getGitHubTokenCookieMaxAge(): number {
    return githubTokenCookieMaxAge;
}

export function getGitHubTokenFromRequest(
    request: NextRequest
): string | undefined {
    return getGitHubToken(request);
}

export function createGitHubLocalRelayRedirectUrl(
    request: NextRequest
): URL | undefined {
    const state = request.nextUrl.searchParams.get('state') ?? '';
    const relayState = decodeGitHubLocalRelayState(state);

    if (relayState === undefined) {
        return undefined;
    }

    let callbackUrl: URL;

    try {
        callbackUrl = new URL(relayState.callbackUrl);
    } catch {
        return undefined;
    }

    if (!isLoopbackUrl(callbackUrl)) {
        return undefined;
    }

    callbackUrl.hash = '';
    callbackUrl.search = '';

    for (const parameterName of [
        'code',
        'error',
        'error_description',
        'error_uri',
    ]) {
        const value = request.nextUrl.searchParams.get(parameterName);

        if (value !== null) {
            callbackUrl.searchParams.set(parameterName, value);
        }
    }

    callbackUrl.searchParams.set('state', state);

    return callbackUrl;
}

export async function exchangeGitHubCode(
    request: NextRequest,
    code: string
): Promise<string> {
    const response = await fetch(
        new URL('/login/oauth/access_token', githubOAuthOrigin),
        {
            body: new URLSearchParams({
                client_id: getGitHubClientId(request),
                client_secret: getGitHubClientSecret(request),
                code,
                redirect_uri: getGitHubRedirectUri(request),
            }),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            method: 'POST',
        }
    );

    const payload = (await response.json()) as {
        access_token?: string;
        error?: string;
        error_description?: string;
    };

    if (
        !response.ok ||
        typeof payload.access_token !== 'string' ||
        payload.access_token === ''
    ) {
        throw new Error(
            payload.error_description ?? payload.error ?? 'GitHub OAuth failed.'
        );
    }

    return payload.access_token;
}

export async function fetchGitHubJson<T>(
    path: string,
    token: string,
    init?: RequestInit
): Promise<T> {
    const response = await fetch(new URL(path, githubApiOrigin), {
        ...init,
        headers: getGitHubHeaders(token),
    });

    if (!response.ok) {
        throw new Error(`GitHub returned ${response.status}`);
    }

    return await (response.json() as Promise<T>);
}

export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
    return await fetchGitHubJson<GitHubUser>('/user', token);
}

export async function fetchAccessibleRepositories(
    token: string
): Promise<readonly Repository[]> {
    const repositoriesByName = new Map<string, Repository>();

    async function fetchRepositoryPages(page: number): Promise<
        ReadonlyArray<{
            readonly full_name?: string;
            readonly id: number;
            readonly pushed_at?: string;
            readonly stargazers_count?: number;
        }>
    > {
        const repositories = await fetchGitHubJson<
            ReadonlyArray<{
                readonly full_name?: string;
                readonly id: number;
                readonly pushed_at?: string;
                readonly stargazers_count?: number;
            }>
        >(
            `/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&page=${page}&sort=updated`,
            token
        );

        if (repositories.length < 100) {
            return repositories;
        }

        return [...repositories, ...(await fetchRepositoryPages(page + 1))];
    }

    const repositories = await fetchRepositoryPages(1);

    const rankedRepositories = repositories.toSorted((first, second) => {
        const firstStars = first.stargazers_count ?? 0;
        const secondStars = second.stargazers_count ?? 0;

        if (firstStars !== secondStars) {
            return secondStars - firstStars;
        }

        const firstPushedAt = first.pushed_at ?? '';
        const secondPushedAt = second.pushed_at ?? '';

        if (firstPushedAt !== secondPushedAt) {
            return secondPushedAt.localeCompare(firstPushedAt);
        }

        return (first.full_name ?? '').localeCompare(second.full_name ?? '');
    });

    for (const repository of rankedRepositories) {
        if (
            typeof repository.full_name === 'string' &&
            repository.full_name !== ''
        ) {
            repositoriesByName.set(repository.full_name, {
                fullName: repository.full_name,
                id: String(repository.id),
            });
        }
    }

    return [...repositoriesByName.values()];
}

export async function fetchWorkItems(
    repositories: readonly string[],
    token: string
): Promise<readonly WorkItem[]> {
    const requests = repositories.map(async (repository) => {
        const issues = await fetchGitHubJson<GitHubIssue[]>(
            `/repos/${repository}/issues?state=open&per_page=30`,
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
                commentsCount: issue.comments,
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

export async function assignToCodex(
    token: string,
    item: Readonly<Pick<WorkItem, 'number' | 'repo'>>,
    prompt: string
): Promise<void> {
    const commentResponse = await fetch(
        new URL(
            `/repos/${item.repo}/issues/${item.number}/comments`,
            githubApiOrigin
        ),
        {
            body: JSON.stringify({
                body: `## Codex prompt\n\n${prompt.trim()}`,
            }),
            headers: getGitHubHeaders(token),
            method: 'POST',
        }
    );

    if (!commentResponse.ok) {
        throw new Error(`GitHub comment failed with ${commentResponse.status}`);
    }

    const labelResponse = await fetch(
        new URL(
            `/repos/${item.repo}/issues/${item.number}/labels`,
            githubApiOrigin
        ),
        {
            body: JSON.stringify({ labels: ['codex-ready'] }),
            headers: getGitHubHeaders(token),
            method: 'POST',
        }
    );

    if (!labelResponse.ok) {
        throw new Error(`GitHub label failed with ${labelResponse.status}`);
    }
}
