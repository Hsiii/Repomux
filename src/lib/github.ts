import type {
    GitHubIssue,
    GitHubUser,
    Repository,
    WorkItem,
} from '../types/app';
import { getStoredGitHubToken, setStoredGitHubToken } from './github-session';

export function getOAuthRedirectUri(): string {
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

export async function fetchJson<T>(url: string, token: string): Promise<T> {
    const response = await fetch(url, { headers: headers(token) });

    if (!response.ok) {
        throw new Error(`GitHub returned ${response.status}`);
    }

    return await (response.json() as Promise<T>);
}

export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
    return await fetchJson<GitHubUser>('https://api.github.com/user', token);
}

export async function fetchAccessibleRepositories(
    token: string
): Promise<readonly Repository[]> {
    if (token.trim() === '') {
        throw new Error('GitHub token is required to load repositories.');
    }

    const repositoriesByName = new Map<string, Repository>();
    const trimmedToken = token.trim();
    async function fetchRepositoryPages(page: number): Promise<
        ReadonlyArray<{
            readonly full_name?: string;
            readonly id: number;
            readonly pushed_at?: string;
            readonly stargazers_count?: number;
        }>
    > {
        const repositories = await fetchJson<
            ReadonlyArray<{
                full_name?: string;
                id: number;
                pushed_at?: string;
                stargazers_count?: number;
            }>
        >(
            `https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&page=${page}&sort=updated`,
            trimmedToken
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

export async function assignToCodex(
    item: Readonly<WorkItem>,
    prompt: string,
    token: string
): Promise<void> {
    if (token.trim() === '') {
        throw new Error('GitHub token is required to assign work.');
    }

    setStoredGitHubToken(token.trim());

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
