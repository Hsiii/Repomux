const configuredGitHubOAuthScope = import.meta.env.VITE_GITHUB_OAUTH_SCOPE as
    | string
    | undefined;
const configuredGitHubOAuthRedirectUrl = import.meta.env
    .VITE_GITHUB_OAUTH_REDIRECT_URL as string | undefined;

export function getGitHubOAuthScope(): string {
    const scope = configuredGitHubOAuthScope?.trim();

    if (scope === undefined || scope === '') {
        return 'repo';
    }

    return scope;
}

export function getGitHubOAuthRedirectUrl(): string | undefined {
    const redirectUrl = configuredGitHubOAuthRedirectUrl?.trim();

    if (redirectUrl === undefined || redirectUrl === '') {
        return undefined;
    }

    return redirectUrl;
}
