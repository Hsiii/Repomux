import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
    fetchAccessibleRepositories,
    getGitHubTokenFromRequest,
} from '../../../../lib/server/github';

export async function GET(request: NextRequest): Promise<NextResponse> {
    const token = getGitHubTokenFromRequest(request);

    if (token === undefined || token === '') {
        return NextResponse.json(
            { error: 'GitHub connection required.' },
            { status: 401 }
        );
    }

    try {
        const repositories = await fetchAccessibleRepositories(token);

        return NextResponse.json(repositories);
    } catch (error: unknown) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unable to load repositories.',
            },
            { status: 500 }
        );
    }
}
