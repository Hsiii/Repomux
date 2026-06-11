const configuredGitHubOAuthScope = import.meta.env.VITE_GITHUB_OAUTH_SCOPE as
    | string
    | undefined;

export function getGitHubOAuthScope(): string {
    const scope = configuredGitHubOAuthScope?.trim();

    if (scope === undefined || scope === '') {
        return 'repo';
    }

    return scope;
}
