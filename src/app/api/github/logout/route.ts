import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getGitHubTokenCookieName } from '../../../../lib/server/github';
import { assertSameOriginRequest } from '../../../../lib/server/security';

export function POST(request: NextRequest): NextResponse {
    const forbiddenResponse = assertSameOriginRequest(request);

    if (forbiddenResponse !== undefined) {
        return forbiddenResponse;
    }

    const response = NextResponse.json({ success: true });

    response.cookies.delete(getGitHubTokenCookieName());

    return response;
}
