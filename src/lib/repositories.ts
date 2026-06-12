const activeRepositoriesKey = 'repomux.activeRepositories';

function localStorageOrUndefined(): Storage | undefined {
    try {
        return globalThis.localStorage;
    } catch {
        return undefined;
    }
}

export function getStoredActiveRepositories(): readonly string[] | undefined {
    const storedValue =
        localStorageOrUndefined()?.getItem(activeRepositoriesKey) ?? undefined;

    if (storedValue === undefined) {
        return undefined;
    }

    return storedValue
        .split('\n')
        .filter((repositoryName) => repositoryName !== '');
}

export function setStoredActiveRepositories(
    repositoryNames: readonly string[]
): void {
    localStorageOrUndefined()?.setItem(
        activeRepositoriesKey,
        repositoryNames.join('\n')
    );
}

export function normalizeRepository(input: string): string {
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
