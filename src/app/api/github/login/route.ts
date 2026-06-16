import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
    createGitHubAuthorizeUrl,
    createGitHubStateCookieValue,
    getGitHubOAuthStateCookieMaxAge,
    getGitHubOAuthStateCookieName,
} from '../../../../lib/server/github';

export function GET(request: NextRequest): NextResponse {
    const state = createGitHubStateCookieValue(request);
    let response: NextResponse;

    try {
        response = NextResponse.redirect(
            createGitHubAuthorizeUrl(request, state)
        );
    } catch {
        return NextResponse.redirect(
            new URL('/?error=github_oauth_config', request.url)
        );
    }

    response.cookies.set({
        httpOnly: true,
        maxAge: getGitHubOAuthStateCookieMaxAge(),
        name: getGitHubOAuthStateCookieName(),
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        value: state,
    });

    return response;
}
