const configuredGitHubOAuthScope = import.meta.env.VITE_GITHUB_OAUTH_SCOPE as
    | string
    | undefined;
const configuredGitHubOAuthRedirectUrl = import.meta.env
    .VITE_GITHUB_OAUTH_REDIRECT_URL as string | undefined;

function isLoopbackHostname(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

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

    if (!isLoopbackHostname(globalThis.location.hostname)) {
        return undefined;
    }

    return redirectUrl;
}
