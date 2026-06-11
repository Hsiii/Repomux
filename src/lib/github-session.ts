const githubTokenKey = 'repomux.githubToken';
const githubOAuthStateKey = 'repomux.githubOAuthState';

function sessionStorageOrUndefined(): Storage | undefined {
    try {
        return globalThis.sessionStorage;
    } catch {
        return undefined;
    }
}

export function getStoredGitHubToken(): string {
    return sessionStorageOrUndefined()?.getItem(githubTokenKey) ?? '';
}

export function setStoredGitHubToken(token: string): void {
    sessionStorageOrUndefined()?.setItem(githubTokenKey, token);
}

export function clearStoredGitHubToken(): void {
    sessionStorageOrUndefined()?.removeItem(githubTokenKey);
}

export function getStoredGitHubOAuthState(): string | undefined {
    return (
        sessionStorageOrUndefined()?.getItem(githubOAuthStateKey) ?? undefined
    );
}

export function setStoredGitHubOAuthState(state: string): void {
    sessionStorageOrUndefined()?.setItem(githubOAuthStateKey, state);
}

export function clearStoredGitHubOAuthState(): void {
    sessionStorageOrUndefined()?.removeItem(githubOAuthStateKey);
}
