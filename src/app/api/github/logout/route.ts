import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getGitHubTokenCookieName } from '../../../../lib/server/github';

export function POST(_request: NextRequest): NextResponse {
    const response = NextResponse.json({ success: true });

    response.cookies.delete(getGitHubTokenCookieName());

    return response;
}
