import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
    fetchGitHubUser,
    getGitHubTokenCookieName,
    getGitHubTokenFromRequest,
} from '../../../../lib/server/github';

export async function GET(request: NextRequest): Promise<NextResponse> {
    const token = getGitHubTokenFromRequest(request);

    if (token === undefined || token === '') {
        return NextResponse.json({ authenticated: false });
    }

    try {
        const user = await fetchGitHubUser(token);

        return NextResponse.json({
            authenticated: true,
            user,
        });
    } catch {
        const response = NextResponse.json({ authenticated: false });

        response.cookies.delete(getGitHubTokenCookieName());
        return response;
    }
}
