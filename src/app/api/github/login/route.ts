import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
    createGitHubAuthorizeUrl,
    createGitHubStateCookieValue,
    getGitHubOAuthStateCookieMaxAge,
    getGitHubOAuthStateCookieName,
} from '../../../../lib/server/github';

export function GET(request: NextRequest): NextResponse {
    const state = createGitHubStateCookieValue();
    const response = NextResponse.redirect(
        createGitHubAuthorizeUrl(request, state)
    );

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
