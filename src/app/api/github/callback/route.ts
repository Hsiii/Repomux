import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
    exchangeGitHubCode,
    getGitHubOAuthStateCookieName,
    getGitHubTokenCookieMaxAge,
    getGitHubTokenCookieName,
} from '../../../../lib/server/github';

function createErrorRedirect(
    request: NextRequest,
    error: string
): NextResponse {
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const state = request.nextUrl.searchParams.get('state') ?? '';
    const code = request.nextUrl.searchParams.get('code') ?? '';
    const storedState =
        request.cookies.get(getGitHubOAuthStateCookieName())?.value ?? '';

    if (state === '' || storedState === '' || state !== storedState) {
        const response = createErrorRedirect(request, 'github_oauth_state');

        response.cookies.delete(getGitHubOAuthStateCookieName());
        return response;
    }

    if (code === '') {
        const response = createErrorRedirect(request, 'github_oauth_code');

        response.cookies.delete(getGitHubOAuthStateCookieName());
        return response;
    }

    try {
        const token = await exchangeGitHubCode(request, code);
        const response = NextResponse.redirect(new URL('/', request.url));

        response.cookies.delete(getGitHubOAuthStateCookieName());
        response.cookies.set({
            httpOnly: true,
            maxAge: getGitHubTokenCookieMaxAge(),
            name: getGitHubTokenCookieName(),
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            value: token,
        });

        return response;
    } catch {
        const response = createErrorRedirect(request, 'github_oauth_exchange');

        response.cookies.delete(getGitHubOAuthStateCookieName());
        response.cookies.delete(getGitHubTokenCookieName());
        return response;
    }
}
