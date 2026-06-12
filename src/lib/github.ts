import type { GitHubUser, Repository, WorkItem } from '../types/app';

interface GitHubSessionResponse {
    authenticated: boolean;
    user?: GitHubUser;
}

async function parseError(response: Response): Promise<string> {
    try {
        const payload = (await response.json()) as { error?: string };

        if (typeof payload.error === 'string' && payload.error !== '') {
            return payload.error;
        }
    } catch {
        return `Request failed with ${response.status}`;
    }

    return `Request failed with ${response.status}`;
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
    const response = await fetch(input, init);

    if (!response.ok) {
        throw new Error(await parseError(response));
    }

    return await (response.json() as Promise<T>);
}

export async function fetchGitHubSession(): Promise<GitHubUser | undefined> {
    const session = await fetchJson<GitHubSessionResponse>(
        '/api/github/session'
    );

    if (!session.authenticated) {
        return undefined;
    }

    return session.user;
}

export async function fetchAccessibleRepositories(): Promise<
    readonly Repository[]
> {
    return await fetchJson<readonly Repository[]>('/api/github/repositories');
}

export async function fetchWorkItems(
    repositories: ReadonlyArray<Readonly<Repository>>
): Promise<readonly WorkItem[]> {
    const searchParams = new URLSearchParams();

    for (const repository of repositories) {
        searchParams.append('repo', repository.fullName);
    }

    return await fetchJson<readonly WorkItem[]>(
        `/api/github/work-items?${searchParams.toString()}`
    );
}

export async function assignToCodex(
    item: Readonly<WorkItem>,
    prompt: string
): Promise<void> {
    const response = await fetch('/api/github/assign', {
        body: JSON.stringify({
            number: item.number,
            prompt,
            repo: item.repo,
        }),
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
    });

    if (!response.ok) {
        throw new Error(await parseError(response));
    }
}
